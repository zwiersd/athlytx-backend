const fetch = require('node-fetch');

// This module exports all existing OAuth routes
module.exports = function(app) {

// ===== STRAVA ENDPOINTS =====
app.post('/api/strava/token', async (req, res) => {
    try {
        const { code } = req.body;

        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Strava token exchange failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Strava token error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/strava/athlete', async (req, res) => {
    try {
        const { token } = req.query;

        const response = await fetch('https://www.strava.com/api/v3/athlete', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Strava athlete fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Strava athlete error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/strava/activities', async (req, res) => {
    try {
        const { token } = req.query;

        const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const activities = await response.json();

        if (!response.ok) {
            throw new Error(`Strava activities fetch failed: ${activities.message}`);
        }

        res.json({ activities });
    } catch (error) {
        console.error('Strava activities error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== OURA ENDPOINTS =====
app.post('/api/oura/token', async (req, res) => {
    try {
        const { code } = req.body;

        const credentials = Buffer.from(`${process.env.OURA_CLIENT_ID}:${process.env.OURA_CLIENT_SECRET}`).toString('base64');

        const response = await fetch('https://api.ouraring.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.OURA_REDIRECT_URI
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Oura token exchange failed: ${data.error || data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Oura token error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/oura/personal', async (req, res) => {
    try {
        const { token } = req.query;

        const response = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Oura personal info fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Oura personal error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/oura/sleep', async (req, res) => {
    try {
        const { token, start_date, end_date } = req.query;

        const url = `https://api.ouraring.com/v2/usercollection/sleep?start_date=${start_date}&end_date=${end_date}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Oura sleep fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Oura sleep error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/oura/readiness', async (req, res) => {
    try {
        const { token, start_date, end_date } = req.query;

        const url = `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start_date}&end_date=${end_date}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Oura readiness fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Oura readiness error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/oura/activity', async (req, res) => {
    try {
        const { token, start_date, end_date } = req.query;

        const url = `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${start_date}&end_date=${end_date}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Oura activity fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Oura activity error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== WHOOP ENDPOINTS =====
app.post('/api/whoop/token', async (req, res) => {
    try {
        const { code, code_verifier } = req.body;

        console.log('🔐 Whoop token exchange attempt:', {
            code: code.substring(0, 10) + '...',
            code_verifier: code_verifier.substring(0, 10) + '...',
            has_client_secret: !!process.env.WHOOP_CLIENT_SECRET
        });

        const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: process.env.WHOOP_CLIENT_ID,
                client_secret: process.env.WHOOP_CLIENT_SECRET,
                code_verifier: code_verifier,
                redirect_uri: process.env.WHOOP_REDIRECT_URI
            })
        });

        const data = await response.json();

        console.log('🔐 Whoop token response:', {
            status: response.status,
            hasAccessToken: !!data.access_token,
            error: data.error
        });

        if (!response.ok) {
            throw new Error(`Whoop token exchange failed: ${data.error || data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Whoop token error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/profile', async (req, res) => {
    try {
        const { token } = req.query;

        const response = await fetch('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Whoop profile fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Whoop profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/recovery', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://api.prod.whoop.com/developer/v1/cycle?start=${start}&end=${end}`;
        console.log('Fetching Whoop recovery (via cycle endpoint):', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const responseText = await response.text();
        console.log('Whoop recovery response status:', response.status);

        if (!response.ok) {
            throw new Error(`Whoop recovery fetch failed: ${response.status} - ${responseText.substring(0, 200)}`);
        }

        const data = JSON.parse(responseText);
        res.json(data);
    } catch (error) {
        console.error('Whoop recovery error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/sleep', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${start}&end=${end}`;
        console.log('Fetching Whoop sleep:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const responseText = await response.text();
        console.log('Whoop sleep response status:', response.status);

        if (!response.ok) {
            throw new Error(`Whoop sleep fetch failed: ${response.status} - ${responseText.substring(0, 200)}`);
        }

        const data = JSON.parse(responseText);
        res.json(data);
    } catch (error) {
        console.error('Whoop sleep error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/workouts', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://api.prod.whoop.com/developer/v1/activity/workout?start=${start}&end=${end}`;
        console.log('Fetching Whoop workouts:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const responseText = await response.text();
        console.log('Whoop workouts response status:', response.status);
        console.log('Whoop workouts response:', responseText.substring(0, 500));

        if (!response.ok) {
            throw new Error(`Whoop workouts fetch failed: ${response.status} - ${responseText.substring(0, 200)}`);
        }

        const data = JSON.parse(responseText);
        res.json(data);
    } catch (error) {
        console.error('Whoop workouts error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/cycles', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://api.prod.whoop.com/developer/v1/cycle?start=${start}&end=${end}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Whoop cycles fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Whoop cycles error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== GARMIN ENDPOINTS (OAuth 2.0 with PKCE) =====
app.post('/api/garmin/token', async (req, res) => {
    try {
        const { code, code_verifier } = req.body;

        console.log('🔐 Garmin token exchange with PKCE:', {
            code: code ? code.substring(0, 10) + '...' : 'missing',
            code_verifier: code_verifier ? code_verifier.substring(0, 10) + '...' : 'missing',
            has_consumer_key: !!process.env.GARMIN_CONSUMER_KEY,
            has_consumer_secret: !!process.env.GARMIN_CONSUMER_SECRET,
            redirect_uri: process.env.GARMIN_REDIRECT_URI || 'https://www.athlytx.com/auth/garmin/callback',
            consumer_key: process.env.GARMIN_CONSUMER_KEY ? process.env.GARMIN_CONSUMER_KEY.substring(0, 10) + '...' : 'missing'
        });

        const credentials = Buffer.from(
            `${process.env.GARMIN_CONSUMER_KEY}:${process.env.GARMIN_CONSUMER_SECRET}`
        ).toString('base64');

        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            code_verifier: code_verifier,
            redirect_uri: process.env.GARMIN_REDIRECT_URI || 'https://www.athlytx.com/auth/garmin/callback'
        });

        console.log('🔐 Token exchange params:', tokenParams.toString());

        const response = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: tokenParams
        });

        const responseText = await response.text();
        console.log('🔐 Garmin raw response:', responseText);
        console.log('🔐 Garmin response status:', response.status);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${responseText}`);
        }

        if (!response.ok) {
            console.error('❌ Garmin token exchange failed:', data);
            throw new Error(`Garmin token exchange failed: ${data.error || data.message || responseText}`);
        }

        console.log('✅ Garmin token exchange successful');
        console.log('📝 Token exchange response:', {
            hasAccessToken: !!data.access_token,
            hasRefreshToken: !!data.refresh_token,
            tokenType: data.token_type,
            expiresIn: data.expires_in,
            refreshToken: data.refresh_token ? data.refresh_token.substring(0, 20) + '...' : 'NOT PROVIDED'
        });

        // IMPORTANT: Register user with Garmin Health API after OAuth 2.0
        // This step is required for Health API push notifications
        console.log('\n📝 === GARMIN HEALTH API USER REGISTRATION ===');
        console.log('Consumer Key:', process.env.GARMIN_CONSUMER_KEY);
        console.log('Consumer Secret Present:', !!process.env.GARMIN_CONSUMER_SECRET);
        console.log('Access Token Length:', data.access_token.length);
        console.log('Token Type:', data.token_type);
        console.log('Expires In:', data.expires_in);

        let garminUserId = null;

        try {
            const GarminOAuth1Hybrid = require('../utils/garmin-oauth1-hybrid');
            // Use Health API registration endpoint instead of Wellness API
            const baseUrl = 'https://apis.garmin.com/wellness-api/rest/user/id';

            console.log('Registration URL:', baseUrl);

            const signer = new GarminOAuth1Hybrid(
                process.env.GARMIN_CONSUMER_KEY,
                process.env.GARMIN_CONSUMER_SECRET
            );
            const authHeader = signer.generateAuthHeader('GET', baseUrl, {}, data.access_token);

            const registrationResponse = await fetch(baseUrl, {
                method: 'GET',
                headers: {
                    Authorization: authHeader,
                    Accept: 'application/json'
                }
            });

            const regResponseText = await registrationResponse.text();
            console.log('📝 User ID endpoint response:', {
                status: registrationResponse.status,
                headers: Object.fromEntries(registrationResponse.headers.entries()),
                body: regResponseText
            });

            if (registrationResponse.ok) {
                try {
                    const regData = JSON.parse(regResponseText);
                    garminUserId = regData.userId || regData.userAccessToken;
                    console.log('✅ Extracted Garmin User ID:', garminUserId);

                    // Add garminUserId to response data
                    data.garminUserId = garminUserId;

                    // **CRITICAL:** Register user for Health API PUSH notifications
                    console.log('\n📝 === REGISTERING USER FOR PUSH NOTIFICATIONS ===');
                    const pushRegUrl = 'https://apis.garmin.com/wellness-api/rest/user/registration';
                    const pushAuthHeader = signer.generateAuthHeader('POST', pushRegUrl, {}, data.access_token);

                    console.log('Registration URL (PUSH):', pushRegUrl);

                    const pushRegResponse = await fetch(pushRegUrl, {
                        method: 'POST',
                        headers: {
                            Authorization: pushAuthHeader,
                            Accept: 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({})
                    });

                    const pushRegText = await pushRegResponse.text();
                    console.log('📝 Push registration response:', {
                        status: pushRegResponse.status,
                        body: pushRegText
                    });

                    if (pushRegResponse.ok || pushRegResponse.status === 409) {
                        console.log('✅ User registered for PUSH notifications (or already registered)');
                    } else {
                        console.warn('⚠️ Push registration failed (non-fatal):', pushRegText);
                    }

                } catch (e) {
                    console.warn('⚠️ Could not parse registration response:', e);
                }
            } else {
                console.error('⚠️ User ID fetch failed:', {
                    status: registrationResponse.status,
                    body: regResponseText
                });

                // Fallback: Extract from JWT access token
                console.log('🔄 Attempting to extract Garmin User ID from JWT...');
                try {
                    const [, payloadBase64] = data.access_token.split('.');
                    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
                    console.log('📝 JWT payload keys:', Object.keys(payload));

                    garminUserId = payload.garmin_guid || payload.user_id || payload.sub || payload.userId;

                    if (garminUserId) {
                        console.log('✅ Extracted Garmin User ID from JWT:', garminUserId);
                        data.garminUserId = garminUserId;
                    } else {
                        console.warn('⚠️ Could not find Garmin User ID in JWT payload');
                    }
                } catch (jwtError) {
                    console.error('⚠️ Failed to decode JWT:', jwtError.message);
                }
            }
        } catch (regError) {
            console.error('⚠️ User registration error (non-fatal):', regError);

            // Fallback: Extract from JWT access token
            console.log('🔄 Attempting to extract Garmin User ID from JWT (fallback)...');
            try {
                const [, payloadBase64] = data.access_token.split('.');
                const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
                console.log('📝 JWT payload keys:', Object.keys(payload));

                garminUserId = payload.garmin_guid || payload.user_id || payload.sub || payload.userId;

                if (garminUserId) {
                    console.log('✅ Extracted Garmin User ID from JWT:', garminUserId);
                    data.garminUserId = garminUserId;
                } else {
                    console.warn('⚠️ Could not find Garmin User ID in JWT payload');
                }
            } catch (jwtError) {
                console.error('⚠️ Failed to decode JWT:', jwtError.message);
            }
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Garmin token error:', error);
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to manually register user with Garmin Wellness API
app.post('/api/garmin/v2/register', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Missing access token',
                message: 'OAuth 2.0 token is required for registration'
            });
        }

        console.log('📝 Manual user registration request for Garmin Wellness API');
        console.log('🔐 Token prefix:', token.substring(0, 20) + '...');

        const { signAndFetch } = require('../utils/garmin-api');
        const response = await signAndFetch('/user/registration', 'POST', token, {}, {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const responseText = await response.text();
        console.log('📝 Registration response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseText
        });

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { message: responseText };
        }

        if (!response.ok) {
            console.error('❌ User registration failed:', responseText);
            return res.status(response.status).json({
                error: 'Registration failed',
                message: data.errorMessage || data.message || responseText,
                status: response.status
            });
        }

        console.log('✅ User successfully registered with Wellness API');
        res.json({
            success: true,
            message: 'User registered successfully with Garmin Wellness API',
            data: data
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/v2/permissions', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                error: 'Missing access token',
                message: 'OAuth 2.0 token is required'
            });
        }

        console.log('🔐 Checking Garmin permissions with Bearer token (Partner API)');
        console.log('🔐 Token prefix:', token.substring(0, 20) + '...');

        // Use Bearer token directly for Partner API
        const { fetchWithBearer } = require('../utils/garmin-api-bearer');
        const response = await fetchWithBearer('/user/permissions', 'GET', token, {});

        const responseText = await response.text();
        console.log('🔐 Garmin permissions response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseText.substring(0, 500)
        });

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // If not JSON, wrap in object
            data = { raw: responseText };
        }

        if (!response.ok) {
            console.error('❌ Garmin API error:', response.status, responseText);
            throw new Error(`Garmin API error: ${response.status} - ${data.errorMessage || data.message || responseText}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Garmin permissions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DISABLED: PULL requests not allowed for production apps
// Garmin requires PUSH-only notifications - this endpoint violated compliance
app.get('/api/garmin/v2/dailies', async (req, res) => {
    console.log('⚠️ PULL request blocked: /api/garmin/v2/dailies (compliance violation)');
    res.status(403).json({
        error: 'PULL requests forbidden',
        message: 'Garmin production apps must use PUSH notifications only. Data is available via /api/garmin/push webhook.',
        compliance: 'This endpoint was disabled to meet Garmin Health API requirements'
    });
});

// DISABLED: PULL requests not allowed for production apps
// Garmin requires PUSH-only notifications - this endpoint violated compliance
app.get('/api/garmin/v2/activities', async (req, res) => {
    console.log('⚠️ PULL request blocked: /api/garmin/v2/activities (compliance violation)');
    res.status(403).json({
        error: 'PULL requests forbidden',
        message: 'Garmin production apps must use PUSH notifications only. Data is available via /api/garmin/push webhook.',
        compliance: 'This endpoint was disabled to meet Garmin Health API requirements'
    });
});

// DISABLED: PULL requests not allowed for production apps
// Garmin requires PUSH-only notifications - this endpoint violated compliance
app.get('/api/garmin/v2/sleep', async (req, res) => {
    console.log('⚠️ PULL request blocked: /api/garmin/v2/sleep (compliance violation)');
    res.status(403).json({
        error: 'PULL requests forbidden',
        message: 'Garmin production apps must use PUSH notifications only. Data is available via /api/garmin/push webhook.',
        compliance: 'This endpoint was disabled to meet Garmin Health API requirements'
    });
});

console.log('✅ Legacy OAuth routes loaded');

}; // End of module.exports
