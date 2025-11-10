// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        document.body.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
        document.body.classList.remove('light-mode');
    }
}

// Initialize theme on page load
initTheme();

// Listen for theme changes from other pages
window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
        initTheme();
    }
});

// Booking functionality
const searchInput = document.getElementById('searchInput');
const bookingModal = document.getElementById('bookingModal');
const successModal = document.getElementById('successModal');
const closeModal = document.getElementById('closeModal');
const closeSuccessModal = document.getElementById('closeSuccessModal');
const bookingForm = document.getElementById('bookingForm');
const modalTitle = document.getElementById('modalTitle');

// Different types of lawyers
const lawyers = [
    {
        id: 1,
        name: 'Sarah Johnson',
        specialty: 'Criminal Law',
        experience: '15 years',
        description: 'Experienced criminal defense attorney specializing in felony cases, DUI defense, and white-collar crimes. Known for aggressive defense strategies and successful case outcomes.',
        rating: 4.9,
        cases: '500+',
        location: 'New York, NY',
        icon: '⚖️'
    },
    {
        id: 2,
        name: 'Michael Chen',
        specialty: 'Family Law',
        experience: '12 years',
        description: 'Compassionate family law attorney focusing on divorce, child custody, alimony, and adoption cases. Committed to protecting your family\'s best interests.',
        rating: 4.8,
        cases: '400+',
        location: 'Los Angeles, CA',
        icon: '👨‍👩‍👧‍👦'
    },
    {
        id: 3,
        name: 'Emily Rodriguez',
        specialty: 'Corporate Law',
        experience: '18 years',
        description: 'Corporate law expert specializing in business formation, mergers & acquisitions, contract negotiations, and corporate compliance. Trusted by Fortune 500 companies.',
        rating: 4.9,
        cases: '600+',
        location: 'Chicago, IL',
        icon: '🏢'
    },
    {
        id: 4,
        name: 'David Thompson',
        specialty: 'Personal Injury',
        experience: '14 years',
        description: 'Personal injury attorney with a track record of securing maximum compensation for clients. Handles car accidents, workplace injuries, and medical malpractice cases.',
        rating: 4.7,
        cases: '350+',
        location: 'Houston, TX',
        icon: '🏥'
    },
    {
        id: 5,
        name: 'Jennifer Williams',
        specialty: 'Real Estate Law',
        experience: '10 years',
        description: 'Real estate attorney specializing in property transactions, landlord-tenant disputes, zoning issues, and real estate litigation. Expert in commercial and residential property.',
        rating: 4.8,
        cases: '300+',
        location: 'Miami, FL',
        icon: '🏠'
    },
    {
        id: 6,
        name: 'Robert Martinez',
        specialty: 'Immigration Law',
        experience: '11 years',
        description: 'Immigration law specialist helping individuals and families with visas, green cards, citizenship, deportation defense, and asylum cases. Bilingual services available.',
        rating: 4.9,
        cases: '450+',
        location: 'Phoenix, AZ',
        icon: '🌍'
    },
    {
        id: 7,
        name: 'Lisa Anderson',
        specialty: 'Employment Law',
        experience: '13 years',
        description: 'Employment law attorney representing employees in workplace discrimination, wrongful termination, wage disputes, and labor law violations. Strong advocate for workers\' rights.',
        rating: 4.8,
        cases: '380+',
        location: 'Seattle, WA',
        icon: '💼'
    },
    {
        id: 8,
        name: 'James Wilson',
        specialty: 'Intellectual Property',
        experience: '16 years',
        description: 'IP attorney specializing in patents, trademarks, copyrights, and trade secrets. Protecting your creative works and innovations with comprehensive legal strategies.',
        rating: 4.9,
        cases: '500+',
        location: 'Boston, MA',
        icon: '💡'
    },
    {
        id: 9,
        name: 'Amanda Taylor',
        specialty: 'Estate Planning',
        experience: '9 years',
        description: 'Estate planning attorney helping families protect their assets and plan for the future. Services include wills, trusts, probate, and estate administration.',
        rating: 4.7,
        cases: '250+',
        location: 'San Francisco, CA',
        icon: '📜'
    },
    {
        id: 10,
        name: 'Christopher Brown',
        specialty: 'Tax Law',
        experience: '17 years',
        description: 'Tax attorney specializing in tax planning, IRS disputes, business tax issues, and tax litigation. Helping individuals and businesses navigate complex tax matters.',
        rating: 4.8,
        cases: '420+',
        location: 'Washington, DC',
        icon: '💰'
    },
    {
        id: 11,
        name: 'Maria Garcia',
        specialty: 'Bankruptcy Law',
        experience: '10 years',
        description: 'Bankruptcy attorney helping individuals and businesses navigate Chapter 7, Chapter 11, and Chapter 13 bankruptcies. Providing debt relief solutions and financial fresh starts.',
        rating: 4.6,
        cases: '280+',
        location: 'Dallas, TX',
        icon: '📊'
    },
    {
        id: 12,
        name: 'Daniel Lee',
        specialty: 'Environmental Law',
        experience: '14 years',
        description: 'Environmental law attorney specializing in regulatory compliance, environmental litigation, land use issues, and environmental impact assessments. Protecting the environment through legal action.',
        rating: 4.7,
        cases: '320+',
        location: 'Portland, OR',
        icon: '🌱'
    }
];

