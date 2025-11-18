// Whoop OAuth 2.0 with PKCE Implementation
class WhoopOAuth2 {
    constructor(config = {}) {
        this.clientId = config.clientId || '31c6c2ac-890c-46ef-81da-b961c1cb1ca7';
        this.clientSecret = config.clientSecret || '45080f98c58c1aad56f6e0076b014e3dc58356f4763efaf3df2307057ce4b14f';
        this.redirectUri = config.redirectUri || 'https://www.athlytx.com';
        this.scope = config.scope || 'read:profile read:workout read:recovery read:sleep read:cycles';

        // Storage for PKCE values
        this.codeVerifier = null;
        this.state = null;
    }

    // Generate random string for PKCE
    generateRandomString(length = 32) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }

    // Generate SHA256 hash and base64url encode
    async sha256(plain) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return this.base64urlEncode(new Uint8Array(hash));
    }

    // Base64url encode (without padding)
    base64urlEncode(buffer) {
        const base64 = btoa(String.fromCharCode.apply(null, buffer));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    // Generate PKCE code verifier and challenge
    async generatePKCE() {
        this.codeVerifier = this.generateRandomString(128);
        // Store code verifier in sessionStorage for token exchange
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('whoop_code_verifier', this.codeVerifier);
        }
        const codeChallenge = await this.sha256(this.codeVerifier);
        return {
            codeVerifier: this.codeVerifier,
            codeChallenge
        };
    }

    // Get stored code verifier
    getStoredCodeVerifier() {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem('whoop_code_verifier');
        }
        return this.codeVerifier;
    }

    // Generate state parameter for CSRF protection
    generateState() {
        this.state = 'whoop_' + this.generateRandomString(28);
        // Store state in sessionStorage for callback verification
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('whoop_oauth_state', this.state);
        }
        return this.state;
    }

    // Get stored state parameter
    getStoredState() {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem('whoop_oauth_state');
        }
        return this.state;
    }

    // Build authorization URL
    async buildAuthorizationUrl() {
        const { codeChallenge } = await this.generatePKCE();
        const state = this.generateState();

        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: this.scope,
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        return `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(authorizationCode, receivedState) {
        // Verify state parameter for CSRF protection
        const storedState = this.getStoredState();
        if (receivedState !== storedState) {
            throw new Error(`Invalid state parameter. Expected: ${storedState}, Received: ${receivedState}. Possible CSRF attack.`);
        }

        const codeVerifier = this.getStoredCodeVerifier();
        if (!codeVerifier) {
            throw new Error('Code verifier not found. Please initiate authorization first.');
        }

        try {
            console.log('🔄 Starting token exchange with backend...');
            console.log('Backend URL:', 'https://athlytx-backend-production.up.railway.app/api/whoop/token');

            // Use backend API for token exchange (same pattern as Garmin/Strava/Oura)
            const userId = localStorage.getItem('userId');
            const response = await fetch('https://athlytx-backend-production.up.railway.app/api/whoop/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: authorizationCode,
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    redirect_uri: this.redirectUri,
                    code_verifier: codeVerifier,
                    userId: userId  // CRITICAL: Required for database persistence
                })
            });

            console.log('📡 Backend response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('❌ Backend error:', response.status, errorData);
                throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('✅ Token exchange successful:', data);

            // Clean up stored OAuth data after successful token exchange
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('whoop_oauth_state');
                sessionStorage.removeItem('whoop_code_verifier');
            }

            return data;
        } catch (error) {
            throw new Error(`Token exchange error: ${error.message}`);
        }
    }

    // Refresh access token
    async refreshToken(refreshToken) {
        try {
            const response = await fetch('https://athlytx-backend-production.up.railway.app/api/whoop/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh_token: refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`Token refresh failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            throw new Error(`Token refresh error: ${error.message}`);
        }
    }

    // Make authenticated API call
    async apiCall(endpoint, accessToken, options = {}) {
        const url = `https://api.prod.whoop.com/developer${endpoint}`;

        const fetchOptions = {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API call failed: ${response.status} ${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            throw new Error(`API call error: ${error.message}`);
        }
    }

    // Get user profile (test API call)
    async getUserProfile(accessToken) {
        return this.apiCall('/v1/user/profile/basic', accessToken);
    }

    // Get user workouts
    async getUserWorkouts(accessToken, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);

        const endpoint = `/v1/activity/workout${params.toString() ? '?' + params.toString() : ''}`;
        return this.apiCall(endpoint, accessToken);
    }

    // Get user recovery data
    async getUserRecovery(accessToken, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);

        const endpoint = `/v1/recovery${params.toString() ? '?' + params.toString() : ''}`;
        return this.apiCall(endpoint, accessToken);
    }

    // Get user sleep data
    async getUserSleep(accessToken, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);

        const endpoint = `/v1/activity/sleep${params.toString() ? '?' + params.toString() : ''}`;
        return this.apiCall(endpoint, accessToken);
    }

    // Get user cycles
    async getUserCycles(accessToken, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start', startDate);
        if (endDate) params.append('end', endDate);

        const endpoint = `/v1/cycle${params.toString() ? '?' + params.toString() : ''}`;
        return this.apiCall(endpoint, accessToken);
    }

    // Store tokens securely (implement based on your storage solution)
    storeTokens(tokens) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('whoop_access_token', tokens.access_token);
            if (tokens.refresh_token) {
                localStorage.setItem('whoop_refresh_token', tokens.refresh_token);
            }
            if (tokens.expires_in) {
                const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
                localStorage.setItem('whoop_token_expires_at', expiresAt.toISOString());
            }
        }
    }

    // Retrieve stored tokens
    getStoredTokens() {
        if (typeof localStorage === 'undefined') return null;

        const accessToken = localStorage.getItem('whoop_access_token');
        const refreshToken = localStorage.getItem('whoop_refresh_token');
        const expiresAt = localStorage.getItem('whoop_token_expires_at');

        if (!accessToken) return null;

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt ? new Date(expiresAt) : null
        };
    }

    // Check if token is expired
    isTokenExpired() {
        const tokens = this.getStoredTokens();
        if (!tokens || !tokens.expires_at) return true;

        return new Date() >= tokens.expires_at;
    }

    // Clear stored tokens
    clearTokens() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('whoop_access_token');
            localStorage.removeItem('whoop_refresh_token');
            localStorage.removeItem('whoop_token_expires_at');
        }
    }
}

