const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware (must be before routes)
// Note: Don't use bodyParser for multipart/form-data (multer handles that)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(__dirname));

// Session configuration
app.use(session({
    secret: 'know-law-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Database initialization
let db;
try {
    db = new sqlite3.Database('./database.sqlite', (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            console.error('Database initialization failed. Some features may not work.');
        } else {
            console.log('Connected to SQLite database.');
            initializeDatabase();
        }
    });
} catch (error) {
    console.error('Failed to initialize database:', error.message);
    // Database will be undefined, errors will be handled in dbQuery/dbRun
}

// Initialize database tables
function initializeDatabase() {
    if (!db || typeof db.serialize !== 'function') {
        console.error('Database not available for initialization');
        return;
    }
    try {
        db.serialize(() => {
            // Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                } else {
                    console.log('Users table ready.');
                }
            });

            // Conversations table
            db.run(`CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                title TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating conversations table:', err.message);
                } else {
                    console.log('Conversations table ready.');
                }
            });

            // Messages table
            db.run(`CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                file_info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )`, (err) => {
                if (err) {
                    console.error('Error creating messages table:', err.message);
                } else {
                    console.log('Messages table ready.');
                }
            });

            // Bookings table
            db.run(`CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                lawyer_id INTEGER NOT NULL,
                lawyer_name TEXT NOT NULL,
                lawyer_specialty TEXT NOT NULL,
                client_name TEXT NOT NULL,
                client_email TEXT NOT NULL,
                client_phone TEXT NOT NULL,
                appointment_date DATE NOT NULL,
                appointment_time TEXT NOT NULL,
                case_description TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating bookings table:', err.message);
                } else {
                    console.log('Bookings table ready.');
                }
            });

            // Create index for faster queries
            db.run(`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`, (err) => {
                if (err) {
                    console.error('Error creating index:', err.message);
                }
            });

            db.run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`, (err) => {
                if (err) {
                    console.error('Error creating index:', err.message);
                }
            });
        });
    } catch (error) {
        console.error('Error initializing database:', error.message);
    }
}

// Helper function to query database (promise-based)
function dbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db || typeof db.all !== 'function') {
            return reject(new Error('Database not available'));
        }
        try {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database query error:', err.message, 'SQL:', sql);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        } catch (error) {
            console.error('Database query exception:', error.message);
            reject(error);
        }
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (!db || typeof db.run !== 'function') {
            return reject(new Error('Database not available'));
        }
        try {
            db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database run error:', err.message, 'SQL:', sql);
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        } catch (error) {
            console.error('Database run exception:', error.message);
            reject(error);
        }
    });
}

// API Routes

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUsers = await dbQuery('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user into database
        const result = await dbRun(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // Create session
        req.session.userId = result.lastID;
        req.session.userEmail = email;
        req.session.userName = name;

        res.json({
            success: true,
            message: 'Registration successful',
            user: {
                id: result.lastID,
                name: name,
                email: email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        const statusCode = error.message && error.message.includes('UNIQUE constraint') ? 400 : 500;
        res.status(statusCode).json({ 
            success: false, 
            message: statusCode === 400 ? 'Email already registered' : 'Server error during registration: ' + errorMessage 
        });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Find user
        const users = await dbQuery('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // Create session
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.name;

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login: ' + errorMessage 
        });
    }
});

// Check session endpoint
app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            success: true,
            user: {
                id: req.session.userId,
                email: req.session.userEmail,
                name: req.session.userName,
                isGuest: req.session.isGuest || req.session.userId === 'guest'
            }
        });
    } else {
        // Return guest access option
        res.json({
            success: false,
            message: 'Not authenticated',
            allowGuest: true
        });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error logging out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Guest session endpoint
app.post('/api/guest', (req, res) => {
    // Create a guest session
    req.session.userId = 'guest';
    req.session.userEmail = 'guest@knowlaw.com';
    req.session.userName = 'Guest User';
    req.session.isGuest = true;

    res.json({
        success: true,
        message: 'Guest session created',
        user: {
            id: 'guest',
            name: 'Guest User',
            email: 'guest@knowlaw.com',
            isGuest: true
        }
    });
});

// Get user dashboard data
app.get('/api/dashboard', async (req, res) => {
    try {
        // Allow guest access
        if (!req.session.userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        // Handle guest user
        if (req.session.isGuest || req.session.userId === 'guest') {
            const totalUsers = await dbQuery('SELECT COUNT(*) as count FROM users');
            
            return res.json({
                success: true,
                user: {
                    id: 'guest',
                    name: 'Guest User',
                    email: 'guest@knowlaw.com',
                    createdAt: new Date().toISOString(),
                    isGuest: true
                },
                stats: {
                    totalUsers: totalUsers[0].count,
                    daysActive: 0
                }
            });
        }

        // Handle authenticated user
        const users = await dbQuery('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];

        // Get user stats
        const totalUsers = await dbQuery('SELECT COUNT(*) as count FROM users');
        
        // Calculate days since account creation
        const createdDate = new Date(user.created_at);
        const now = new Date();
        const daysActive = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.created_at
            },
            stats: {
                totalUsers: totalUsers[0].count,
                daysActive: daysActive
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + errorMessage 
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.get('/dashboard.html', (req, res) => {
    // Allow access to dashboard even without authentication (for guest users)
    // The dashboard will handle guest mode in the frontend
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/chat.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

app.get('/booking.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'booking.html'));
});

// Get all conversations for the current user
app.get('/api/chats', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const userId = req.session.userId.toString();
        const conversations = await dbQuery(
            'SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
            [userId]
        );

        res.json({
            success: true,
            conversations: conversations
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching conversations: ' + (error.message || 'Unknown error') 
        });
    }
});

// Get messages for a specific conversation
app.get('/api/chats/:chatId', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const chatId = parseInt(req.params.chatId);
        const userId = req.session.userId.toString();

        // Verify conversation belongs to user
        const conversations = await dbQuery(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [chatId, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Conversation not found' 
            });
        }

        // Get all messages for this conversation
        const messages = await dbQuery(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
            [chatId]
        );

        res.json({
            success: true,
            conversation: conversations[0],
            messages: messages
        });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching conversation: ' + (error.message || 'Unknown error') 
        });
    }
});

// Update a message
app.put('/api/chats/:chatId/messages/:messageId', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const chatId = parseInt(req.params.chatId);
        const messageId = parseInt(req.params.messageId);
        const userId = req.session.userId.toString();
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Content is required' 
            });
        }

        // Verify conversation belongs to user
        const conversations = await dbQuery(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [chatId, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Conversation not found' 
            });
        }

        // Verify message belongs to conversation and is a user message (only user messages can be edited)
        const messages = await dbQuery(
            'SELECT * FROM messages WHERE id = ? AND conversation_id = ? AND role = ?',
            [messageId, chatId, 'user']
        );

        if (messages.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Message not found or cannot be edited' 
            });
        }

        // Update message
        await dbRun(
            'UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [content.trim(), messageId]
        );

        // Update conversation timestamp
        await dbRun(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [chatId]
        );

        res.json({
            success: true,
            message: 'Message updated successfully'
        });
    } catch (error) {
        console.error('Update message error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating message: ' + (error.message || 'Unknown error') 
        });
    }
});

// Delete a message
app.delete('/api/chats/:chatId/messages/:messageId', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const chatId = parseInt(req.params.chatId);
        const messageId = parseInt(req.params.messageId);
        const userId = req.session.userId.toString();

        // Verify conversation belongs to user
        const conversations = await dbQuery(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [chatId, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Conversation not found' 
            });
        }

        // Verify message belongs to conversation
        const messages = await dbQuery(
            'SELECT * FROM messages WHERE id = ? AND conversation_id = ?',
            [messageId, chatId]
        );

        if (messages.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Message not found' 
            });
        }

        // Delete message
        await dbRun('DELETE FROM messages WHERE id = ?', [messageId]);

        // Update conversation timestamp
        await dbRun(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [chatId]
        );

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting message: ' + (error.message || 'Unknown error') 
        });
    }
});

// Create a new conversation
app.post('/api/chats', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const userId = req.session.userId.toString();
        const { title } = req.body;

        const result = await dbRun(
            'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
            [userId, title || 'New Chat']
        );

        res.json({
            success: true,
            conversation: {
                id: result.lastID,
                user_id: userId,
                title: title || 'New Chat',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creating conversation: ' + (error.message || 'Unknown error') 
        });
    }
});

// Update (rename) a conversation
app.put('/api/chats/:chatId', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const chatId = parseInt(req.params.chatId);
        const userId = req.session.userId.toString();
        const { title } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Title is required' 
            });
        }

        // Verify conversation belongs to user
        const conversations = await dbQuery(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [chatId, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Conversation not found' 
            });
        }

        // Update conversation title
        await dbRun(
            'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [title.trim(), chatId]
        );

        res.json({
            success: true,
            message: 'Conversation updated successfully'
        });
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating conversation: ' + (error.message || 'Unknown error') 
        });
    }
});

// Delete a conversation
app.delete('/api/chats/:chatId', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const chatId = parseInt(req.params.chatId);
        const userId = req.session.userId.toString();

        // Verify conversation belongs to user
        const conversations = await dbQuery(
            'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
            [chatId, userId]
        );

        if (conversations.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Conversation not found' 
            });
        }

        // Delete conversation (messages will be deleted automatically due to CASCADE)
        await dbRun('DELETE FROM conversations WHERE id = ?', [chatId]);

        res.json({
            success: true,
            message: 'Conversation deleted successfully'
        });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting conversation: ' + (error.message || 'Unknown error') 
        });
    }
});

// Book a lawyer appointment
app.post('/api/booking', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const { lawyerId, clientName, clientEmail, clientPhone, appointmentDate, appointmentTime, caseDescription } = req.body;

        // Validation
        if (!lawyerId || !clientName || !clientEmail || !clientPhone || !appointmentDate || !appointmentTime || !caseDescription) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Validate date (must be in the future)
        const selectedDate = new Date(appointmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            return res.status(400).json({ 
                success: false, 
                message: 'Appointment date must be in the future' 
            });
        }

        // Lawyer data (in a real app, this would come from a database)
        const lawyers = {
            1: { name: 'Sarah Johnson', specialty: 'Criminal Law' },
            2: { name: 'Michael Chen', specialty: 'Family Law' },
            3: { name: 'Emily Rodriguez', specialty: 'Corporate Law' },
            4: { name: 'David Thompson', specialty: 'Personal Injury' },
            5: { name: 'Jennifer Williams', specialty: 'Real Estate Law' },
            6: { name: 'Robert Martinez', specialty: 'Immigration Law' },
            7: { name: 'Lisa Anderson', specialty: 'Employment Law' },
            8: { name: 'James Wilson', specialty: 'Intellectual Property' },
            9: { name: 'Amanda Taylor', specialty: 'Estate Planning' },
            10: { name: 'Christopher Brown', specialty: 'Tax Law' },
            11: { name: 'Maria Garcia', specialty: 'Bankruptcy Law' },
            12: { name: 'Daniel Lee', specialty: 'Environmental Law' }
        };

        const lawyer = lawyers[lawyerId];
        if (!lawyer) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid lawyer selected' 
            });
        }

        const userId = req.session.userId.toString();

        // Save booking to database
        const result = await dbRun(
            `INSERT INTO bookings (
                user_id, lawyer_id, lawyer_name, lawyer_specialty,
                client_name, client_email, client_phone,
                appointment_date, appointment_time, case_description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, lawyerId, lawyer.name, lawyer.specialty, clientName, clientEmail, clientPhone, appointmentDate, appointmentTime, caseDescription]
        );

        res.json({
            success: true,
            message: 'Appointment booked successfully',
            booking: {
                id: result.lastID,
                lawyerName: lawyer.name,
                appointmentDate: appointmentDate,
                appointmentTime: appointmentTime
            }
        });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error booking appointment: ' + (error.message || 'Unknown error') 
        });
    }
});