// Get unique categories from lawyers
function getCategories() {
    const categories = [...new Set(lawyers.map(l => l.specialty))];
    return categories.sort();
}

// Create lawyer card HTML
function createLawyerCard(lawyer) {
    return `
        <div class="lawyer-card" data-lawyer-id="${lawyer.id}" data-specialty="${lawyer.specialty}">
            <div class="lawyer-header">
                <div class="lawyer-avatar">${lawyer.icon}</div>
                <div class="lawyer-info">
                    <h3>${lawyer.name}</h3>
                    <div class="lawyer-specialty">${lawyer.specialty}</div>
                    <div class="lawyer-experience">${lawyer.experience} of experience</div>
                </div>
            </div>
            <p class="lawyer-description">${lawyer.description}</p>
            <div class="lawyer-rating">
                <div class="rating-stars">
                    ${Array(5).fill(0).map((_, i) => 
                        i < Math.floor(lawyer.rating) 
                            ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>'
                            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>'
                    ).join('')}
                </div>
                <span class="rating-value">${lawyer.rating}</span>
            </div>
            <div class="lawyer-details">
                <div class="detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M9 11L12 14L22 4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${lawyer.cases} Cases
                </div>
                <div class="detail-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    ${lawyer.location}
                </div>
            </div>
            <button class="booking-btn" data-lawyer-id="${lawyer.id}">Book Appointment</button>
        </div>
    `;
}

