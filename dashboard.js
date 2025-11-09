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

// Initialize on page load
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