// Get user bookings
app.get('/api/bookings', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const userId = req.session.userId.toString();
        const userBookings = await dbQuery(
            'SELECT * FROM bookings WHERE user_id = ? ORDER BY appointment_date DESC, appointment_time DESC',
            [userId]
        );

        res.json({
            success: true,
            bookings: userBookings
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching bookings: ' + (error.message || 'Unknown error') 
        });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Maximum 10 files
    },
    fileFilter: function (req, file, cb) {
        try {
            const allowedTypes = /pdf|doc|docx|txt|jpg|jpeg|png/i;
            const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
            const mimetype = file.mimetype.toLowerCase();
            
            // Check extension
            const hasValidExtension = allowedTypes.test(extname);
            
            // Check mimetype (more lenient)
            const hasValidMimetype = 
                mimetype.includes('pdf') ||
                mimetype.includes('msword') ||
                mimetype.includes('wordprocessingml') ||
                mimetype.includes('text/plain') ||
                mimetype.includes('image/jpeg') ||
                mimetype.includes('image/jpg') ||
                mimetype.includes('image/png');
            
            if (hasValidExtension || hasValidMimetype) {
                cb(null, true);
            } else {
                cb(new Error(`File type not allowed. Only PDF, DOC, DOCX, TXT, JPG, JPEG, and PNG files are allowed. Received: ${file.originalname} (${mimetype})`));
            }
        } catch (err) {
            cb(new Error('Error validating file: ' + err.message));
        }
    }
});

