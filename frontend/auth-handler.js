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

    // Use stored user info to keep user "signed in" in the UI between reloads
    const storedUserEmail = localStorage.getItem('userEmail');
    const storedUserName = localStorage.getItem('userName');
    const storedUserId = localStorage.getItem('userId');
    if (storedUserEmail) {
        currentUser = {
            email: storedUserEmail,
            name: storedUserName,
            id: storedUserId
        };
    }

    if (sessionToken) {
        // Optimistically render as logged in while we re-verify in the background
        if (currentUser) {
            updateAuthUI(true);
        }

        try {
            const response = await fetch('/api/authentication/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken })
            });

            if (response.status === 401 || response.status === 403) {
                clearSession();
                updateAuthUI(false);
                console.log('⚠️ Session invalid/expired, showing guest mode');
                return;
            }

            if (!response.ok) {
                console.warn('⚠️ Session verification failed (server error), keeping session token to retry later:', response.status);
                return;
            }

            const data = await response.json();

            if (data.success && data.user) {
                currentUser = data.user;
                if (data.sessionExpiry) {
                    localStorage.setItem('sessionExpiry', data.sessionExpiry);
                }
                updateAuthUI(true);
                console.log('✅ Session valid, user logged in:', currentUser.email);
            } else {
                // Only clear when the backend explicitly says the session is bad
                clearSession();
                updateAuthUI(false);
                console.log('⚠️ Session invalid/expired, showing guest mode');
            }
        } catch (error) {
            // Network/transient error: keep the session so the user isn't logged out unexpectedly
            console.warn('❌ Session verification error (kept sessionToken):', error);
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
    const signupForm = document.getElementById('signupFormModal');
    const loginForm = document.getElementById('loginFormModal');
    const authTabs = document.querySelectorAll('.auth-tab');

    // Hide error messages
    const signupError = document.getElementById('signup-error-modal');
    const loginError = document.getElementById('login-error-modal');
    if (signupError) signupError.style.display = 'none';
    if (loginError) loginError.style.display = 'none';

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

    const firstNameInput = document.getElementById('signup-first-name');
    const lastNameInput = document.getElementById('signup-last-name');
    const sportInput = document.getElementById('signup-sport');
    const legacyNameInput = document.getElementById('signup-name-modal');

    const firstName = firstNameInput ? firstNameInput.value.trim() : '';
    const lastName = lastNameInput ? lastNameInput.value.trim() : '';
    const sport = sportInput ? sportInput.value : '';
    const legacyName = legacyNameInput ? legacyNameInput.value.trim() : '';
    const email = document.getElementById('signup-email-modal').value.trim();
    const password = document.getElementById('signup-password-modal').value;
    const displayName = legacyName || [firstName, lastName].filter(Boolean).join(' ').trim();
    const errorDiv = document.getElementById('signup-error-modal');

    // Validate inputs
    if (!displayName || !email || !password) {
        errorDiv.textContent = 'First name, last name, email, and password are required';
        errorDiv.style.display = 'block';
        return;
    }

    if (password.length < 8) {
        errorDiv.textContent = 'Password must be at least 8 characters';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.backend}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                name: displayName,
                role: 'athlete',
                firstName: firstName || null,
                lastName: lastName || null,
                sport: sport || null
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store session token and user data
            sessionToken = data.sessionToken;
            localStorage.setItem('sessionToken', sessionToken);
            localStorage.setItem('sessionExpiry', data.sessionExpiry);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userEmail', data.user.email);
            if (data.user.name) localStorage.setItem('userName', data.user.name);
            // Prompt reconnect so guest tokens are rebound to this account
            localStorage.setItem('reconnectPromptPending', '1');

            // Update current user
            currentUser = data.user;

            // Close modal and update UI
            if (typeof closeAuthModal === 'function') {
                closeAuthModal();
            }
            if (typeof checkAuthenticationStatus === 'function') {
                checkAuthenticationStatus();
            }

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

    const email = document.getElementById('login-email-modal').value.trim();
    const password = document.getElementById('login-password-modal').value;
    const errorDiv = document.getElementById('login-error-modal');

    // Validate inputs
    if (!email || !password) {
        errorDiv.textContent = 'Email and password are required';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.backend}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store session token and user data
            sessionToken = data.sessionToken;
            localStorage.setItem('sessionToken', sessionToken);
            localStorage.setItem('sessionExpiry', data.sessionExpiry);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userEmail', data.user.email);
            if (data.user.name) localStorage.setItem('userName', data.user.name);

            // Update current user
            currentUser = data.user;

            // Close modal and update UI
            if (typeof closeAuthModal === 'function') {
                closeAuthModal();
            }
            if (typeof checkAuthenticationStatus === 'function') {
                checkAuthenticationStatus();
            }

            console.log('✅ Login successful:', currentUser.email);

            // Refresh data to show user's synced data
            if (typeof refreshAllData === 'function') {
                refreshAllData();
            }
            if (typeof loadExistingConnections === 'function') {
                await loadExistingConnections();
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
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
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
