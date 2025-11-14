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

        // IMPORTANT: Register user with Garmin Wellness API after OAuth 2.0
        // This step is required to enable data pulling with the access token
        console.log('\n📝 === GARMIN USER REGISTRATION ===');
        console.log('Consumer Key:', process.env.GARMIN_CONSUMER_KEY);
        console.log('Consumer Secret Present:', !!process.env.GARMIN_CONSUMER_SECRET);
        console.log('Access Token Length:', data.access_token.length);
        console.log('Token Type:', data.token_type);
        console.log('Expires In:', data.expires_in);

        try {
            const GarminOAuth1Hybrid = require('../utils/garmin-oauth1-hybrid');
            const baseUrl = 'https://apis.garmin.com/wellness-api/rest/user/registration';

            console.log('Registration URL:', baseUrl);

            const signer = new GarminOAuth1Hybrid(
                process.env.GARMIN_CONSUMER_KEY,
                process.env.GARMIN_CONSUMER_SECRET
            );
            const authHeader = signer.generateAuthHeader('POST', baseUrl, {}, data.access_token);

            const registrationResponse = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({}) // Empty body for registration
            });

            const regResponseText = await registrationResponse.text();
            console.log('📝 Registration response:', {
                status: registrationResponse.status,
                headers: Object.fromEntries(registrationResponse.headers.entries()),
                body: regResponseText
            });

            if (!registrationResponse.ok) {
                console.error('⚠️ User registration failed, but continuing:', {
                    status: registrationResponse.status,
                    body: regResponseText
                });
                // Don't fail the entire flow if registration fails
                // Some users might already be registered
            } else {
                console.log('✅ User successfully registered with Wellness API');
                // Add a small delay to allow registration to propagate
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (regError) {
            console.error('⚠️ User registration error (non-fatal):', regError);
            // Continue even if registration fails - user might already be registered
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

app.get('/api/garmin/v2/dailies', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        if (!token) {
            return res.status(400).json({
                error: 'Missing access token',
                message: 'OAuth 2.0 token is required'
            });
        }

        // Convert date strings to Unix timestamps
        const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(end).getTime() / 1000);

        console.log('📊 Garmin dailies request (Bearer token):', {
            start,
            end,
            startTimestamp,
            endTimestamp,
            tokenPrefix: token.substring(0, 20) + '...'
        });

        // Use Bearer token directly for Partner API
        const { fetchWithBearer, validateTimeRange } = require('../utils/garmin-api-bearer');

        let response;
        // Check time range (max 24 hours)
        if (!validateTimeRange(startTimestamp, endTimestamp)) {
            console.log('⚠️ Time range exceeds 24 hours, will limit to last 24 hours');
            // For now, just limit to 24 hours from end
            const adjustedStart = Math.max(startTimestamp, endTimestamp - 86400);
            console.log('📊 Adjusted time range:', new Date(adjustedStart * 1000).toISOString(), 'to', new Date(endTimestamp * 1000).toISOString());

            response = await fetchWithBearer('/dailies', 'GET', token, {
                uploadStartTimeInSeconds: adjustedStart.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            });
        } else {
            response = await fetchWithBearer('/dailies', 'GET', token, {
                uploadStartTimeInSeconds: startTimestamp.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            });
        }

        const responseText = await response.text();
        console.log('📊 Garmin dailies response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseText.substring(0, 500)
        });

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // If not JSON, wrap response
            data = { raw: responseText };
        }

        if (!response.ok) {
            console.error('❌ Garmin API error:', response.status, responseText);
            throw new Error(`Garmin API error: ${response.status} - ${data.errorMessage || data.message || responseText}`);
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Garmin dailies error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/v2/activities', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        if (!token) {
            return res.status(400).json({
                error: 'Missing access token',
                message: 'OAuth 2.0 token is required'
            });
        }

        // Convert date strings to Unix timestamps
        const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(end).getTime() / 1000);

        console.log('🏃 Garmin activities request (Bearer token):', {
            start,
            end,
            startTimestamp,
            endTimestamp,
            tokenPrefix: token.substring(0, 20) + '...'
        });

        // Use Bearer token directly for Partner API
        const { fetchWithBearer, validateTimeRange } = require('../utils/garmin-api-bearer');

        let response;
        // Check time range (max 24 hours)
        if (!validateTimeRange(startTimestamp, endTimestamp)) {
            console.log('⚠️ Time range exceeds 24 hours, will limit to last 24 hours');
            const adjustedStart = Math.max(startTimestamp, endTimestamp - 86400);
            console.log('🏃 Adjusted time range:', new Date(adjustedStart * 1000).toISOString(), 'to', new Date(endTimestamp * 1000).toISOString());

            response = await fetchWithBearer('/activities', 'GET', token, {
                uploadStartTimeInSeconds: adjustedStart.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            });
        } else {
            response = await fetchWithBearer('/activities', 'GET', token, {
                uploadStartTimeInSeconds: startTimestamp.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            });
        }

        const responseText = await response.text();
        console.log('🏃 Garmin activities response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseText.substring(0, 500)
        });

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // If not JSON, wrap response
            data = { raw: responseText };
        }

        if (!response.ok) {
            console.error('❌ Garmin API error:', response.status, responseText);
            throw new Error(`Garmin API error: ${response.status} - ${data.errorMessage || data.message || responseText}`);
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Garmin activities error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/v2/sleep', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        if (!token) {
            return res.status(400).json({
                error: 'Missing access token',
                message: 'OAuth 2.0 token is required'
            });
        }

        // Convert date strings to Unix timestamps
        const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(end).getTime() / 1000);

        console.log('😴 Garmin sleep request (Bearer token):', {
            start,
            end,
            startTimestamp,
            endTimestamp,
            tokenPrefix: token.substring(0, 20) + '...'
        });

        // Use Bearer token directly for Partner API
        const { fetchWithBearer, validateTimeRange } = require('../utils/garmin-api-bearer');

        let response;
        // Check time range (max 24 hours)
        if (!validateTimeRange(startTimestamp, endTimestamp)) {
            console.log('⚠️ Time range exceeds 24 hours, will limit to last 24 hours');
            const adjustedStart = Math.max(startTimestamp, endTimestamp - 86400);
            console.log('😴 Adjusted time range:', new Date(adjustedStart * 1000).toISOString(), 'to', new Date(endTimestamp * 1000).toISOString());

            response = await fetchWithBearer('/sleeps', 'GET', token, {
                uploadStartTimeInSeconds: adjustedStart.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            });
        } else {
            response = await fetchWithBearer('/sleeps', 'GET', token, {
                uploadStartTimeInSeconds: startTimestamp.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            });
        }

        const responseText = await response.text();
        console.log('😴 Garmin sleep response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseText.substring(0, 500)
        });

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            // If not JSON, wrap response
            data = { raw: responseText };
        }

        if (!response.ok) {
            console.error('❌ Garmin API error:', response.status, responseText);
            throw new Error(`Garmin API error: ${response.status} - ${data.errorMessage || data.message || responseText}`);
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Garmin sleep error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ Legacy OAuth routes loaded');

}; // End of module.exports