// AI Chat endpoint with proper error handling
app.post('/api/chat', (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            // Handle multer errors
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'File size too large. Maximum size is 10MB per file.' 
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Too many files. Maximum 10 files allowed.' 
                    });
                }
                return res.status(400).json({ 
                    success: false, 
                    message: 'File upload error: ' + err.message 
                });
            }
            // Handle file filter errors
            if (err.message) {
                return res.status(400).json({ 
                    success: false, 
                    message: err.message 
                });
            }
            return next(err);
        }
        next();
    });
}, async (req, res) => {
    try {
        // Check authentication
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        const message = req.body.message || '';
        const files = req.files || [];
        const conversationId = req.body.conversationId ? parseInt(req.body.conversationId) : null;

        // If no message and no files, return error
        if (!message.trim() && files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Message or file is required' 
            });
        }

        // Get or create conversation
        let currentConversationId = conversationId;
        if (!currentConversationId) {
            // Create new conversation
            const userId = req.session.userId.toString();
            const title = message.substring(0, 50) || 'New Chat';
            const result = await dbRun(
                'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
                [userId, title]
            );
            currentConversationId = result.lastID;
        } else {
            // Verify conversation belongs to user
            const userId = req.session.userId.toString();
            const conversations = await dbQuery(
                'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
                [currentConversationId, userId]
            );
            if (conversations.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Conversation not found or access denied' 
                });
            }
        }

        // Process files if any
        let fileInfo = '';
        let fileInfoJson = null;
        if (files.length > 0) {
            const fileNames = files.map(f => f.originalname).join(', ');
            fileInfo = `\n\n[User uploaded ${files.length} file(s): ${fileNames}]`;
            fileInfoJson = JSON.stringify(files.map(f => ({
                name: f.originalname,
                size: f.size,
                mimetype: f.mimetype
            })));
        }

        // Save user message to database
        const userMessageContent = message + fileInfo;
        await dbRun(
            'INSERT INTO messages (conversation_id, role, content, file_info) VALUES (?, ?, ?, ?)',
            [currentConversationId, 'user', userMessageContent, fileInfoJson]
        );

        // Update conversation timestamp
        await dbRun(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [currentConversationId]
        );

        // AI Legal Assistant Response Logic
        const userQuery = message + fileInfo;
        const aiResponse = generateAIResponse(userQuery, files);

        // Save AI response to database
        await dbRun(
            'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
            [currentConversationId, 'ai', aiResponse]
        );

        // Update conversation timestamp again
        await dbRun(
            'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [currentConversationId]
        );

        // Clean up uploaded files after processing
        if (files && files.length > 0) {
            files.forEach(file => {
                try {
                    if (file.path && fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            });
        }

        // Simulate AI thinking time (optional - remove for faster responses)
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

        res.json({
            success: true,
            response: aiResponse,
            conversationId: currentConversationId
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error processing chat request: ' + (error.message || 'Unknown error') 
        });
    }
});

