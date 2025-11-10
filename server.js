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
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
});

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

        // Get conversation history for context (before saving new message)
        let conversationHistory = [];
        if (currentConversationId) {
            const previousMessages = await dbQuery(
                'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 10',
                [currentConversationId]
            );
            conversationHistory = previousMessages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
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
        
        // Generate AI response using ChatGPT API
        const aiResponse = await generateAIResponse(userQuery, files, conversationHistory);

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

        // Remove simulated delay since API call already takes time

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

// Language detection function
function detectLanguage(text) {
    // Check for Arabic characters (Unicode range: \u0600-\u06FF)
    const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return arabicPattern.test(text) ? 'ar' : 'en';
}

// AI Response Generator (Legal Assistant) - Bilingual Support with ChatGPT API
async function generateAIResponse(userMessage, files = [], conversationHistory = []) {
    const detectedLang = detectLanguage(userMessage);
    
    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your-api-key-here') {
        console.warn('⚠️ OpenAI API key not configured. Using fallback responses.');
        console.warn('💡 To enable ChatGPT, set OPENAI_API_KEY environment variable.');
        return generateFallbackResponse(userMessage, files, detectedLang);
    }
    
    try {
        // Build system prompt focused on Egyptian law
        const systemPrompt = `You are an expert AI legal assistant specialized in Egyptian law and the Egyptian Constitution of 2014. Your expertise includes:

EGYPTIAN LEGAL SYSTEM:
- Egyptian Constitution 2014 (supreme law of Egypt)
- Egyptian Civil Code (Law 131/1948) - contracts, property, torts, obligations
- Egyptian Criminal Code (Law 58/1937) - felonies (جنايات), misdemeanors (جنح), violations (مخالفات)
- Egyptian Rent Law - Law No. 4 of 1996 (Old Rent) and Law No. 199 of 2021 (New Rent)
- Egyptian Commercial Code
- Egyptian Labor Law
- Egyptian Personal Status Law
- Egyptian court system: Constitutional Court, Court of Cassation, Courts of Appeal, Primary Courts

IMPORTANT GUIDELINES:
- Always respond in the SAME LANGUAGE as the user's question (English or Arabic)
- Focus exclusively on Egyptian law and legal system
- Provide accurate, detailed, and comprehensive information about Egyptian legal matters
- Answer questions directly and helpfully - do not give generic responses asking for more specificity
- Provide detailed explanations with examples when relevant
- Always emphasize that specific legal advice should come from a licensed Egyptian attorney registered with the Egyptian Bar Association (نقابة المحامين)
- Be helpful, professional, and clear in your explanations
- Reference specific Egyptian laws, articles, and legal procedures when relevant
- If asked about non-Egyptian law, politely redirect to Egyptian law context
- If the question is unclear, make reasonable assumptions and provide helpful information based on common interpretations`;

        // Limit conversation history to last 6 messages to avoid token limits
        const recentHistory = conversationHistory.slice(-6);
        
        // Build messages array
        const messages = [
            { role: 'system', content: systemPrompt },
            ...recentHistory,
            { role: 'user', content: userMessage }
        ];

        // Add file information if files are uploaded
        if (files.length > 0) {
            const fileNames = files.map(f => f.originalname).join(', ');
            const fileInfo = detectedLang === 'ar'
                ? `\n\nملاحظة: المستخدم رفع ${files.length} ملف(ات): ${fileNames}. لا يمكنني قراءة محتوى الملفات، لكن يمكنني الإجابة على الأسئلة العامة حول المستندات القانونية المصرية.`
                : `\n\nNote: User uploaded ${files.length} file(s): ${fileNames}. I cannot read file contents, but I can answer general questions about Egyptian legal documents.`;
            messages[messages.length - 1].content += fileInfo;
        }

        console.log('🤖 Calling ChatGPT API...');
        
        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
        });

        const aiResponse = completion.choices[0].message.content.trim();
        
        if (!aiResponse || aiResponse.length === 0) {
            throw new Error('Empty response from OpenAI API');
        }

        console.log('✅ ChatGPT API response received');
        return aiResponse;
        
    } catch (error) {
        console.error('❌ OpenAI API error:', error.message || error);
        console.error('Error details:', error);
        
        // Provide more helpful error message
        if (error.status === 401) {
            console.error('🔑 Invalid API key. Please check your OPENAI_API_KEY.');
        } else if (error.status === 429) {
            console.error('⏱️ Rate limit exceeded. Please wait a moment.');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.error('🌐 Network error. Check your internet connection.');
        }
        
        // Fallback to rule-based responses if API fails
        console.warn('⚠️ Falling back to rule-based responses');
        return generateFallbackResponse(userMessage, files, detectedLang);
    }
}