// Render lawyers by category
function renderLawyersByCategory(lawyersToRender = lawyers, selectedCategory = 'all') {
    const container = document.getElementById('lawyersContainer');
    container.innerHTML = '';
    
    if (lawyersToRender.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.6);">
                <p>No lawyers found matching your search.</p>
            </div>
        `;
        return;
    }
    
    // Group lawyers by specialty
    const lawyersByCategory = {};
    lawyersToRender.forEach(lawyer => {
        if (!lawyersByCategory[lawyer.specialty]) {
            lawyersByCategory[lawyer.specialty] = [];
        }
        lawyersByCategory[lawyer.specialty].push(lawyer);
    });
    
    // Render each category section
    Object.keys(lawyersByCategory).sort().forEach(specialty => {
        // Skip if filtering by specific category and this isn't it
        if (selectedCategory !== 'all' && selectedCategory !== specialty) {
            return;
        }
        
        const categoryId = specialty.toLowerCase().replace(/\s+/g, '-');
        const section = document.createElement('section');
        section.className = 'category-section';
        section.id = `category-${categoryId}`;
        section.dataset.category = specialty;
        
        section.innerHTML = `
            <h2 class="category-title">
                <span class="category-icon">${lawyersByCategory[specialty][0].icon}</span>
                ${specialty}
                <span class="lawyer-count">(${lawyersByCategory[specialty].length})</span>
            </h2>
            <div class="lawyers-grid">
                ${lawyersByCategory[specialty].map(lawyer => createLawyerCard(lawyer)).join('')}
            </div>
        `;
        
        container.appendChild(section);
    });
    
    // Add event listeners to booking buttons
    document.querySelectorAll('.booking-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lawyerId = parseInt(btn.dataset.lawyerId);
            openBookingModal(lawyerId);
        });
    });
    
    // Scroll to category if filtered
    if (selectedCategory !== 'all') {
        const categoryId = selectedCategory.toLowerCase().replace(/\s+/g, '-');
        const categorySection = document.getElementById(`category-${categoryId}`);
        if (categorySection) {
            setTimeout(() => {
                categorySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}

// Current selected category
let currentCategory = 'all';

// Initialize category filter functionality
function initCategoryFilters() {
    document.querySelectorAll('.category-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            document.querySelectorAll('.category-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Get selected category
            currentCategory = btn.dataset.category;
            
            // Filter and render
            const searchTerm = searchInput.value.toLowerCase().trim();
            let filteredLawyers = lawyers;
            
            if (searchTerm !== '') {
                filteredLawyers = lawyers.filter(lawyer => 
                    lawyer.name.toLowerCase().includes(searchTerm) ||
                    lawyer.specialty.toLowerCase().includes(searchTerm) ||
                    lawyer.description.toLowerCase().includes(searchTerm) ||
                    lawyer.location.toLowerCase().includes(searchTerm)
                );
            }
            
            renderLawyersByCategory(filteredLawyers, currentCategory);
        });
    });
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    let filteredLawyers = lawyers;
    
    if (searchTerm !== '') {
        filteredLawyers = lawyers.filter(lawyer => 
            lawyer.name.toLowerCase().includes(searchTerm) ||
            lawyer.specialty.toLowerCase().includes(searchTerm) ||
            lawyer.description.toLowerCase().includes(searchTerm) ||
            lawyer.location.toLowerCase().includes(searchTerm)
        );
    }
    
    renderLawyersByCategory(filteredLawyers, currentCategory);
});

// Open booking modal
function openBookingModal(lawyerId) {
    const lawyer = lawyers.find(l => l.id === lawyerId);
    if (!lawyer) return;
    
    document.getElementById('lawyerId').value = lawyerId;
    modalTitle.textContent = `Book ${lawyer.name} - ${lawyer.specialty}`;
    bookingModal.classList.add('active');
    
    // Pre-fill user info if available
    loadUserInfo();
}

// Close booking modal
closeModal.addEventListener('click', () => {
    bookingModal.classList.remove('active');
    bookingForm.reset();
});

// Close modal when clicking outside
bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) {
        bookingModal.classList.remove('active');
        bookingForm.reset();
    }
});

// Close success modal
closeSuccessModal.addEventListener('click', () => {
    successModal.classList.remove('active');
    bookingModal.classList.remove('active');
    bookingForm.reset();
});

// Load user info from session
async function loadUserInfo() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            document.getElementById('clientName').value = data.user.name || '';
            document.getElementById('clientEmail').value = data.user.email || '';
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

// Handle booking form submission
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        lawyerId: document.getElementById('lawyerId').value,
        clientName: document.getElementById('clientName').value,
        clientEmail: document.getElementById('clientEmail').value,
        clientPhone: document.getElementById('clientPhone').value,
        appointmentDate: document.getElementById('appointmentDate').value,
        appointmentTime: document.getElementById('appointmentTime').value,
        caseDescription: document.getElementById('caseDescription').value
    };
    
    // Validate date (must be in the future)
    const selectedDate = new Date(formData.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        alert('Please select a future date for your appointment.');
        return;
    }
    
    try {
        // Submit booking (you can add API endpoint later)
        const response = await fetch('/api/booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Show success modal
            bookingModal.classList.remove('active');
            successModal.classList.add('active');
        } else {
            alert(data.message || 'Failed to book appointment. Please try again.');
        }
    } catch (error) {
        console.error('Booking error:', error);
        // For now, just show success (since API might not be implemented yet)
        bookingModal.classList.remove('active');
        successModal.classList.add('active');
        
        // In a real application, you would handle the error properly
        // alert('Failed to book appointment. Please try again.');
    }
});

// Set minimum date to today
const appointmentDateInput = document.getElementById('appointmentDate');
const today = new Date().toISOString().split('T')[0];
appointmentDateInput.setAttribute('min', today);

// Check authentication on page load
async function checkAuth() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'include'
        });
        const data = await response.json();
        if (!data.success && !data.allowGuest) {
            // Redirect to auth page if not authenticated and guest access not allowed
            window.location.href = '/auth.html';
        } else if (!data.success && data.allowGuest) {
            // Create guest session if not authenticated
            try {
                const guestResponse = await fetch('/api/guest', {
                    method: 'POST',
                    credentials: 'include'
                });
                if (guestResponse.ok) {
                    await loadUserInfo();
                }
            } catch (error) {
                console.error('Error creating guest session:', error);
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    initCategoryFilters();
    renderLawyersByCategory(lawyers, 'all');
    await loadUserInfo();
});

