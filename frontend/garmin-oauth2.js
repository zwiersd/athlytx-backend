// Garmin OAuth 2.0 with PKCE Implementation
class GarminOAuth2 {
    constructor(config = {}) {
        // PRODUCTION Garmin app (correct ID)
        this.clientId = config.clientId || '4af31e5c-d758-442d-a007-809ea45f444a';
        this.clientSecret = config.clientSecret;
        this.redirectUri = config.redirectUri || 'https://www.athlytx.com/auth/garmin/callback';
        // Request all wellness scopes for complete data access
        this.scope = config.scope || 'ACTIVITY_EXPORT HEALTH_EXPORT';

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
        const codeChallenge = await this.sha256(this.codeVerifier);
        // Persist across redirect - use both storage types for reliability
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('garmin_code_verifier', this.codeVerifier);
            }
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('garmin_code_verifier', this.codeVerifier);
            }
        } catch (e) {
            // no-op if storage unavailable
        }
        return {
            codeVerifier: this.codeVerifier,
            codeChallenge
        };
    }

    // Generate state parameter for CSRF protection
    generateState() {
        this.state = 'garmin_auth';
        // Store state in sessionStorage for callback verification
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('garmin_oauth_state', this.state);
        }
        return this.state;
    }

    // Get stored state parameter
    getStoredState() {
        if (typeof sessionStorage !== 'undefined') {
            return sessionStorage.getItem('garmin_oauth_state');
        }
        return this.state;
    }

    // Get stored PKCE code_verifier
    getStoredCodeVerifier() {
        // Try localStorage first (more reliable across redirects)
        if (typeof localStorage !== 'undefined') {
            const verifier = localStorage.getItem('garmin_code_verifier');
            if (verifier) return verifier;
        }
        // Fallback to sessionStorage
        if (typeof sessionStorage !== 'undefined') {
            const verifier = sessionStorage.getItem('garmin_code_verifier');
            if (verifier) return verifier;
        }
        return this.codeVerifier;
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

        // Authorization endpoint per Garmin guidance (Confirm page)
        return `https://connect.garmin.com/oauth2Confirm?${params.toString()}`;
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(authorizationCode, receivedState) {
        // Verify state parameter for CSRF protection (supports post-redirect retrieval)
        const expectedState = this.state || this.getStoredState();

        console.log('State validation:', {
            receivedState: receivedState,
            expectedState: expectedState,
            instanceState: this.state,
            storedState: this.getStoredState()
        });

        // More flexible state validation - allow if either instance state or stored state matches
        if (expectedState && receivedState !== expectedState) {
            console.error('State mismatch:', { expected: expectedState, received: receivedState });
            throw new Error('Invalid state parameter. Possible CSRF or stale session.');
        }

        // If no expected state found, check if received state follows our pattern
        if (!expectedState && (!receivedState || !receivedState.startsWith('garmin_'))) {
            console.error('No valid state found:', { expectedState, receivedState });
            throw new Error('Invalid state parameter. Please restart the authorization process.');
        }

        const verifier = this.codeVerifier || this.getStoredCodeVerifier();
        if (!verifier) {
            throw new Error('Code verifier not found. Start Garmin authorization again.');
        }

        try {
            // **CRITICAL:** Get userId from localStorage for database persistence
            const userId = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null;

            // Use backend API for token exchange (same pattern as Whoop)
            const response = await fetch('/api/garmin/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: authorizationCode,
                    client_id: this.clientId,
                    redirect_uri: this.redirectUri,
                    code_verifier: verifier,
                    userId: userId  // CRITICAL: Required for database persistence
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`Backend error: ${response.status} - ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            this.cleanupPkce();
            return data;
        } catch (error) {
            throw new Error(`Token exchange error: ${error.message}`);
        }
    }

    // Clean PKCE artifacts after successful exchange
    cleanupPkce() {
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('garmin_code_verifier');
                sessionStorage.removeItem('garmin_oauth_state');
            }
        } catch (e) {
            // ignore
        }
        this.codeVerifier = null;
        this.state = null;
    }

    // Refresh access token
    async refreshToken(refreshToken) {
        try {
            const response = await fetch('/api/garmin/refresh', {
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
        const url = `https://apis.garmin.com${endpoint}`;

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

    // Get user permissions (test API call)
    async getUserPermissions(accessToken) {
        return this.apiCall('/wellness-api/rest/user/permissions', accessToken);
    }

    // Store tokens securely (implement based on your storage solution)
    storeTokens(tokens) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('garmin_access_token', tokens.access_token);
            if (tokens.refresh_token) {
                localStorage.setItem('garmin_refresh_token', tokens.refresh_token);
            }
            if (tokens.expires_in) {
                const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
                localStorage.setItem('garmin_token_expires_at', expiresAt.toISOString());
            }
        }
    }

    // Retrieve stored tokens
    getStoredTokens() {
        if (typeof localStorage === 'undefined') return null;

        const accessToken = localStorage.getItem('garmin_access_token');
        const refreshToken = localStorage.getItem('garmin_refresh_token');
        const expiresAt = localStorage.getItem('garmin_token_expires_at');

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
            localStorage.removeItem('garmin_access_token');
            localStorage.removeItem('garmin_refresh_token');
            localStorage.removeItem('garmin_token_expires_at');
        }
    }
}

// Usage example for browser environment
async function initializeGarminAuth() {
    const garminAuth = new GarminOAuth2({
        clientId: '4af31e5c-d758-442d-a007-809ea45f444a',
        clientSecret: 'YOUR_CLIENT_SECRET', // Should be handled server-side in production
        redirectUri: 'https://www.athlytx.com',
        scope: 'ACTIVITY_EXPORT HEALTH_EXPORT'
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
            const tokens = await garminAuth.exchangeCodeForToken(code, state);
            garminAuth.storeTokens(tokens);

            // Test API call
            const permissions = await garminAuth.getUserPermissions(tokens.access_token);
            console.log('User permissions:', permissions);

            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);

        } catch (error) {
            console.error('Token exchange failed:', error);
        }
    } else {
        // Check for existing tokens
        const existingTokens = garminAuth.getStoredTokens();

        if (existingTokens && !garminAuth.isTokenExpired()) {
            console.log('Using existing tokens');
            try {
                const permissions = await garminAuth.getUserPermissions(existingTokens.access_token);
                console.log('User permissions:', permissions);
            } catch (error) {
                console.error('API call with existing token failed:', error);
                garminAuth.clearTokens();
            }
        }
    }

    return garminAuth;
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GarminOAuth2;
} else if (typeof window !== 'undefined') {
    window.GarminOAuth2 = GarminOAuth2;
    window.initializeGarminAuth = initializeGarminAuth;
}
