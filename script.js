// Header hide/show on scroll
let lastScrollTop = 0;
let scrollTimeout;

function handleHeaderScroll() {
    const header = document.querySelector('.header');
    if (!header) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Clear any existing timeout
    clearTimeout(scrollTimeout);
    
    if (scrollTop > 100) { // Only hide after scrolling past 100px
        if (scrollTop > lastScrollTop) {
            // Scrolling down - hide header
            header.classList.add('hidden');
        } else {
            // Scrolling up - show header
            header.classList.remove('hidden');
        }
    } else {
        // Near top - always show header
        header.classList.remove('hidden');
    }
    
    lastScrollTop = scrollTop;
    
    // Show header after scrolling stops
    scrollTimeout = setTimeout(() => {
        header.classList.remove('hidden');
    }, 1500);
}

// Smooth scroll functionality
function smoothScrollTo(targetId) {
    // Ensure targetId starts with #
    if (!targetId.startsWith('#')) {
        targetId = '#' + targetId;
    }
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
        const header = document.querySelector('.header');
        const headerHeight = header ? header.offsetHeight : 80;
        const targetPosition = targetElement.offsetTop - headerHeight;
        
        window.scrollTo({
            top: Math.max(0, targetPosition), // Ensure we don't scroll to negative position
            behavior: 'smooth'
        });
    } else {
        console.warn('Section not found:', targetId);
    }
}

// Update active nav link on scroll
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    const scrollPosition = window.scrollY + 100; // Offset for header

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// Button to section mapping
const buttonSectionMap = {
    'home': '#home',
    'about': '#about',
    'products': '#products',
    'socials': '#socials',
    'download': '#products',
    'download app': '#products'
};

// Initialize all button scroll functionality
function initButtonScrolls() {
    // Logo click handler - scroll to home
    const logo = document.querySelector('.logo');
    if (logo && !logo.hasAttribute('data-scroll-initialized')) {
        logo.setAttribute('data-scroll-initialized', 'true');
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            smoothScrollTo('#home');
        });
        logo.style.cursor = 'pointer';
    }

    // Navigation links - scroll to sections (works for both desktop and mobile)
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        // Skip if already initialized
        if (link.hasAttribute('data-scroll-initialized')) return;
        link.setAttribute('data-scroll-initialized', 'true');
        
        // Add click handler
        link.addEventListener('click', function(e) {
            e.preventDefault();
            let targetId = this.getAttribute('href');
            
            // If href is empty or invalid, try to get from text content
            if (!targetId || targetId === '#') {
                const linkText = this.textContent.trim().toLowerCase();
                targetId = buttonSectionMap[linkText] || `#${linkText}`;
            }
            
            // Validate target exists
            if (!targetId || !targetId.startsWith('#')) return;
            
            // Close mobile menu if open
            const mobileMenuToggle = document.getElementById('mobileMenuToggle');
            const navBar = document.getElementById('navBar');
            if (mobileMenuToggle && navBar && navBar.classList.contains('active')) {
                mobileMenuToggle.classList.remove('active');
                navBar.classList.remove('active');
                document.body.style.overflow = '';
            }
            
            // Scroll to section
            smoothScrollTo(targetId);
        });
    });

    // Download App buttons - scroll to products section
    const downloadButtons = document.querySelectorAll('.btn-primary, .btn-header');
    downloadButtons.forEach(button => {
        if (button.hasAttribute('data-scroll-initialized')) return;
        button.setAttribute('data-scroll-initialized', 'true');
        
        const buttonText = button.textContent.trim().toLowerCase();
        if (buttonText.includes('download')) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                smoothScrollTo('#products');
            });
        }
    });

    // About cards - if clicked, scroll to about section (optional enhancement)
    const aboutCards = document.querySelectorAll('.about-card');
    aboutCards.forEach(card => {
        if (card.hasAttribute('data-scroll-initialized')) return;
        card.setAttribute('data-scroll-initialized', 'true');
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Only scroll if clicking on the card itself, not on links inside
            if (e.target.tagName !== 'A' && !e.target.closest('a')) {
                smoothScrollTo('#about');
            }
        });
    });

    // Product cards - if clicked, scroll to products section (optional enhancement)
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        if (card.hasAttribute('data-scroll-initialized')) return;
        card.setAttribute('data-scroll-initialized', 'true');
    });

    // Social cards - if clicked, scroll to socials section (optional enhancement)
    const socialCards = document.querySelectorAll('.social-card');
    socialCards.forEach(card => {
        if (card.hasAttribute('data-scroll-initialized')) return;
        card.setAttribute('data-scroll-initialized', 'true');
    });
}

// Mobile menu toggle functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navBar = document.getElementById('navBar');