// Usage example for browser environment
async function initializeWhoopAuth() {
    const whoopAuth = new WhoopOAuth2({
        clientId: '31c6c2ac-890c-46ef-81da-b961c1cb1ca7',
        clientSecret: '45080f98c58c1aad56f6e0076b014e3dc58356f4763efaf3df2307057ce4b14f',
        redirectUri: 'https://www.athlytx.com',
        scope: 'read:profile read:workout read:recovery read:sleep read:cycles'
    });

    // Check if we're handling a callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
        console.error('OAuth error:', error);
        return;
    }

    if (code && state) {
        try {
            // Exchange code for tokens
            const tokens = await whoopAuth.exchangeCodeForToken(code, state);
            whoopAuth.storeTokens(tokens);

            // Test API call
            const profile = await whoopAuth.getUserProfile(tokens.access_token);
            console.log('User profile:', profile);

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);

        } catch (error) {
            console.error('Token exchange failed:', error);
        }
    } else {
        // Check for existing tokens
        const existingTokens = whoopAuth.getStoredTokens();

        if (existingTokens && !whoopAuth.isTokenExpired()) {
            console.log('Using existing tokens');
            try {
                const profile = await whoopAuth.getUserProfile(existingTokens.access_token);
                console.log('User profile:', profile);
            } catch (error) {
                console.error('API call with existing token failed:', error);
                whoopAuth.clearTokens();
            }
        }
    }

    return whoopAuth;
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhoopOAuth2;
} else if (typeof window !== 'undefined') {
    window.WhoopOAuth2 = WhoopOAuth2;
    window.initializeWhoopAuth = initializeWhoopAuth;
}