// Fallback response generator (used when API is not available or fails)
function generateFallbackResponse(userMessage, files = [], detectedLang = 'en') {
    const message = userMessage.toLowerCase().trim();
    
    // Handle file uploads
    if (files.length > 0) {
        const fileNames = files.map(f => f.originalname).join(', ');
        
        if (detectedLang === 'ar') {
            return `شكراً لك على رفع ${files.length} ملف(ات): ${fileNames}. لقد استلمت مستنداتك.

يمكنني مساعدتك في فهم المستندات القانونية المصرية وفقاً للدستور المصري والقوانين المصرية. أنصحك بمراجعة المستندات مع محامٍ مؤهل للحصول على نصيحة قانونية محددة.

هل يمكنك إخباري ما هو السؤال القانوني المحدد الذي لديك حول هذه المستندات؟ على سبيل المثال:
- هل تحتاج مساعدة في فهم عقد وفق القانون المدني المصري؟
- هل تبحث عن توضيح للمصطلحات القانونية المصرية؟
- هل تحتاج مساعدة في تحديد المشاكل القانونية المحتملة؟

يرجى وصف ما تريد مني مساعدتك به فيما يتعلق بهذه الملفات.`;
        } else {
        return `Thank you for uploading ${files.length} file(s): ${fileNames}. I've received your documents. 

I can help you understand Egyptian legal documents according to the Egyptian Constitution and Egyptian laws. I recommend reviewing the documents with a qualified Egyptian attorney for specific legal advice. 

Could you tell me what specific legal question you have about these documents? For example:
- Do you need help understanding a contract under Egyptian Civil Law?
- Are you looking for clarification on Egyptian legal terms?
- Do you need help identifying potential legal issues?

Please describe what you'd like me to help you with regarding these files.`;
        }
    }
    
    // Egyptian Legal knowledge base - responses to common legal questions (Bilingual)
    // Focused on Egyptian Constitution and Egyptian Laws
    const responses = {
        // Egyptian Constitution
        'constitution': {
            en: 'The Egyptian Constitution of 2014 is the supreme law of Egypt. It establishes Egypt as a democratic republic, guarantees fundamental rights and freedoms, and defines the structure of government. Key provisions include: separation of powers, protection of human rights, freedom of expression, right to education, and social justice. The Constitution can only be amended by a two-thirds majority vote in Parliament and a public referendum.',
            ar: 'دستور مصر 2014 هو القانون الأعلى في مصر. ينص على أن مصر جمهورية ديمقراطية، ويضمن الحقوق والحريات الأساسية، ويحدد هيكل الحكومة. الأحكام الرئيسية تشمل: فصل السلطات، وحماية حقوق الإنسان، وحرية التعبير، والحق في التعليم، والعدالة الاجتماعية. لا يمكن تعديل الدستور إلا بأغلبية ثلثي الأصوات في البرلمان واستفتاء عام.'
        },
        'دستور': {
            en: 'The Egyptian Constitution of 2014 is the supreme law of Egypt. It establishes Egypt as a democratic republic, guarantees fundamental rights and freedoms, and defines the structure of government. Key provisions include: separation of powers, protection of human rights, freedom of expression, right to education, and social justice. The Constitution can only be amended by a two-thirds majority vote in Parliament and a public referendum.',
            ar: 'دستور مصر 2014 هو القانون الأعلى في مصر. ينص على أن مصر جمهورية ديمقراطية، ويضمن الحقوق والحريات الأساسية، ويحدد هيكل الحكومة. الأحكام الرئيسية تشمل: فصل السلطات، وحماية حقوق الإنسان، وحرية التعبير، والحق في التعليم، والعدالة الاجتماعية. لا يمكن تعديل الدستور إلا بأغلبية ثلثي الأصوات في البرلمان واستفتاء عام.'
        },
        'مصر': {
            en: 'Egypt operates under a civil law system based on the Egyptian Constitution of 2014. The legal system includes: Civil Code, Criminal Code, Commercial Code, Labor Law, Personal Status Law, and various specialized laws. Egyptian courts include: Constitutional Court, Court of Cassation, Courts of Appeal, Primary Courts, and specialized courts. All laws must comply with the Constitution.',
            ar: 'تعمل مصر تحت نظام القانون المدني المستند إلى دستور مصر 2014. النظام القانوني يشمل: القانون المدني، والقانون الجنائي، والقانون التجاري، وقانون العمل، وقانون الأحوال الشخصية، وقوانين متخصصة أخرى. محاكم مصر تشمل: المحكمة الدستورية، ومحكمة النقض، ومحاكم الاستئناف، والمحاكم الابتدائية، والمحاكم المتخصصة. يجب أن تتوافق جميع القوانين مع الدستور.'
        },
        'egyptian': {
            en: 'Egypt operates under a civil law system based on the Egyptian Constitution of 2014. The legal system includes: Civil Code, Criminal Code, Commercial Code, Labor Law, Personal Status Law, and various specialized laws. Egyptian courts include: Constitutional Court, Court of Cassation, Courts of Appeal, Primary Courts, and specialized courts. All laws must comply with the Constitution.',
            ar: 'تعمل مصر تحت نظام القانون المدني المستند إلى دستور مصر 2014. النظام القانوني يشمل: القانون المدني، والقانون الجنائي، والقانون التجاري، وقانون العمل، وقانون الأحوال الشخصية، وقوانين متخصصة أخرى. محاكم مصر تشمل: المحكمة الدستورية، ومحكمة النقض، ومحاكم الاستئناف، والمحاكم الابتدائية، والمحاكم المتخصصة. يجب أن تتوافق جميع القوانين مع الدستور.'
        },
        // Egyptian Real Estate and Rent Law
        'tenant': {
            en: 'Under Egyptian Law No. 4 of 1996 (Old Rent Law) and Law No. 199 of 2021 (New Rent Law), tenants have rights including: protection from arbitrary eviction, right to habitable premises, and proper notice requirements. The Old Rent Law applies to contracts before 2001 with rent control. New contracts follow market rates. Eviction requires court order and valid reasons such as non-payment, breach of contract, or owner\'s need for personal use.',
            ar: 'وفقاً لقانون الإيجار القديم رقم 4 لسنة 1996 وقانون الإيجار الجديد رقم 199 لسنة 2021، للمستأجرين حقوق تشمل: الحماية من الإخلاء التعسفي، والحق في مسكن صالح للسكن، ومتطلبات الإشعار المناسبة. قانون الإيجار القديم ينطبق على العقود قبل 2001 مع تحديد الإيجار. العقود الجديدة تتبع أسعار السوق. الإخلاء يتطلب أمر محكمة وأسباباً صحيحة مثل عدم الدفع، أو انتهاك العقد، أو حاجة المالك للاستخدام الشخصي.'
        },
        'rent': {
            en: 'Egyptian rent law distinguishes between old rent (pre-2001) and new rent contracts. Old rent contracts are subject to rent control and can only be increased by specific percentages set by law. New rent contracts (Law 199/2021) follow market rates. Rent increases must be agreed upon in the contract or follow legal procedures. Disputes are resolved through Real Estate Rental Dispute Committees or courts.',
            ar: 'قانون الإيجار المصري يميز بين الإيجار القديم (قبل 2001) وعقود الإيجار الجديدة. عقود الإيجار القديمة تخضع لتحديد الإيجار ويمكن زيادتها فقط بنسب محددة يحددها القانون. عقود الإيجار الجديدة (قانون 199/2021) تتبع أسعار السوق. زيادة الإيجار يجب أن يتم الاتفاق عليها في العقد أو اتباع الإجراءات القانونية. النزاعات تحل من خلال لجان منازعات إيجار العقارات أو المحاكم.'
        },
        'إيجار': {
            en: 'Egyptian rent law distinguishes between old rent (pre-2001) and new rent contracts. Old rent contracts are subject to rent control and can only be increased by specific percentages set by law. New rent contracts (Law 199/2021) follow market rates. Rent increases must be agreed upon in the contract or follow legal procedures. Disputes are resolved through Real Estate Rental Dispute Committees or courts.',
            ar: 'قانون الإيجار المصري يميز بين الإيجار القديم (قبل 2001) وعقود الإيجار الجديدة. عقود الإيجار القديمة تخضع لتحديد الإيجار ويمكن زيادتها فقط بنسب محددة يحددها القانون. عقود الإيجار الجديدة (قانون 199/2021) تتبع أسعار السوق. زيادة الإيجار يجب أن يتم الاتفاق عليها في العقد أو اتباع الإجراءات القانونية. النزاعات تحل من خلال لجان منازعات إيجار العقارات أو المحاكم.'
        },
        'مستأجر': {
            en: 'Under Egyptian Law No. 4 of 1996 (Old Rent Law) and Law No. 199 of 2021 (New Rent Law), tenants have rights including: protection from arbitrary eviction, right to habitable premises, and proper notice requirements. The Old Rent Law applies to contracts before 2001 with rent control. New contracts follow market rates. Eviction requires court order and valid reasons such as non-payment, breach of contract, or owner\'s need for personal use.',
            ar: 'وفقاً لقانون الإيجار القديم رقم 4 لسنة 1996 وقانون الإيجار الجديد رقم 199 لسنة 2021، للمستأجرين حقوق تشمل: الحماية من الإخلاء التعسفي، والحق في مسكن صالح للسكن، ومتطلبات الإشعار المناسبة. قانون الإيجار القديم ينطبق على العقود قبل 2001 مع تحديد الإيجار. العقود الجديدة تتبع أسعار السوق. الإخلاء يتطلب أمر محكمة وأسباباً صحيحة مثل عدم الدفع، أو انتهاك العقد، أو حاجة المالك للاستخدام الشخصي.'
        },
        
        // Egyptian Court System and Procedures
        'complaint': {
            en: 'In Egypt, to file a legal complaint: 1) Determine the appropriate court (Primary Court for civil matters, Criminal Court for crimes), 2) Prepare a written complaint (da\'wa) with facts and evidence, 3) File at the court clerk\'s office with required documents, 4) Pay court fees (varies by case value), 5) Serve the complaint to defendant through court bailiff. Egyptian courts follow civil law procedures. Consider consulting an Egyptian lawyer as procedures can be complex.',
            ar: 'في مصر، لتقديم شكوى قانونية: 1) تحديد المحكمة المناسبة (المحكمة الابتدائية للمسائل المدنية، محكمة الجنح/الجنايات للجرائم)، 2) إعداد دعوى مكتوبة بالحقائق والأدلة، 3) تقديمها في مكتب كاتب المحكمة مع المستندات المطلوبة، 4) دفع الرسوم القضائية (تختلف حسب قيمة القضية)، 5) إبلاغ المدعى عليه من خلال محضر المحكمة. محاكم مصر تتبع إجراءات القانون المدني. فكر في استشارة محامٍ مصري لأن الإجراءات قد تكون معقدة.'
        },
        'شكوى': {
            en: 'In Egypt, to file a legal complaint: 1) Determine the appropriate court (Primary Court for civil matters, Criminal Court for crimes), 2) Prepare a written complaint (da\'wa) with facts and evidence, 3) File at the court clerk\'s office with required documents, 4) Pay court fees (varies by case value), 5) Serve the complaint to defendant through court bailiff. Egyptian courts follow civil law procedures. Consider consulting an Egyptian lawyer as procedures can be complex.',
            ar: 'في مصر، لتقديم شكوى قانونية: 1) تحديد المحكمة المناسبة (المحكمة الابتدائية للمسائل المدنية، محكمة الجنح/الجنايات للجرائم)، 2) إعداد دعوى مكتوبة بالحقائق والأدلة، 3) تقديمها في مكتب كاتب المحكمة مع المستندات المطلوبة، 4) دفع الرسوم القضائية (تختلف حسب قيمة القضية)، 5) إبلاغ المدعى عليه من خلال محضر المحكمة. محاكم مصر تتبع إجراءات القانون المدني. فكر في استشارة محامٍ مصري لأن الإجراءات قد تكون معقدة.'
        },
        'sue': {
            en: 'In Egyptian law, before filing a lawsuit (da\'wa), consider: 1) Whether you have a valid claim under Egyptian Civil Code, 2) Statute of limitations (usually 15 years for contracts, 3 years for torts), 3) Whether mediation or settlement is possible, 4) Court fees and lawyer costs, 5) Whether you have sufficient evidence. Cases start in Primary Courts, can be appealed to Courts of Appeal, and finally to Court of Cassation. Consult an Egyptian lawyer for specific advice.',
            ar: 'في القانون المصري، قبل رفع دعوى قضائية، فكر في: 1) ما إذا كان لديك مطالبة صالحة وفق القانون المدني المصري، 2) قانون التقادم (عادة 15 سنة للعقود، 3 سنوات للمسؤولية التقصيرية)، 3) ما إذا كان الوساطة أو التسوية ممكنة، 4) الرسوم القضائية وتكاليف المحامي، 5) ما إذا كان لديك أدلة كافية. القضايا تبدأ في المحاكم الابتدائية، يمكن استئنافها في محاكم الاستئناف، وأخيراً في محكمة النقض. استشر محامياً مصرياً للحصول على نصيحة محددة.'
        },
        'دعوى': {
            en: 'In Egyptian law, before filing a lawsuit (da\'wa), consider: 1) Whether you have a valid claim under Egyptian Civil Code, 2) Statute of limitations (usually 15 years for contracts, 3 years for torts), 3) Whether mediation or settlement is possible, 4) Court fees and lawyer costs, 5) Whether you have sufficient evidence. Cases start in Primary Courts, can be appealed to Courts of Appeal, and finally to Court of Cassation. Consult an Egyptian lawyer for specific advice.',
            ar: 'في القانون المصري، قبل رفع دعوى قضائية، فكر في: 1) ما إذا كان لديك مطالبة صالحة وفق القانون المدني المصري، 2) قانون التقادم (عادة 15 سنة للعقود، 3 سنوات للمسؤولية التقصيرية)، 3) ما إذا كان الوساطة أو التسوية ممكنة، 4) الرسوم القضائية وتكاليف المحامي، 5) ما إذا كان لديك أدلة كافية. القضايا تبدأ في المحاكم الابتدائية، يمكن استئنافها في محاكم الاستئناف، وأخيراً في محكمة النقض. استشر محامياً مصرياً للحصول على نصيحة محددة.'
        },
        
        // Egyptian Civil and Criminal Law
        'civil': {
            en: 'Egyptian Civil Code (Law 131/1948) governs private disputes between individuals/organizations. It covers contracts, property, torts, family law (for non-Muslims), and obligations. Civil cases are heard in Primary Courts, with appeals to Courts of Appeal and Court of Cassation. The Code is based on French civil law principles adapted to Egyptian context. Key areas: contract formation, breach of contract, property rights, and compensation for damages.',
            ar: 'القانون المدني المصري (قانون 131/1948) يحكم النزاعات الخاصة بين الأفراد/المنظمات. يشمل العقود، والملكية، والمسؤولية التقصيرية، وقانون الأحوال الشخصية (لغير المسلمين)، والالتزامات. القضايا المدنية تُسمع في المحاكم الابتدائية، مع الاستئناف في محاكم الاستئناف ومحكمة النقض. القانون مبني على مبادئ القانون المدني الفرنسي المكيفة للسياق المصري. المجالات الرئيسية: تكوين العقود، وانتهاك العقود، وحقوق الملكية، والتعويض عن الأضرار.'
        },
        'مدني': {
            en: 'Egyptian Civil Code (Law 131/1948) governs private disputes between individuals/organizations. It covers contracts, property, torts, family law (for non-Muslims), and obligations. Civil cases are heard in Primary Courts, with appeals to Courts of Appeal and Court of Cassation. The Code is based on French civil law principles adapted to Egyptian context. Key areas: contract formation, breach of contract, property rights, and compensation for damages.',
            ar: 'القانون المدني المصري (قانون 131/1948) يحكم النزاعات الخاصة بين الأفراد/المنظمات. يشمل العقود، والملكية، والمسؤولية التقصيرية، وقانون الأحوال الشخصية (لغير المسلمين)، والالتزامات. القضايا المدنية تُسمع في المحاكم الابتدائية، مع الاستئناف في محاكم الاستئناف ومحكمة النقض. القانون مبني على مبادئ القانون المدني الفرنسي المكيفة للسياق المصري. المجالات الرئيسية: تكوين العقود، وانتهاك العقود، وحقوق الملكية، والتعويض عن الأضرار.'
        },
        'criminal': {
            en: 'Egyptian Criminal Code (Law 58/1937) defines crimes and penalties. Crimes are classified as: felonies (جنايات) - serious crimes with severe penalties, misdemeanors (جنح) - less serious crimes, and violations (مخالفات) - minor offenses. The Public Prosecution (النيابة العامة) investigates and prosecutes crimes. Defendants have rights including: legal representation, presumption of innocence, and fair trial. Penalties range from fines to imprisonment to death penalty (for certain crimes).',
            ar: 'القانون الجنائي المصري (قانون 58/1937) يحدد الجرائم والعقوبات. الجرائم تصنف كـ: جنايات - جرائم خطيرة بعقوبات شديدة، وجنح - جرائم أقل خطورة، ومخالفات - جرائم بسيطة. النيابة العامة تحقق وتقاضي الجرائم. للمتهمين حقوق تشمل: التمثيل القانوني، وافتراض البراءة، والمحاكمة العادلة. العقوبات تتراوح من الغرامات إلى السجن إلى عقوبة الإعدام (لجرائم معينة).'
        },
        'جنائي': {
            en: 'Egyptian Criminal Code (Law 58/1937) defines crimes and penalties. Crimes are classified as: felonies (جنايات) - serious crimes with severe penalties, misdemeanors (جنح) - less serious crimes, and violations (مخالفات) - minor offenses. The Public Prosecution (النيابة العامة) investigates and prosecutes crimes. Defendants have rights including: legal representation, presumption of innocence, and fair trial. Penalties range from fines to imprisonment to death penalty (for certain crimes).',
            ar: 'القانون الجنائي المصري (قانون 58/1937) يحدد الجرائم والعقوبات. الجرائم تصنف كـ: جنايات - جرائم خطيرة بعقوبات شديدة، وجنح - جرائم أقل خطورة، ومخالفات - جرائم بسيطة. النيابة العامة تحقق وتقاضي الجرائم. للمتهمين حقوق تشمل: التمثيل القانوني، وافتراض البراءة، والمحاكمة العادلة. العقوبات تتراوح من الغرامات إلى السجن إلى عقوبة الإعدام (لجرائم معينة).'
        },
        
        // Egyptian Contract Law
        'contract': {
            en: 'Under Egyptian Civil Code (Articles 89-200), a valid contract requires: 1) Offer and acceptance (إيجاب وقبول), 2) Legal capacity of parties (age 21 or emancipation), 3) Subject matter (محل العقد) that is legal and possible, 4) Cause (السبب) - lawful purpose. Contracts can be written or oral, but certain contracts (real estate, employment over 3 months) must be written. Breach of contract entitles the injured party to damages or specific performance.',
            ar: 'وفق القانون المدني المصري (المواد 89-200)، العقد الصالح يتطلب: 1) الإيجاب والقبول، 2) الأهلية القانونية للأطراف (21 سنة أو التحرر)، 3) محل العقد - قانوني وممكن، 4) السبب - غرض قانوني. العقود يمكن أن تكون مكتوبة أو شفهية، لكن عقود معينة (العقارات، العمل لأكثر من 3 أشهر) يجب أن تكون مكتوبة. انتهاك العقد يعطي الطرف المتضرر الحق في التعويض أو التنفيذ العيني.'
        },
        'عقد': {
            en: 'Under Egyptian Civil Code (Articles 89-200), a valid contract requires: 1) Offer and acceptance (إيجاب وقبول), 2) Legal capacity of parties (age 21 or emancipation), 3) Subject matter (محل العقد) that is legal and possible, 4) Cause (السبب) - lawful purpose. Contracts can be written or oral, but certain contracts (real estate, employment over 3 months) must be written. Breach of contract entitles the injured party to damages or specific performance.',
            ar: 'وفق القانون المدني المصري (المواد 89-200)، العقد الصالح يتطلب: 1) الإيجاب والقبول، 2) الأهلية القانونية للأطراف (21 سنة أو التحرر)، 3) محل العقد - قانوني وممكن، 4) السبب - غرض قانوني. العقود يمكن أن تكون مكتوبة أو شفهية، لكن عقود معينة (العقارات، العمل لأكثر من 3 أشهر) يجب أن تكون مكتوبة. انتهاك العقد يعطي الطرف المتضرر الحق في التعويض أو التنفيذ العيني.'
        },
        'agreement': {
            en: 'In Egyptian law, agreements (اتفاقات) can be written or oral. However, certain agreements must be in writing: real estate transactions, employment contracts over 3 months, commercial agency agreements, and guarantees. Written agreements are strongly recommended as they provide better evidence. Key elements: clear terms, mutual consent, lawful purpose, and legal capacity. Always have important agreements reviewed by an Egyptian lawyer before signing.',
            ar: 'في القانون المصري، الاتفاقات يمكن أن تكون مكتوبة أو شفهية. لكن اتفاقات معينة يجب أن تكون مكتوبة: معاملات العقارات، وعقود العمل لأكثر من 3 أشهر، واتفاقات الوكالة التجارية، والضمانات. الاتفاقات المكتوبة موصى بها بشدة لأنها توفر أدلة أفضل. العناصر الرئيسية: شروط واضحة، وموافقة متبادلة، وغرض قانوني، وأهلية قانونية. دائماً اجعل محامياً مصرياً يراجع الاتفاقات المهمة قبل التوقيع.'
        },
        'اتفاق': {
            en: 'In Egyptian law, agreements (اتفاقات) can be written or oral. However, certain agreements must be in writing: real estate transactions, employment contracts over 3 months, commercial agency agreements, and guarantees. Written agreements are strongly recommended as they provide better evidence. Key elements: clear terms, mutual consent, lawful purpose, and legal capacity. Always have important agreements reviewed by an Egyptian lawyer before signing.',
            ar: 'في القانون المصري، الاتفاقات يمكن أن تكون مكتوبة أو شفهية. لكن اتفاقات معينة يجب أن تكون مكتوبة: معاملات العقارات، وعقود العمل لأكثر من 3 أشهر، واتفاقات الوكالة التجارية، والضمانات. الاتفاقات المكتوبة موصى بها بشدة لأنها توفر أدلة أفضل. العناصر الرئيسية: شروط واضحة، وموافقة متبادلة، وغرض قانوني، وأهلية قانونية. دائماً اجعل محامياً مصرياً يراجع الاتفاقات المهمة قبل التوقيع.'
        },
        
        // Egyptian Constitutional Rights
        'rights': {
            en: 'The Egyptian Constitution of 2014 guarantees fundamental rights including: equality before the law, freedom of belief and expression, right to education and healthcare, right to property, right to work, freedom of assembly and association, privacy rights, and right to fair trial. These rights are protected by the Constitutional Court. Violations can be challenged through constitutional petitions. For specific questions about your rights under Egyptian law, consult an Egyptian constitutional lawyer.',
            ar: 'دستور مصر 2014 يضمن الحقوق الأساسية بما في ذلك: المساواة أمام القانون، وحرية الاعتقاد والتعبير، والحق في التعليم والرعاية الصحية، والحق في الملكية، والحق في العمل، وحرية التجمع والجمعيات، وحقوق الخصوصية، والحق في المحاكمة العادلة. هذه الحقوق محمية من قبل المحكمة الدستورية. الانتهاكات يمكن الطعن فيها من خلال الطعون الدستورية. للأسئلة المحددة حول حقوقك بموجب القانون المصري، استشر محامياً دستورياً مصرياً.'
        },
        'حقوق': {
            en: 'The Egyptian Constitution of 2014 guarantees fundamental rights including: equality before the law, freedom of belief and expression, right to education and healthcare, right to property, right to work, freedom of assembly and association, privacy rights, and right to fair trial. These rights are protected by the Constitutional Court. Violations can be challenged through constitutional petitions. For specific questions about your rights under Egyptian law, consult an Egyptian constitutional lawyer.',
            ar: 'دستور مصر 2014 يضمن الحقوق الأساسية بما في ذلك: المساواة أمام القانون، وحرية الاعتقاد والتعبير، والحق في التعليم والرعاية الصحية، والحق في الملكية، والحق في العمل، وحرية التجمع والجمعيات، وحقوق الخصوصية، والحق في المحاكمة العادلة. هذه الحقوق محمية من قبل المحكمة الدستورية. الانتهاكات يمكن الطعن فيها من خلال الطعون الدستورية. للأسئلة المحددة حول حقوقك بموجب القانون المصري، استشر محامياً دستورياً مصرياً.'
        },
        'lawyer': {
            en: 'In Egypt, you may need a lawyer (محامي) for: criminal charges, civil lawsuits, commercial disputes, real estate transactions, family law matters (marriage, divorce, inheritance), labor disputes, administrative appeals, and drafting legal documents. Lawyers must be registered with the Egyptian Bar Association (نقابة المحامين). Many lawyers offer initial consultations. For urgent matters, contact the Bar Association or a legal aid organization.',
            ar: 'في مصر، قد تحتاج محامياً (محامي) لـ: التهم الجنائية، والدعاوى المدنية، والنزاعات التجارية، ومعاملات العقارات، ومسائل قانون الأحوال الشخصية (الزواج، الطلاق، الميراث)، ونزاعات العمل، والطعون الإدارية، وإعداد الوثائق القانونية. المحامون يجب أن يكونوا مسجلين في نقابة المحامين المصرية. العديد من المحامين يقدمون استشارات أولية. للمسائل العاجلة، اتصل بنقابة المحامين أو منظمة المساعدة القانونية.'
        },
        'محامي': {
            en: 'In Egypt, you may need a lawyer (محامي) for: criminal charges, civil lawsuits, commercial disputes, real estate transactions, family law matters (marriage, divorce, inheritance), labor disputes, administrative appeals, and drafting legal documents. Lawyers must be registered with the Egyptian Bar Association (نقابة المحامين). Many lawyers offer initial consultations. For urgent matters, contact the Bar Association or a legal aid organization.',
            ar: 'في مصر، قد تحتاج محامياً (محامي) لـ: التهم الجنائية، والدعاوى المدنية، والنزاعات التجارية، ومعاملات العقارات، ومسائل قانون الأحوال الشخصية (الزواج، الطلاق، الميراث)، ونزاعات العمل، والطعون الإدارية، وإعداد الوثائق القانونية. المحامون يجب أن يكونوا مسجلين في نقابة المحامين المصرية. العديد من المحامين يقدمون استشارات أولية. للمسائل العاجلة، اتصل بنقابة المحامين أو منظمة المساعدة القانونية.'
        },
        'محام': {
            en: 'In Egypt, you may need a lawyer (محامي) for: criminal charges, civil lawsuits, commercial disputes, real estate transactions, family law matters (marriage, divorce, inheritance), labor disputes, administrative appeals, and drafting legal documents. Lawyers must be registered with the Egyptian Bar Association (نقابة المحامين). Many lawyers offer initial consultations. For urgent matters, contact the Bar Association or a legal aid organization.',
            ar: 'في مصر، قد تحتاج محامياً (محامي) لـ: التهم الجنائية، والدعاوى المدنية، والنزاعات التجارية، ومعاملات العقارات، ومسائل قانون الأحوال الشخصية (الزواج، الطلاق، الميراث)، ونزاعات العمل، والطعون الإدارية، وإعداد الوثائق القانونية. المحامون يجب أن يكونوا مسجلين في نقابة المحامين المصرية. العديد من المحامين يقدمون استشارات أولية. للمسائل العاجلة، اتصل بنقابة المحامين أو منظمة المساعدة القانونية.'
        },
        'legal': {
            en: 'Egyptian legal matters are governed by the Constitution of 2014 and various codes: Civil Code, Criminal Code, Commercial Code, Labor Law, Personal Status Law, and specialized laws. The legal system follows civil law principles. While I can provide general information about Egyptian law, specific legal advice should come from a licensed Egyptian attorney registered with the Bar Association. For urgent matters, contact a lawyer or legal aid organization immediately.',
            ar: 'المسائل القانونية المصرية يحكمها دستور 2014 وقوانين مختلفة: القانون المدني، والقانون الجنائي، والقانون التجاري، وقانون العمل، وقانون الأحوال الشخصية، وقوانين متخصصة. النظام القانوني يتبع مبادئ القانون المدني. بينما يمكنني تقديم معلومات عامة عن القانون المصري، يجب أن تأتي النصيحة القانونية المحددة من محامٍ مصري مرخص مسجل في نقابة المحامين. للمسائل العاجلة، اتصل بمحامٍ أو منظمة مساعدة قانونية فوراً.'
        },
        'قانوني': {
            en: 'Egyptian legal matters are governed by the Constitution of 2014 and various codes: Civil Code, Criminal Code, Commercial Code, Labor Law, Personal Status Law, and specialized laws. The legal system follows civil law principles. While I can provide general information about Egyptian law, specific legal advice should come from a licensed Egyptian attorney registered with the Bar Association. For urgent matters, contact a lawyer or legal aid organization immediately.',
            ar: 'المسائل القانونية المصرية يحكمها دستور 2014 وقوانين مختلفة: القانون المدني، والقانون الجنائي، والقانون التجاري، وقانون العمل، وقانون الأحوال الشخصية، وقوانين متخصصة. النظام القانوني يتبع مبادئ القانون المدني. بينما يمكنني تقديم معلومات عامة عن القانون المصري، يجب أن تأتي النصيحة القانونية المحددة من محامٍ مصري مرخص مسجل في نقابة المحامين. للمسائل العاجلة، اتصل بمحامٍ أو منظمة مساعدة قانونية فوراً.'
        },
    };

    // Check for keywords and provide relevant responses
    for (const [keyword, responseObj] of Object.entries(responses)) {
        if (message.includes(keyword)) {
            return responseObj[detectedLang] || responseObj.en;
        }
    }

    // Default intelligent response - Egyptian Law Focus
    if (message.includes('hello') || message.includes('hi') || message.includes('hey') || 
        message.includes('مرحبا') || message.includes('السلام') || message.includes('أهلا')) {
        if (detectedLang === 'ar') {
            return 'مرحباً! أنا مساعدك القانوني الذكي المتخصص في القانون المصري. أنا هنا لمساعدتك في فهم الدستور المصري والقوانين المصرية والإجابة على أسئلتك حول حقوقك بموجب القانون المصري. ما هو السؤال القانوني المصري الذي يمكنني مساعدتك به اليوم؟';
        } else {
            return 'Hello! I\'m your AI Legal Assistant specialized in Egyptian law. I\'m here to help you understand the Egyptian Constitution and Egyptian laws, and answer questions about your rights under Egyptian law. What Egyptian legal question can I help you with today?';
        }
    }

    if (message.includes('thank') || message.includes('شكر') || message.includes('مشكور')) {
        if (detectedLang === 'ar') {
            return 'عفواً! إذا كان لديك أي أسئلة أخرى حول القانون المصري أو الدستور المصري، لا تتردد في السؤال. تذكر، للحصول على نصيحة قانونية محددة، من الأفضل دائماً استشارة محامٍ مصري مؤهل مسجل في نقابة المحامين المصرية.';
        } else {
            return 'You\'re welcome! If you have any other questions about Egyptian law or the Egyptian Constitution, feel free to ask. Remember, for specific legal advice, it\'s always best to consult with a qualified Egyptian attorney registered with the Egyptian Bar Association.';
        }
    }

    if (message.includes('help') || message.includes('مساعدة') || message.includes('مساعدة')) {
        if (detectedLang === 'ar') {
            return 'يمكنني مساعدتك في الأسئلة حول القانون المصري والدستور المصري، بما في ذلك: الدستور المصري 2014، والقانون المدني المصري، والقانون الجنائي المصري، وقانون الإيجار المصري، والعقود بموجب القانون المصري، وحقوق المستأجرين، وتقديم الشكاوى في المحاكم المصرية، والنظام القضائي المصري، وحقوقك الدستورية. ماذا تريد أن تعرف عن القانون المصري؟';
        } else {
            return 'I can help you with questions about Egyptian law and the Egyptian Constitution, including: Egyptian Constitution 2014, Egyptian Civil Code, Egyptian Criminal Code, Egyptian Rent Law, contracts under Egyptian law, tenant rights, filing complaints in Egyptian courts, Egyptian court system, and your constitutional rights. What would you like to know about Egyptian law?';
        }
    }

    // General response for unrecognized queries - Egyptian Law Focus
    if (detectedLang === 'ar') {
        return 'أفهم أنك تسأل عن مسائل قانونية مصرية. بينما يمكنني تقديم معلومات عامة عن القانون المصري والدستور المصري، أنصحك بأن تكون أكثر تحديداً في سؤالك. على سبيل المثال، يمكنك أن تسأل عن: الدستور المصري، أو القانون المدني المصري، أو قانون الإيجار المصري، أو العقود بموجب القانون المصري، أو كيفية تقديم دعوى في المحاكم المصرية. للحصول على نصيحة قانونية محددة لحالتك بموجب القانون المصري، يرجى استشارة محامٍ مصري مؤهل مسجل في نقابة المحامين المصرية.';
    } else {
        return 'I understand you\'re asking about Egyptian legal matters. While I can provide general information about Egyptian law and the Egyptian Constitution, I\'d recommend being more specific about your question. For example, you could ask about: the Egyptian Constitution, Egyptian Civil Code, Egyptian Rent Law, contracts under Egyptian law, or how to file a lawsuit in Egyptian courts. For specific legal advice tailored to your situation under Egyptian law, please consult with a qualified Egyptian attorney registered with the Egyptian Bar Association.';
    }
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
    
    // Check OpenAI API key status
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (apiKey && apiKey.trim() !== '' && apiKey !== 'your-api-key-here') {
        console.log('\n🤖 ChatGPT API: ✅ CONFIGURED');
        console.log(`   Model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
        console.log('   AI chat will use ChatGPT for responses\n');
    } else {
        console.log('\n⚠️  ChatGPT API: ❌ NOT CONFIGURED');
        console.log('   Chat will use fallback rule-based responses');
        console.log('   To enable ChatGPT:');
        console.log('   Windows: set OPENAI_API_KEY=your-api-key-here');
        console.log('   Linux/Mac: export OPENAI_API_KEY="your-api-key-here"');
        console.log('   See CHATGPT_SETUP.md for details\n');
    }
    
    console.log('📝 Available endpoints:');
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