if (mobileMenuToggle && navBar) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navBar.classList.toggle('active');
        document.body.style.overflow = navBar.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navBar.classList.contains('active') && 
            !navBar.contains(e.target) && 
            !mobileMenuToggle.contains(e.target)) {
            mobileMenuToggle.classList.remove('active');
            navBar.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // Close menu on window resize if it becomes desktop view
    window.addEventListener('resize', () => {
        if (window.innerWidth > 968) {
            mobileMenuToggle.classList.remove('active');
            navBar.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// Update active nav link on scroll and handle header visibility
window.addEventListener('scroll', () => {
    updateActiveNavLink();
    handleHeaderScroll();
});

// Initialize immediately and on page load
function initializePage() {
    // Initialize all button scrolls
    initButtonScrolls();
    
    // Update active nav link
    updateActiveNavLink();
    
    // Handle hash in URL
    if (window.location.hash) {
        setTimeout(() => {
            smoothScrollTo(window.location.hash);
        }, 100);
    }
}

// Initialize on DOMContentLoaded (runs earlier than load)
document.addEventListener('DOMContentLoaded', initializePage);

// Also initialize on load as fallback
window.addEventListener('load', initializePage);

// Initialize immediately if DOM is already loaded (for scripts loaded after DOM)
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
} else {
    // DOM is already loaded, initialize immediately
    initializePage();
}

// Detect mobile device for performance optimization
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

function getDeviceType() {
    const width = window.innerWidth;
    return {
        isMobile: isMobileDevice || width <= 640,
        isTablet: width <= 968 && width > 640,
        isSmallMobile: width <= 480
    };
}

// Background canvas animation with circuit board pattern
const canvas = document.getElementById('background-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', () => {
    resizeCanvas();
    createNodes();
    createConnections();
});

// Circuit board pattern generation
class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.connections = [];
    }
}

const nodes = [];
const connections = [];
const lineColor = '#66B2FF';
const nodeColor = '#66B2FF';

// Performance optimization: adjust spacing and complexity based on device
function getSpacing() {
    const device = getDeviceType();
    if (device.isSmallMobile) return 100;
    if (device.isMobile || device.isTablet) return 90;
    return 80;
}

function getMaxDistance() {
    const device = getDeviceType();
    if (device.isSmallMobile) return 140;
    if (device.isMobile || device.isTablet) return 130;
    return 120;
}

function getConnectionProbability() {
    const device = getDeviceType();
    if (device.isMobile) return 0.75; // Fewer connections on mobile
    return 0.7;
}

function getNodeRadius() {
    const device = getDeviceType();
    return device.isMobile ? 2 : 3;
}

// Create nodes in a grid pattern with some randomness
function createNodes() {
    nodes.length = 0;
    const spacing = getSpacing();
    const cols = Math.ceil(canvas.width / spacing) + 2;
    const rows = Math.ceil(canvas.height / spacing) + 2;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * spacing + (Math.random() * 20 - 10);
            const y = row * spacing + (Math.random() * 20 - 10);
            nodes.push(new Node(x, y));
        }
    }
}

// Create connections between nearby nodes
function createConnections() {
    connections.length = 0;
    const maxDistance = getMaxDistance();
    const connectionProb = getConnectionProbability();
    
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < maxDistance && Math.random() > connectionProb) {
                connections.push({
                    from: nodes[i],
                    to: nodes[j],
                    opacity: 0.15 + Math.random() * 0.25
                });
            }
        }
    }
}

// Draw the circuit pattern
function drawCircuit() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const device = getDeviceType();
    const nodeRadius = getNodeRadius();
    
    // Draw connections
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = device.isMobile ? 0.8 : 1;
    connections.forEach(conn => {
        ctx.globalAlpha = conn.opacity;
        ctx.beginPath();
        ctx.moveTo(conn.from.x, conn.from.y);
        ctx.lineTo(conn.to.x, conn.to.y);
        ctx.stroke();
    });
    
    // Draw nodes
    ctx.fillStyle = nodeColor;
    ctx.globalAlpha = device.isMobile ? 0.5 : 0.6;
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.globalAlpha = 1;
}

// Animate with subtle movement (reduce animation on mobile for performance)
let time = 0;
let animationFrameId;
let lastTime = 0;

function getTargetFPS() {
    const device = getDeviceType();
    return device.isMobile ? 30 : 60;
}

function animate(currentTime) {
    const device = getDeviceType();
    const frameInterval = 1000 / getTargetFPS();
    
    if (currentTime - lastTime >= frameInterval) {
        time += device.isMobile ? 0.003 : 0.005;
        
        // Reduced animation on mobile
        if (!device.isMobile) {
            nodes.forEach((node, index) => {
                const offsetX = Math.sin(time + index * 0.1) * 0.5;
                const offsetY = Math.cos(time + index * 0.1) * 0.5;
                node.displayX = node.x + offsetX;
                node.displayY = node.y + offsetY;
            });
        }
        
        drawCircuit();
        lastTime = currentTime;
    }
    
    animationFrameId = requestAnimationFrame(animate);
}

// Initialize
createNodes();
createConnections();
drawCircuit();
animate(0);

// Pause animation when page is not visible (performance optimization)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    } else {
        animate(0);
    }
});