// AI Response Generator (Legal Assistant)
function generateAIResponse(userMessage, files = []) {
    const message = userMessage.toLowerCase().trim();
    
    // Handle file uploads
    if (files.length > 0) {
        const fileNames = files.map(f => f.originalname).join(', ');
        return `Thank you for uploading ${files.length} file(s): ${fileNames}. I've received your documents. 

While I can provide general legal information, I recommend reviewing the documents with a qualified attorney for specific legal advice. 

Could you tell me what specific legal question you have about these documents? For example:
- Do you need help understanding a contract?
- Are you looking for clarification on legal terms?
- Do you need help identifying potential legal issues?

Please describe what you'd like me to help you with regarding these files.`;
    }
    
    // Legal knowledge base - responses to common legal questions
    const responses = {
        // Tenant rights
        'tenant': 'As a tenant, you have several important rights including the right to habitable living conditions, privacy, protection from unlawful eviction, and the right to have your security deposit returned under certain conditions. Landlords must provide proper notice before entering your rental unit and cannot discriminate based on protected characteristics.',
        
        'rent': 'Your rights as a tenant regarding rent include the right to receive proper notice before rent increases, protection from retaliatory eviction if you report code violations, and the right to withhold rent in some jurisdictions if the landlord fails to make necessary repairs. Always check your local tenant laws as they vary by location.',
        
        // Filing complaints
        'complaint': 'To file a legal complaint, you typically need to: 1) Identify the appropriate court or agency, 2) Prepare a written complaint detailing the facts, 3) File the complaint with the court clerk, 4) Pay any required filing fees, and 5) Serve the complaint to the defendant. Consider consulting with an attorney for complex matters.',
        
        'sue': 'Before filing a lawsuit, consider: 1) Whether you have a valid legal claim, 2) The statute of limitations in your jurisdiction, 3) Whether mediation or negotiation could resolve the issue, 4) The costs involved, and 5) Whether you can prove your case. Small claims court may be an option for disputes under a certain dollar amount.',
        
        // Legal system basics
        'civil': 'Civil law deals with disputes between individuals or organizations, typically involving compensation for harm. Examples include contract disputes, personal injury claims, and property disputes. Criminal law involves the government prosecuting individuals for actions that harm society, such as theft or assault.',
        
        'criminal': 'Criminal law involves actions that are considered harmful to society as a whole. The government (prosecutor) brings charges against individuals, and penalties can include fines, probation, or imprisonment. Defendants have the right to an attorney, the right to remain silent, and the right to a trial by jury.',
        
        // Contracts
        'contract': 'A contract is a legally binding agreement between two or more parties. For a contract to be valid, it typically requires: 1) Offer and acceptance, 2) Consideration (something of value exchanged), 3) Legal capacity of parties, 4) Legality of purpose, and 5) Mutual assent. Written contracts are generally easier to enforce than verbal agreements.',
        
        'agreement': 'Legal agreements can be written or verbal, though written agreements are strongly recommended. Key elements include clear terms, mutual consent, and consideration. Always read contracts carefully before signing and consider having an attorney review important agreements.',
        
        // General legal advice
        'rights': 'Your legal rights depend on your specific situation and jurisdiction. Common rights include the right to due process, freedom from discrimination, privacy rights, property rights, and contractual rights. For specific questions about your rights, it\'s best to consult with a qualified attorney in your area.',
        
        'lawyer': 'You may need a lawyer if you\'re: facing criminal charges, involved in a lawsuit, dealing with complex business transactions, going through a divorce, drafting important documents, or if your legal rights have been violated. Many attorneys offer free consultations to discuss your case.',
        
        'legal': 'Legal matters can be complex and vary by jurisdiction. While I can provide general information, specific legal advice should come from a licensed attorney familiar with your local laws and circumstances. For urgent legal matters, contact a legal aid organization or attorney immediately.',
    };

    // Check for keywords and provide relevant responses
    for (const [keyword, response] of Object.entries(responses)) {
        if (message.includes(keyword)) {
            return response;
        }
    }

    // Default intelligent response
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
        return 'Hello! I\'m your AI Legal Assistant. I\'m here to help you understand legal concepts and answer questions about your rights. What legal question can I help you with today?';
    }

    if (message.includes('thank')) {
        return 'You\'re welcome! If you have any other legal questions, feel free to ask. Remember, for specific legal advice, it\'s always best to consult with a qualified attorney in your jurisdiction.';
    }

    if (message.includes('help')) {
        return 'I can help you with questions about: tenant rights, contracts, filing complaints, understanding the legal system, your legal rights, and general legal concepts. What would you like to know?';
    }

    // General response for unrecognized queries
    return 'I understand you\'re asking about legal matters. While I can provide general information, I\'d recommend being more specific about your question. For example, you could ask about tenant rights, contracts, filing complaints, or understanding the difference between civil and criminal law. For specific legal advice tailored to your situation, please consult with a qualified attorney in your jurisdiction.';
}

