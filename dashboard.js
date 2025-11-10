// Check authentication on page load
async function checkAuth() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!data.success) {
            // Try to create guest session
            try {
                const guestResponse = await fetch('/api/guest', {
                    method: 'POST',
                    credentials: 'include'
                });
                const guestData = await guestResponse.json();
                if (guestData.success) {
                    loadUserData();
                    loadDashboardData();
                    return;
                }
            } catch (guestError) {
                console.error('Guest session error:', guestError);
            }
            // If guest session fails, still allow access but show guest mode
            loadUserData();
            loadDashboardData();
            return;
        }

        // Load user data
        loadUserData();
        loadDashboardData();
    } catch (error) {
        console.error('Auth check error:', error);
        // Even on error, try to load as guest
        loadUserData();
        loadDashboardData();
    }
}

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/dashboard', {
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            const user = data.user;
            
            // Update UI with user data
            document.getElementById('userName').textContent = user.name;
            document.getElementById('welcomeName').textContent = user.name;
            document.getElementById('profileName').textContent = user.name;
            document.getElementById('profileEmail').textContent = user.email;
            
            // Format and display created date
            if (user.createdAt) {
                const createdDate = new Date(user.createdAt);
                const formattedDate = createdDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                document.getElementById('profileCreatedAt').textContent = formattedDate;
            } else {
                document.getElementById('profileCreatedAt').textContent = 'Guest Session';
            }

            // Set avatar initial
            const initial = user.name.charAt(0).toUpperCase();
            document.getElementById('avatarInitial').textContent = initial;

            // Update stats
            if (data.stats) {
                document.getElementById('totalUsers').textContent = data.stats.totalUsers || 0;
                document.getElementById('accountAge').textContent = data.stats.daysActive || 0;
            }

            // Show guest mode indicator if applicable
            if (user.isGuest) {
                const welcomeCard = document.querySelector('.welcome-card h2');
                if (welcomeCard) {
                    welcomeCard.innerHTML = 'Welcome, <span id="welcomeName">Guest User</span>! 👋 <small style="font-size: 14px; color: rgba(255,255,255,0.5);">(Guest Mode)</small>';
                }
            }
        } else {
            // If API fails, create guest session and retry
            try {
                const guestResponse = await fetch('/api/guest', {
                    method: 'POST',
                    credentials: 'include'
                });
                if (guestResponse.ok) {
                    loadUserData(); // Retry loading
                }
            } catch (error) {
                console.error('Error creating guest session:', error);
                // Set default guest values
                document.getElementById('userName').textContent = 'Guest User';
                document.getElementById('welcomeName').textContent = 'Guest User';
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        // Set default guest values on error
        document.getElementById('userName').textContent = 'Guest User';
        document.getElementById('welcomeName').textContent = 'Guest User';
        document.getElementById('profileName').textContent = 'Guest User';
        document.getElementById('profileEmail').textContent = 'guest@knowlaw.com';
    }
}

// Load dashboard data
async function loadDashboardData() {
    // Additional dashboard data can be loaded here
    console.log('Dashboard data loaded');
}

