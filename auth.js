// Background canvas animation (same as main page)
const canvas = document.getElementById('background-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

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
    if (device.isMobile) return 0.75;
    return 0.7;
}

function getNodeRadius() {
    const device = getDeviceType();
    return device.isMobile ? 2 : 3;
}

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

function drawCircuit() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const device = getDeviceType();
    const nodeRadius = getNodeRadius();
    
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = device.isMobile ? 0.8 : 1;
    connections.forEach(conn => {
        ctx.globalAlpha = conn.opacity;
        ctx.beginPath();
        ctx.moveTo(conn.from.x, conn.from.y);
        ctx.lineTo(conn.to.x, conn.to.y);
        ctx.stroke();
    });
    
    ctx.fillStyle = nodeColor;
    ctx.globalAlpha = device.isMobile ? 0.5 : 0.6;
    nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.globalAlpha = 1;
}

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

createNodes();
createConnections();
drawCircuit();
animate(0);

window.addEventListener('resize', () => {
    resizeCanvas();
    createNodes();
    createConnections();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    } else {
        animate(0);
    }
});

// Form switching functionality with smooth animations
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const switchLinks = document.querySelectorAll('.switch-form');
const authCard = document.getElementById('authCard');

let isAnimating = false;

function switchForm(targetForm) {
    if (isAnimating) return;
    
    isAnimating = true;
    const currentForm = signInForm.classList.contains('active') ? signInForm : signUpForm;
    const newForm = targetForm === 'signin' ? signInForm : signUpForm;
    
    // If clicking on the same form, do nothing
    if (currentForm === newForm) {
        isAnimating = false;
        return;
    }
    
    // Determine slide direction based on which form is active
    const isGoingToSignIn = targetForm === 'signin';
    const slideOutClass = isGoingToSignIn ? 'slide-out-right' : 'slide-out-left';
    
    // Step 1: Slide out current form
    currentForm.classList.add(slideOutClass);
    currentForm.classList.remove('active');
    
    // Step 2: Prepare new form for entrance
    newForm.classList.remove('slide-out-left', 'slide-out-right', 'active');
    newForm.style.position = 'absolute';
    newForm.style.top = '0';
    newForm.style.left = '0';
    newForm.style.width = '100%';
    newForm.style.transform = isGoingToSignIn ? 'translateX(-100px)' : 'translateX(100px)';
    newForm.style.opacity = '0';
    newForm.style.pointerEvents = 'none';
    
    // Step 3: After slide out completes, change form positions and slide in new form
    setTimeout(() => {
        // Reset current form
        currentForm.style.position = 'absolute';
        currentForm.style.pointerEvents = 'none';
        currentForm.classList.remove(slideOutClass);
        currentForm.style.transform = '';
        currentForm.style.opacity = '0';
        
        // Make new form active and visible
        newForm.style.position = 'relative';
        newForm.classList.add('active');
        
        // Force reflow to ensure styles are applied
        void newForm.offsetHeight;
        
        // Step 4: Animate new form sliding in
        requestAnimationFrame(() => {
            newForm.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            newForm.style.transform = 'translateX(0)';
            newForm.style.opacity = '1';
            newForm.style.pointerEvents = 'all';
            
            // Step 5: Clean up after animation completes
            setTimeout(() => {
                newForm.style.transition = '';
                newForm.style.transform = '';
                newForm.style.opacity = '';
                isAnimating = false;
            }, 600);
        });
    }, 300);
}

// Add event listeners to switch links
switchLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetForm = link.getAttribute('data-form');
        switchForm(targetForm);
    });
});

// Form submission handlers
const signInFormElement = document.getElementById('signInFormElement');
const signUpFormElement = document.getElementById('signUpFormElement');

// Show loading state
function setLoading(form, isLoading) {
    const submitBtn = form.querySelector('.btn-submit');
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn === signInFormElement.querySelector('.btn-submit') ? 'Sign In' : 'Sign Up';
    }
}

// Show error message
function showError(message) {
    // Remove existing error message
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = 'background: rgba(255, 0, 0, 0.1); border: 1px solid rgba(255, 0, 0, 0.3); color: #ff6b6b; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center;';
    errorDiv.textContent = message;

    // Insert error message at the top of the form
    const formContent = document.querySelector('.auth-form.active .form-content');
    if (formContent) {
        formContent.insertBefore(errorDiv, formContent.firstChild);
    }

    // Remove error after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.cssText = 'background: rgba(0, 255, 0, 0.1); border: 1px solid rgba(0, 255, 0, 0.3); color: #51cf66; padding: 12px; border-radius: 8px; margin-bottom: 20px; text-align: center;';
    successDiv.textContent = message;

    const formContent = document.querySelector('.auth-form.active .form-content');
    if (formContent) {
        formContent.insertBefore(successDiv, formContent.firstChild);
    }

    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Sign In form submission
if (signInFormElement) {
    signInFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('signInEmail').value;
        const password = document.getElementById('signInPassword').value;
        const submitBtn = signInFormElement.querySelector('.btn-submit');
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server did not return JSON response');
            }

            const data = await response.json();

            if (data.success) {
                showSuccess('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } else {
                showError(data.message || 'Login failed. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        } catch (error) {
            console.error('Sign in error:', error);
            let errorMessage = 'Network error. Please check your connection and make sure the server is running.';
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please make sure the server is running on http://localhost:3000';
            } else if (error.message.includes('HTTP error')) {
                errorMessage = 'Server error. Please try again later.';
            }
            showError(errorMessage);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });
}

// Sign Up form submission
if (signUpFormElement) {
    signUpFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signUpName').value;
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;
        const confirmPassword = document.getElementById('signUpConfirmPassword').value;
        const submitBtn = signUpFormElement.querySelector('.btn-submit');
        
        // Client-side validation
        if (password !== confirmPassword) {
            showError('Passwords do not match!');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters long!');
            return;
        }
        
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ name, email, password, confirmPassword })
            });

            // Check if response is ok
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server did not return JSON response');
            }

            const data = await response.json();

            if (data.success) {
                showSuccess('Registration successful! Redirecting to dashboard...');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } else {
                showError(data.message || 'Registration failed. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        } catch (error) {
            console.error('Sign up error:', error);
            let errorMessage = 'Network error. Please check your connection and make sure the server is running.';
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Cannot connect to server. Please make sure the server is running on http://localhost:3000';
            } else if (error.message.includes('HTTP error')) {
                errorMessage = 'Server error. Please try again later.';
            }
            showError(errorMessage);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    });
}

// Skip button functionality
const skipButton = document.getElementById('skipButton');
if (skipButton) {
    skipButton.addEventListener('click', async () => {
        try {
            // Create a guest session
            const response = await fetch('/api/guest', {
                method: 'POST',
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                // Redirect to dashboard
                window.location.href = '/dashboard.html';
            } else {
                // If guest endpoint doesn't work, try to access dashboard directly
                window.location.href = '/dashboard.html';
            }
        } catch (error) {
            console.error('Skip error:', error);
            // Redirect to dashboard anyway
            window.location.href = '/dashboard.html';
        }
    });
}

