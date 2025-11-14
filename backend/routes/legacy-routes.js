const fetch = require('node-fetch');
const GarminOAuth1 = require('../utils/garmin-oauth1');

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
        res.json(data);
    } catch (error) {
        console.error('❌ Garmin token error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/v2/permissions', async (req, res) => {
    try {
        const { token, tokenSecret } = req.query;

        // Garmin Wellness API uses OAuth 1.0a, not OAuth 2.0
        const consumerKey = process.env.GARMIN_CONSUMER_KEY;
        const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

        console.log('🔐 Checking Garmin permissions with OAuth 1.0a');
        console.log('🔐 Consumer Key:', consumerKey ? 'Set (' + consumerKey.substring(0, 8) + '...)' : 'Missing');
        console.log('🔐 Consumer Secret:', consumerSecret ? 'Set' : 'Missing');

        if (!consumerKey || !consumerSecret) {
            console.error('❌ Garmin Consumer Key/Secret not configured');
            return res.status(500).json({
                error: 'Garmin API not configured',
                message: 'Please set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET environment variables.',
                details: 'Garmin Wellness API requires OAuth 1.0a with Consumer Key/Secret, not OAuth 2.0 tokens.'
            });
        }

        const oauth1 = new GarminOAuth1(consumerKey, consumerSecret);

        // Make OAuth 1.0a request (2-legged OAuth - no user token needed for Wellness API)
        const response = await oauth1.makeRequest(
            'GET',
            '/wellness-api/rest/user/permissions',
            {} // No query parameters for permissions endpoint
        );

        const responseText = await response.text();
        console.log('🔐 Garmin permissions response:', { status: response.status, body: responseText.substring(0, 200) });

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { raw: responseText };
        }

        if (!response.ok) {
            throw new Error(`Garmin permissions check failed: ${data.errorMessage || data.message || responseText}`);
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

        // Garmin Wellness API uses OAuth 1.0a
        const consumerKey = process.env.GARMIN_CONSUMER_KEY;
        const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

        if (!consumerKey || !consumerSecret) {
            return res.status(500).json({
                error: 'Garmin API not configured',
                message: 'Please set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET environment variables.'
            });
        }

        // Convert date strings to Unix timestamps
        const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(end).getTime() / 1000);

        console.log('📊 Garmin dailies request (OAuth 1.0a):', {
            start,
            end,
            startTimestamp,
            endTimestamp
        });

        const oauth1 = new GarminOAuth1(consumerKey, consumerSecret);

        // Make OAuth 1.0a request with query parameters
        const response = await oauth1.makeRequest(
            'GET',
            '/wellness-api/rest/dailies',
            {
                uploadStartTimeInSeconds: startTimestamp.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            }
        );

        const responseText = await response.text();
        console.log('📊 Garmin dailies raw response:', {
            status: response.status,
            body: responseText.substring(0, 500)
        });

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        }

        console.log('📊 Garmin dailies parsed response:', {
            status: response.status,
            dataLength: Array.isArray(data) ? data.length : 'not array',
            hasError: !!(data.errorMessage || data.error)
        });

        if (!response.ok) {
            throw new Error(`Garmin dailies fetch failed (${response.status}): ${data.errorMessage || data.message || JSON.stringify(data)}`);
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

        // Garmin Wellness API uses OAuth 1.0a
        const consumerKey = process.env.GARMIN_CONSUMER_KEY;
        const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

        if (!consumerKey || !consumerSecret) {
            return res.status(500).json({
                error: 'Garmin API not configured',
                message: 'Please set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET environment variables.'
            });
        }

        // Convert date strings to Unix timestamps
        const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(end).getTime() / 1000);

        console.log('🏃 Garmin activities request (OAuth 1.0a):', {
            start,
            end,
            startTimestamp,
            endTimestamp
        });

        const oauth1 = new GarminOAuth1(consumerKey, consumerSecret);

        // Make OAuth 1.0a request with query parameters
        const response = await oauth1.makeRequest(
            'GET',
            '/wellness-api/rest/activities',
            {
                uploadStartTimeInSeconds: startTimestamp.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            }
        );

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        }

        console.log('🏃 Garmin activities response:', {
            status: response.status,
            dataLength: Array.isArray(data) ? data.length : 'not array'
        });

        if (!response.ok) {
            throw new Error(`Garmin activities fetch failed (${response.status}): ${data.errorMessage || data.message || JSON.stringify(data)}`);
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

        // Garmin Wellness API uses OAuth 1.0a
        const consumerKey = process.env.GARMIN_CONSUMER_KEY;
        const consumerSecret = process.env.GARMIN_CONSUMER_SECRET;

        if (!consumerKey || !consumerSecret) {
            return res.status(500).json({
                error: 'Garmin API not configured',
                message: 'Please set GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET environment variables.'
            });
        }

        // Convert date strings to Unix timestamps
        const startTimestamp = Math.floor(new Date(start).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(end).getTime() / 1000);

        console.log('😴 Garmin sleep request (OAuth 1.0a):', {
            start,
            end,
            startTimestamp,
            endTimestamp
        });

        const oauth1 = new GarminOAuth1(consumerKey, consumerSecret);

        // Make OAuth 1.0a request with query parameters
        const response = await oauth1.makeRequest(
            'GET',
            '/wellness-api/rest/sleeps',
            {
                uploadStartTimeInSeconds: startTimestamp.toString(),
                uploadEndTimeInSeconds: endTimestamp.toString()
            }
        );

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        }

        console.log('😴 Garmin sleep response:', {
            status: response.status,
            dataLength: Array.isArray(data) ? data.length : 'not array'
        });

        if (!response.ok) {
            throw new Error(`Garmin sleep fetch failed (${response.status}): ${data.errorMessage || data.message || JSON.stringify(data)}`);
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Garmin sleep error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ Legacy OAuth routes loaded');

}; // End of module.exports