// Navigation functionality
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.dashboard-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all items
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));

        // Add active class to clicked item
        item.classList.add('active');

        // Show corresponding section
        const sectionId = item.getAttribute('data-section');
        const targetSection = document.getElementById(`${sectionId}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Update page title
            const pageTitle = document.getElementById('pageTitle');
            pageTitle.textContent = item.querySelector('span').textContent;
            
            // Render documents if switching to documents section
            if (sectionId === 'documents') {
                renderDocuments();
            }
        }
    });
});

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                window.location.href = '/auth.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
            // Redirect anyway
            window.location.href = '/auth.html';
        }
    });
}

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 968) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
}

// Close sidebar when clicking on nav item on mobile
navItems.forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 968) {
            sidebar.classList.remove('open');
        }
    });
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        document.body.classList.add('light-mode');
        if (themeToggle) themeToggle.checked = true;
        if (themeLabel) themeLabel.textContent = 'Light Mode';
    } else {
        document.documentElement.classList.remove('light-mode');
        document.body.classList.remove('light-mode');
        if (themeToggle) themeToggle.checked = false;
        if (themeLabel) themeLabel.textContent = 'Dark Mode';
    }
}

function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (themeToggle.checked) {
                document.documentElement.classList.add('light-mode');
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
                if (themeLabel) themeLabel.textContent = 'Light Mode';
            } else {
                document.documentElement.classList.remove('light-mode');
                document.body.classList.remove('light-mode');
                localStorage.setItem('theme', 'dark');
                if (themeLabel) themeLabel.textContent = 'Dark Mode';
            }
        });
    }
}

// Initialize on page load
initTheme();
toggleTheme();
checkAuth();

// Handle window resize
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (window.innerWidth > 968) {
            sidebar.classList.remove('open');
        }
    }, 250);
});

// Ask Legal Question - Navigate to chat page
const askLegalQuestionBtn = document.getElementById('askLegalQuestionBtn');
if (askLegalQuestionBtn) {
    askLegalQuestionBtn.addEventListener('click', () => {
        window.location.href = 'chat.html';
    });
}

// Document upload functionality
const uploadDocumentBtn = document.getElementById('uploadDocumentBtn');
const uploadDocumentBtn2 = document.getElementById('uploadDocumentBtn2');
const documentUploadInput = document.getElementById('documentUploadInput');
const documentsList = document.getElementById('documentsList');

// Store documents in localStorage
function getDocuments() {
    const stored = localStorage.getItem('userDocuments');
    return stored ? JSON.parse(stored) : [];
}

function saveDocuments(documents) {
    localStorage.setItem('userDocuments', JSON.stringify(documents));
}

function renderDocuments() {
    const documents = getDocuments();
    
    if (documents.length === 0) {
        documentsList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 40px;">No documents uploaded yet. Click "Upload Document" to get started.</p>';
        return;
    }
    
    documentsList.innerHTML = documents.map((doc, index) => `
        <div class="document-item" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(102,178,255,0.2); border-radius: 10px; padding: 15px; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                <div style="width: 40px; height: 40px; background: rgba(102,178,255,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M4 4C4 2.89543 4.89543 2 6 2H10.5858C10.851 2 11.1054 2.10536 11.2929 2.29289L15.7071 6.70711C15.8946 6.89464 16 7.149 16 7.41421V16C16 17.1046 15.1046 18 14 18H6C4.89543 18 4 17.1046 4 16V4Z" stroke="#66B2FF" stroke-width="2"/>
                    </svg>
                </div>
                <div style="flex: 1;">
                    <h3 style="margin: 0; font-size: 16px; color: white; margin-bottom: 5px;">${doc.name}</h3>
                    <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.6);">${doc.size} • Uploaded ${doc.uploadDate}</p>
                </div>
            </div>
            <button class="delete-doc-btn" data-index="${index}" style="background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); color: #ff6b6b; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Delete</button>
        </div>
    `).join('');
    
    // Add delete handlers
    documentsList.querySelectorAll('.delete-doc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const documents = getDocuments();
            documents.splice(index, 1);
            saveDocuments(documents);
            renderDocuments();
        });
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Create document object
    const document = {
        id: Date.now(),
        name: file.name,
        size: formatFileSize(file.size),
        uploadDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        file: file.name // Store filename only (can't store File object in localStorage)
    };
    
    // Save to localStorage
    const documents = getDocuments();
    documents.unshift(document); // Add to beginning
    saveDocuments(documents);
    
    // Render documents
    renderDocuments();
    
    // Switch to documents section
    const documentsNav = document.querySelector('[data-section="documents"]');
    if (documentsNav) {
        documentsNav.click();
    }
    
    // Reset input
    event.target.value = '';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Set up upload buttons
if (uploadDocumentBtn && documentUploadInput) {
    uploadDocumentBtn.addEventListener('click', () => {
        documentUploadInput.click();
    });
}

if (uploadDocumentBtn2 && documentUploadInput) {
    uploadDocumentBtn2.addEventListener('click', () => {
        documentUploadInput.click();
    });
}

if (documentUploadInput) {
    documentUploadInput.addEventListener('change', handleFileUpload);
}

// Load documents on page load
document.addEventListener('DOMContentLoaded', () => {
    renderDocuments();
});
