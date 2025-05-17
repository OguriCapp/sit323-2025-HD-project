// API Base URL
// Avoid redeclaring API_BASE_URL variable
if (typeof window.API_BASE_URL === 'undefined') {
    var API_BASE_URL = window.location.origin;
}

// Check if user is authenticated
function checkAuth() {
    fetch(`${API_BASE_URL}/api/auth/status`)
        .then(response => response.json())
        .then(data => {
            if (!data.authenticated) {
                // If not on login or register page, redirect to login
                const currentPath = window.location.pathname;
                if (!currentPath.includes('/auth/') && !currentPath.endsWith('/index.html')) {
                    window.location.href = '/auth/login.html';
                }
            } else {
                // If authenticated and on login/register page, redirect to dashboard
                const currentPath = window.location.pathname;
                if (currentPath.includes('/auth/')) {
                    window.location.href = '/dashboard.html';
                }
                
                // Update user info in UI if on dashboard or other protected pages
                updateUserInfo(data.user);
            }
        })
        .catch(error => {
            console.error('Authentication check failed:', error);
            // Handle error - maybe show notification
        });
}

// Update user info in UI
function updateUserInfo(user) {
    const userNameElement = document.getElementById('userName');
    const userEmailElement = document.getElementById('userEmail');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userNameElement) {
        userNameElement.textContent = user.displayName || 'Deakin User';
    }
    
    if (userEmailElement) {
        userEmailElement.textContent = user.email;
    }
    
    if (userAvatarElement) {
        if (user.photoURL) {
            userAvatarElement.src = user.photoURL;
        } else {
            // Generate avatar from name
            const name = user.displayName || user.email.split('@')[0];
            userAvatarElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2e7d32&color=fff`;
        }
    }
}

// Handle login form submission
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect to dashboard on successful login
                    window.location.href = '/dashboard.html';
                } else {
                    // Show error message
                    alert(data.message || 'Login failed. Please check your credentials.');
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                alert('An error occurred during login. Please try again.');
            });
        });
    }
}

// Handle register form submission
function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const course = document.getElementById('course').value;
            
            // Validate password match
            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }
            
            fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fullName, email, password, course })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect to login page with success message
                    window.location.href = `/auth/login.html?registered=true&email=${encodeURIComponent(email)}`;
                } else {
                    // Show error message
                    alert(data.message || 'Registration failed. Please try again.');
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                alert('An error occurred during registration. Please try again.');
            });
        });
    }
}

// Handle logout
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(event) {
            event.preventDefault();
            
            fetch(`${API_BASE_URL}/api/auth/logout`)
                .then(response => response.json())
                .then(data => {
                    // Redirect to login page
                    window.location.href = '/auth/login.html?logout=true';
                })
                .catch(error => {
                    console.error('Logout error:', error);
                    // Still redirect to login page even if error occurs
                    window.location.href = '/auth/login.html';
                });
        });
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    checkAuth();
    
    // Setup forms and buttons
    setupLoginForm();
    setupRegisterForm();
    setupLogout();
    
    // If on login page with registered=true parameter, show success message
    if (window.location.pathname.includes('/auth/login.html') && window.location.search.includes('registered=true')) {
        const email = new URLSearchParams(window.location.search).get('email');
        alert(`Registration successful! Please log in with your email: ${email}`);
    }
    
    // If on login page with logout=true parameter, show logout message
    if (window.location.pathname.includes('/auth/login.html') && window.location.search.includes('logout=true')) {
        alert('You have been successfully logged out.');
    }
}); 