// Error handling middleware (must be last, after all routes)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Don't send response if headers already sent
    if (res.headersSent) {
        return next(err);
    }
    
    // Handle multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                message: 'File size too large. Maximum size is 10MB.' 
            });
        }
        return res.status(400).json({ 
            success: false, 
            message: 'File upload error: ' + err.message 
        });
    }
    
    // Handle other file upload errors
    if (err.message && (err.message.includes('file') || err.message.includes('upload') || err.message.includes('Only PDF'))) {
        return res.status(400).json({ 
            success: false, 
            message: err.message 
        });
    }
    
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error: ' + (err.message || 'Unknown error') 
    });
});

// Start server
const server = http.createServer(app);
server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`✅ Server is running successfully!`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`📡 Server is listening on all network interfaces`);
    console.log('='.repeat(50));
    console.log('\n📝 Available endpoints:');
    console.log(`   - Home: http://localhost:${PORT}/`);
    console.log(`   - Auth: http://localhost:${PORT}/auth.html`);
    console.log(`   - Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`   - Chat: http://localhost:${PORT}/chat.html`);
    console.log(`   - Booking: http://localhost:${PORT}/booking.html`);
    console.log('\n⚡ Server is ready to accept connections!\n');
}).on('error', (err) => {
    console.error('\n❌ Server startup error:');
    if (err.code === 'EADDRINUSE') {
        console.error(`   Port ${PORT} is already in use.`);
        console.error(`   Please stop the other server or use a different port.`);
        console.error(`   To use a different port, set PORT environment variable:`);
        console.error(`   Example: set PORT=3001 && npm start`);
    } else {
        console.error(`   Error: ${err.message}`);
        console.error(`   Code: ${err.code}`);
    }
    console.error('\n');
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    if (db && typeof db.close === 'function') {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed.');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});
