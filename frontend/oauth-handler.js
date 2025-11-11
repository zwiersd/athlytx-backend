// OAuth Handler for main index.html integration
// This script handles OAuth callbacks and integrates with existing code

class OAuthHandler {
    constructor() {
        this.garminAuth = null;
        this.whoopAuth = null;
        this.init();
    }

    async init() {
        // Load the GarminOAuth2 class
        if (typeof GarminOAuth2 !== 'undefined') {
            this.garminAuth = new GarminOAuth2({
                clientId: 'ee6809d5-abc0-4a33-b38a-d433e5045987',
                clientSecret: '0Xjs//vs29LPby1XbvGUBcVM1gzn7/idbavTyTVnl3M',
                redirectUri: 'https://www.athlytx.com',
                scope: 'HEALTH_READ'
            });
        }

        // Load the WhoopOAuth2 class
        if (typeof WhoopOAuth2 !== 'undefined') {
            this.whoopAuth = new WhoopOAuth2({
                clientId: '31c6c2ac-890c-46ef-81da-b961c1cb1ca7',
                clientSecret: '45080f98c58c1aad56f6e0076b014e3dc58356f4763efaf3df2307057ce4b14f',
                redirectUri: 'https://www.athlytx.com',
                scope: 'read:profile read:workout read:recovery read:sleep read:cycles'
            });
        }

        // Check for OAuth callback on page load
        this.handleCallback();
    }

    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            console.error('OAuth error:', error);
            this.showMessage('Authorization failed: ' + error, 'error');
            return;
        }

        if (code && state && state.includes('garmin')) {
            try {
                console.log('Processing Garmin OAuth 2.0 callback...');

                // Exchange code for tokens using the new OAuth 2.0 implementation
                const tokens = await this.garminAuth.exchangeCodeForToken(code, state);

                // Store tokens using the new system
                this.garminAuth.storeTokens(tokens);

                // Also update the legacy storage for compatibility with existing index.html code
                localStorage.setItem('garmin_token', tokens.access_token);
                if (tokens.refresh_token) {
                    localStorage.setItem('garmin_refresh_token', tokens.refresh_token);
                }
                if (tokens.expires_in) {
                    const expiryTime = Date.now() + (tokens.expires_in * 1000);
                    localStorage.setItem('garmin_expiry', expiryTime);
                }

                this.showMessage('Garmin connected successfully!', 'success');

                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);

                // If fetchGarminData function exists (from index.html), call it
                if (typeof fetchGarminData === 'function') {
                    await fetchGarminData(tokens.access_token);
                }

            } catch (error) {
                console.error('Garmin callback error:', error);
                this.showMessage('Failed to connect Garmin: ' + error.message, 'error');
            }
        }

        if (code && state && state.includes('whoop')) {
            try {
                console.log('🔄 Processing Whoop OAuth 2.0 callback...');
                console.log('Authorization code:', code.substring(0, 10) + '...');
                console.log('State:', state);

                // Exchange code for tokens using the Whoop OAuth 2.0 implementation
                console.log('🔐 Calling exchangeCodeForToken...');
                const tokens = await this.whoopAuth.exchangeCodeForToken(code, state);
                console.log('✅ Token exchange completed:', tokens);

                // Store tokens using the new system
                console.log('💾 Storing tokens...');
                this.whoopAuth.storeTokens(tokens);

                // Also update the legacy storage for compatibility with existing index.html code
                localStorage.setItem('whoop_token', tokens.access_token);
                if (tokens.refresh_token) {
                    localStorage.setItem('whoop_refresh_token', tokens.refresh_token);
                }
                if (tokens.expires_in) {
                    const expiryTime = Date.now() + (tokens.expires_in * 1000);
                    localStorage.setItem('whoop_expiry', expiryTime);
                }

                console.log('✅ Whoop connection successful!');
                this.showMessage('Whoop connected successfully!', 'success');

                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);

                // If fetchWhoopData function exists (from index.html), call it
                if (typeof fetchWhoopData === 'function') {
                    await fetchWhoopData(tokens.access_token);
                }

            } catch (error) {
                console.error('Whoop callback error:', error);
                this.showMessage('Failed to connect Whoop: ' + error.message, 'error');
            }
        }
    }

    // Enhanced connect function for Garmin using existing OAuth logic
    async connectGarmin() {
        try {
            // Use the existing connectDevice function from index.html for Garmin
            // This bypasses our OAuth2 class and uses the working implementation
            if (typeof connectDevice === 'function') {
                // Call the original connectDevice function with 'garmin'
                await connectDevice('garmin');
            } else {
                throw new Error('Original connectDevice function not available');
            }

        } catch (error) {
            console.error('Garmin connect error:', error);
            this.showMessage('Failed to start Garmin connection: ' + error.message, 'error');
        }
    }

    // Enhanced connect function for Whoop using OAuth 2.0
    async connectWhoop() {
        try {
            if (!this.whoopAuth) {
                throw new Error('Whoop OAuth not initialized');
            }

            // Check if already connected
            const existingTokens = this.whoopAuth.getStoredTokens();
            if (existingTokens && !this.whoopAuth.isTokenExpired()) {
                this.showMessage('Already connected to Whoop', 'info');

                // Test the connection
                try {
                    await this.whoopAuth.getUserProfile(existingTokens.access_token);
                    if (typeof fetchWhoopData === 'function') {
                        await fetchWhoopData(existingTokens.access_token);
                    }
                    return;
                } catch (error) {
                    console.log('Existing token invalid, clearing and re-authenticating');
                    this.whoopAuth.clearTokens();
                }
            }

            // Start OAuth flow
            const authUrl = await this.whoopAuth.buildAuthorizationUrl();
            this.showMessage('Redirecting to Whoop for authorization...', 'info');
            window.location.href = authUrl;

        } catch (error) {
            console.error('Whoop connect error:', error);
            this.showMessage('Failed to start Whoop connection: ' + error.message, 'error');
        }
    }

    // Test Garmin API connection
    async testGarminConnection() {
        try {
            const tokens = this.garminAuth?.getStoredTokens();
            if (!tokens) {
                throw new Error('No Garmin tokens found');
            }

            const permissions = await this.garminAuth.getUserPermissions(tokens.access_token);
            console.log('Garmin permissions:', permissions);
            this.showMessage('Garmin API test successful!', 'success');

            return permissions;

        } catch (error) {
            console.error('Garmin test error:', error);
            this.showMessage('Garmin API test failed: ' + error.message, 'error');

            // Clear invalid tokens
            if (this.garminAuth) {
                this.garminAuth.clearTokens();
            }

            throw error;
        }
    }

    // Test Whoop API connection
    async testWhoopConnection() {
        try {
            const tokens = this.whoopAuth?.getStoredTokens();
            if (!tokens) {
                throw new Error('No Whoop tokens found');
            }

            const profile = await this.whoopAuth.getUserProfile(tokens.access_token);
            console.log('Whoop profile:', profile);
            this.showMessage('Whoop API test successful!', 'success');

            return profile;

        } catch (error) {
            console.error('Whoop test error:', error);
            this.showMessage('Whoop API test failed: ' + error.message, 'error');

            // Clear invalid tokens
            if (this.whoopAuth) {
                this.whoopAuth.clearTokens();
            }

            throw error;
        }
    }

    // Refresh Garmin token if needed
    async refreshGarminToken() {
        try {
            const tokens = this.garminAuth?.getStoredTokens();
            if (!tokens?.refresh_token) {
                throw new Error('No refresh token available');
            }

            const newTokens = await this.garminAuth.refreshToken(tokens.refresh_token);
            this.garminAuth.storeTokens(newTokens);

            // Update legacy storage
            localStorage.setItem('garmin_token', newTokens.access_token);
            if (newTokens.refresh_token) {
                localStorage.setItem('garmin_refresh_token', newTokens.refresh_token);
            }
            if (newTokens.expires_in) {
                const expiryTime = Date.now() + (newTokens.expires_in * 1000);
                localStorage.setItem('garmin_expiry', expiryTime);
            }

            return newTokens;

        } catch (error) {
            console.error('Token refresh error:', error);
            this.garminAuth?.clearTokens();
            throw error;
        }
    }

    // Refresh Whoop token if needed
    async refreshWhoopToken() {
        try {
            const tokens = this.whoopAuth?.getStoredTokens();
            if (!tokens?.refresh_token) {
                throw new Error('No refresh token available');
            }

            const newTokens = await this.whoopAuth.refreshToken(tokens.refresh_token);
            this.whoopAuth.storeTokens(newTokens);

            // Update legacy storage
            localStorage.setItem('whoop_token', newTokens.access_token);
            if (newTokens.refresh_token) {
                localStorage.setItem('whoop_refresh_token', newTokens.refresh_token);
            }
            if (newTokens.expires_in) {
                const expiryTime = Date.now() + (newTokens.expires_in * 1000);
                localStorage.setItem('whoop_expiry', expiryTime);
            }

            return newTokens;

        } catch (error) {
            console.error('Whoop token refresh error:', error);
            this.whoopAuth?.clearTokens();
            throw error;
        }
    }

    // Show message (compatible with existing showMessage function)
    showMessage(message, type) {
        if (typeof showMessage === 'function') {
            // Use existing showMessage function from index.html
            showMessage(message, type);
        } else {
            // Fallback console logging
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Get connection status
    getGarminStatus() {
        if (!this.garminAuth) return 'not_initialized';

        const tokens = this.garminAuth.getStoredTokens();
        if (!tokens) return 'not_connected';

        if (this.garminAuth.isTokenExpired()) return 'expired';

        return 'connected';
    }

    // Get Whoop connection status
    getWhoopStatus() {
        if (!this.whoopAuth) return 'not_initialized';

        const tokens = this.whoopAuth.getStoredTokens();
        if (!tokens) return 'not_connected';

        if (this.whoopAuth.isTokenExpired()) return 'expired';

        return 'connected';
    }
}

// Initialize OAuth handler
let oauthHandler;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        oauthHandler = new OAuthHandler();
    });
} else {
    oauthHandler = new OAuthHandler();
}

// Override the existing connectDevice function for Whoop only
// Let Garmin use the existing implementation
if (typeof window !== 'undefined') {
    const originalConnectDevice = window.connectDevice;

    window.connectDevice = async function(device) {
        if (device === 'whoop' && oauthHandler) {
            await oauthHandler.connectWhoop();
        } else if (originalConnectDevice) {
            return originalConnectDevice(device);
        }
    };

    // Make OAuth handler available globally
    window.oauthHandler = () => oauthHandler;
}