/**
 * Authentication Handler
 * Handles optional login/signup with guest mode support
 */

// ============================================
// STATE MANAGEMENT
// ============================================

let currentUser = null;
let sessionToken = null;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize authentication state on page load
 */
async function initAuth() {
    console.log('🔐 Initializing authentication...');

    // Check for existing session
    sessionToken = localStorage.getItem('sessionToken');

    if (sessionToken) {
        try {
            const response = await fetch('/api/authentication/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken })
            });

            const data = await response.json();

            if (data.success && data.user) {
                currentUser = data.user;
                updateAuthUI(true);
                console.log('✅ Session valid, user logged in:', currentUser.email);
            } else {
                // Session invalid/expired
                clearSession();
                updateAuthUI(false);
                console.log('⚠️ Session invalid/expired, showing guest mode');
            }
        } catch (error) {
            console.error('❌ Session verification error:', error);
            clearSession();
            updateAuthUI(false);
        }
    } else {
        // No session - guest mode
        updateAuthUI(false);
        console.log('👤 No session found, showing guest mode');
    }
}

// ============================================
// UI UPDATES
// ============================================

/**
 * Update UI based on authentication state
 */
function updateAuthUI(isAuthenticated) {
    const guestView = document.getElementById('guestView');
    const authenticatedView = document.getElementById('authenticatedView');
    const accountTabText = document.getElementById('accountTabText');

    if (isAuthenticated && currentUser) {
        // Show authenticated view
        guestView.style.display = 'none';
        authenticatedView.style.display = 'block';

        // Update account tab text to show user name
        accountTabText.textContent = currentUser.name || 'Account';

        // Populate user info
        document.getElementById('user-email').textContent = currentUser.email || '-';
        document.getElementById('user-name').textContent = currentUser.name || '-';
        document.getElementById('user-id').textContent = currentUser.id || '-';
    } else {
        // Show guest view
        guestView.style.display = 'block';
        authenticatedView.style.display = 'none';
        accountTabText.textContent = 'Account';
    }
}

/**
 * Toggle between signup and login forms
 */
function showAuthForm(formType) {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const authTabs = document.querySelectorAll('.auth-tab');

    // Hide error messages
    document.getElementById('signup-error').style.display = 'none';
    document.getElementById('login-error').style.display = 'none';

    if (formType === 'signup') {
        signupForm.style.display = 'flex';
        loginForm.style.display = 'none';
        authTabs[0].classList.add('active');
        authTabs[1].classList.remove('active');
    } else {
        signupForm.style.display = 'none';
        loginForm.style.display = 'flex';
        authTabs[0].classList.remove('active');
        authTabs[1].classList.add('active');
    }
}

// ============================================
// AUTHENTICATION HANDLERS
// ============================================

/**
 * Handle signup form submission
 */
async function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const errorDiv = document.getElementById('signup-error');

    // Get current userId from localStorage (to upgrade guest account)
    const userId = localStorage.getItem('userId');

    try {
        const response = await fetch('/api/authentication/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                email,
                password,
                name: name || undefined
            })
        });

        const data = await response.json();

        if (data.success) {
            // Store session token
            sessionToken = data.sessionToken;
            localStorage.setItem('sessionToken', sessionToken);
            localStorage.setItem('sessionExpiry', data.sessionExpiry);

            // Update current user
            currentUser = data.user;

            // Update UI
            updateAuthUI(true);

            console.log('✅ Signup successful:', currentUser.email);

            // Refresh data to show under new account
            if (typeof refreshAllData === 'function') {
                refreshAllData();
            }
        } else {
            // Show error
            errorDiv.textContent = data.error || 'Signup failed. Please try again.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Signup error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const response = await fetch('/api/authentication/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store session token
            sessionToken = data.sessionToken;
            localStorage.setItem('sessionToken', sessionToken);
            localStorage.setItem('sessionExpiry', data.sessionExpiry);

            // Update userId to match logged-in user
            localStorage.setItem('userId', data.user.id);

            // Update current user
            currentUser = data.user;

            // Update UI
            updateAuthUI(true);

            console.log('✅ Login successful:', currentUser.email);

            // Refresh data to show user's synced data
            if (typeof refreshAllData === 'function') {
                refreshAllData();
            }
        } else {
            // Show error
            errorDiv.textContent = data.error || 'Login failed. Please check your credentials.';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    if (!sessionToken) return;

    try {
        await fetch('/api/authentication/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
        });

        console.log('✅ Logged out successfully');
    } catch (error) {
        console.error('❌ Logout error:', error);
    }

    // Clear session
    clearSession();

    // Generate new guest userId
    const newUserId = generateUUID();
    localStorage.setItem('userId', newUserId);

    // Update UI
    updateAuthUI(false);

    // Clear all data (user is now a new guest)
    if (typeof refreshAllData === 'function') {
        refreshAllData();
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Clear session data
 */
function clearSession() {
    sessionToken = null;
    currentUser = null;
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionExpiry');
}

/**
 * Get current authenticated user
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!currentUser && !!sessionToken;
}

/**
 * Generate UUID for guest users (fallback if not defined elsewhere)
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================
// AUTO-INITIALIZE
// ============================================

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
