// Mobile menu toggle functionality
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navBar = document.getElementById('navBar');

if (mobileMenuToggle && navBar) {
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        navBar.classList.toggle('active');
        document.body.style.overflow = navBar.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking on a nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenuToggle.classList.remove('active');
            navBar.classList.remove('active');
            document.body.style.overflow = '';
        });
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

