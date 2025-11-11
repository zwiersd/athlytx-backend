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

        const response = await fetch('https://api.prod.whoop.com/oauth/token', {
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

        const url = `https://api.prod.whoop.com/developer/v1/recovery?start=${start}&end=${end}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Whoop recovery fetch failed: ${data.message}`);
        }

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

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Whoop sleep fetch failed: ${data.message}`);
        }

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

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Whoop workouts fetch failed: ${data.message}`);
        }

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
            has_client_secret: !!process.env.GARMIN_CONSUMER_SECRET
        });

        const credentials = Buffer.from(
            `${process.env.GARMIN_CONSUMER_KEY}:${process.env.GARMIN_CONSUMER_SECRET}`
        ).toString('base64');

        const response = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                code_verifier: code_verifier,
                redirect_uri: process.env.GARMIN_REDIRECT_URI || 'https://www.athlytx.com'
            })
        });

        const responseText = await response.text();
        console.log('🔐 Garmin raw response:', responseText);

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
        const { token } = req.query;

        const response = await fetch('https://apis.garmin.com/wellness-api/rest/user/permissions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Garmin permissions check failed: ${data.message}`);
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

        const url = `https://apis.garmin.com/wellness-api/rest/dailies?uploadStartTimeInSeconds=${start}&uploadEndTimeInSeconds=${end}`;

        console.log('📊 Garmin dailies request:', { url, hasToken: !!token });

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        console.log('📊 Garmin dailies response:', {
            status: response.status,
            dataLength: Array.isArray(data) ? data.length : 'not array',
            sample: data
        });

        if (!response.ok) {
            throw new Error(`Garmin dailies fetch failed: ${data.message || JSON.stringify(data)}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Garmin dailies error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/v2/activities', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${start}&uploadEndTimeInSeconds=${end}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Garmin activities fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Garmin activities error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/v2/sleep', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://apis.garmin.com/wellness-api/rest/sleeps?uploadStartTimeInSeconds=${start}&uploadEndTimeInSeconds=${end}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Garmin sleep fetch failed: ${data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Garmin sleep error:', error);
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ Legacy OAuth routes loaded');

}; // End of module.exports
