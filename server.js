const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// CORS for your website
app.use(cors({
    origin: ['https://www.athlytx.com', 'https://athlytx.com'],
    credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        message: 'Athlytx Backend Live! 🚀',
        timestamp: new Date().toISOString(),
        status: 'healthy'
    });
});

// ================== STRAVA ENDPOINTS ==================

// Strava OAuth exchange
app.post('/api/strava/token', async (req, res) => {
    try {
        const { code } = req.body;
        
        console.log('Exchanging Strava code for token...');
        
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.STRAVA_CLIENT_ID || '167615',
                client_secret: process.env.STRAVA_CLIENT_SECRET || '57ffd1f50959cc93ea31c70296e6b70a6b520470',
                code: code,
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();
        
        if (!data.access_token) {
            return res.status(400).json({ error: 'Failed to get Strava token', details: data });
        }

        console.log('Strava token exchange successful');
        res.json(data);

    } catch (error) {
        console.error('Strava token error:', error);
        res.status(500).json({ error: 'Token exchange failed', details: error.message });
    }
});

// Fetch Strava activities
app.get('/api/strava/activities', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Strava API error' });
        }

        const activities = await response.json();
        res.json({ activities });

    } catch (error) {
        console.error('Strava activities error:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

// Get Strava athlete info
app.get('/api/strava/athlete', async (req, res) => {
    try {
        const { token } = req.query;
        
        const response = await fetch('https://www.strava.com/api/v3/athlete', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const athlete = await response.json();
        res.json(athlete);

    } catch (error) {
        console.error('Strava athlete error:', error);
        res.status(500).json({ error: 'Failed to fetch athlete data' });
    }
});

// ================== OURA ENDPOINTS ==================

// Oura OAuth exchange
app.post('/api/oura/token', async (req, res) => {
    try {
        const { code } = req.body;
        
        console.log('Exchanging Oura code for token...');
        
        if (!process.env.OURA_CLIENT_ID || !process.env.OURA_CLIENT_SECRET) {
            return res.status(500).json({ error: 'Oura OAuth credentials not configured' });
        }
        
        const response = await fetch('https://api.ouraring.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: process.env.OURA_CLIENT_ID,
                client_secret: process.env.OURA_CLIENT_SECRET,
                redirect_uri: 'https://www.athlytx.com'
            })
        });

        const data = await response.json();
        
        if (!data.access_token) {
            console.error('Oura token exchange failed:', data);
            return res.status(400).json({ error: 'Failed to get Oura token', details: data });
        }

        console.log('Oura token exchange successful');
        res.json(data);

    } catch (error) {
        console.error('Oura token error:', error);
        res.status(500).json({ error: 'Oura token exchange failed', details: error.message });
    }
});

// Fetch Oura personal info
app.get('/api/oura/personal', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        const response = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Oura API error', details: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Oura personal error:', error);
        res.status(500).json({ error: 'Failed to fetch Oura personal data' });
    }
});

// Fetch Oura sleep data
app.get('/api/oura/sleep', async (req, res) => {
    try {
        const { token, start_date, end_date } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        const response = await fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${start_date}&end_date=${end_date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Oura API error', details: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Oura sleep error:', error);
        res.status(500).json({ error: 'Failed to fetch Oura sleep data' });
    }
});

// Fetch Oura readiness data
app.get('/api/oura/readiness', async (req, res) => {
    try {
        const { token, start_date, end_date } = req.query;
        
        const response = await fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start_date}&end_date=${end_date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Oura API error', details: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Oura readiness error:', error);
        res.status(500).json({ error: 'Failed to fetch Oura readiness data' });
    }
});

// Fetch Oura activity data
app.get('/api/oura/activity', async (req, res) => {
    try {
        const { token, start_date, end_date } = req.query;
        
        const response = await fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${start_date}&end_date=${end_date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Oura API error', details: errorText });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Oura activity error:', error);
        res.status(500).json({ error: 'Failed to fetch Oura activity data' });
    }
});

// ================== WHOOP ENDPOINTS ==================

// Whoop OAuth token exchange
app.post('/api/whoop/token', async (req, res) => {
    try {
        const { code } = req.body;
        
        console.log('Exchanging Whoop code for token...');
        
        if (!process.env.WHOOP_CLIENT_ID || !process.env.WHOOP_CLIENT_SECRET) {
            return res.status(500).json({ error: 'Whoop OAuth credentials not configured' });
        }
        
        const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${process.env.WHOOP_CLIENT_ID}:${process.env.WHOOP_CLIENT_SECRET}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: 'https://www.athlytx.com'
            })
        });

        const data = await response.json();
        
        if (!data.access_token) {
            console.error('Whoop token exchange failed:', data);
            return res.status(400).json({ error: 'Failed to get Whoop token', details: data });
        }

        console.log('Whoop token exchange successful');
        res.json(data);

    } catch (error) {
        console.error('Whoop token error:', error);
        res.status(500).json({ error: 'Whoop token exchange failed', details: error.message });
    }
});

// Get Whoop user profile
app.get('/api/whoop/profile', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        const response = await fetch('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Whoop API error', details: errorText });
        }

        const profile = await response.json();
        res.json(profile);

    } catch (error) {
        console.error('Whoop profile error:', error);
        res.status(500).json({ error: 'Failed to fetch Whoop profile' });
    }
});

// Get Whoop recovery data
app.get('/api/whoop/recovery', async (req, res) => {
    try {
        const { token, start, end } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        const url = `https://api.prod.whoop.com/developer/v1/recovery?start=${start}&end=${end}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Whoop API error', details: errorText });
        }

        const recovery = await response.json();
        res.json(recovery);

    } catch (error) {
        console.error('Whoop recovery error:', error);
        res.status(500).json({ error: 'Failed to fetch Whoop recovery data' });
    }
});

// Get Whoop sleep data
app.get('/api/whoop/sleep', async (req, res) => {
    try {
        const { token, start, end } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        const url = `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${start}&end=${end}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Whoop API error', details: errorText });
        }

        const sleep = await response.json();
        res.json(sleep);

    } catch (error) {
        console.error('Whoop sleep error:', error);
        res.status(500).json({ error: 'Failed to fetch Whoop sleep data' });
    }
});

// Get Whoop workout data
app.get('/api/whoop/workouts', async (req, res) => {
    try {
        const { token, start, end } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        const url = `https://api.prod.whoop.com/developer/v1/activity/workout?start=${start}&end=${end}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Whoop API error', details: errorText });
        }

        const workouts = await response.json();
        res.json(workouts);

    } catch (error) {
        console.error('Whoop workout error:', error);
        res.status(500).json({ error: 'Failed to fetch Whoop workout data' });
    }
});

// Get Whoop physiological cycles
app.get('/api/whoop/cycles', async (req, res) => {
    try {
        const { token, start, end } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        const url = `https://api.prod.whoop.com/developer/v1/cycle?start=${start}&end=${end}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Whoop API error', details: errorText });
        }

        const cycles = await response.json();
        res.json(cycles);

    } catch (error) {
        console.error('Whoop cycles error:', error);
        res.status(500).json({ error: 'Failed to fetch Whoop cycle data' });
    }
});

// ================== SERVER STARTUP ==================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Athlytx Backend running on port ${PORT}`);
    console.log(`🌐 Available at: https://athlytx-backend-production.up.railway.app`);
    console.log(`🔐 Environment check:`);
    console.log(`  - Strava: ${process.env.STRAVA_CLIENT_ID ? '✅' : '❌'}`);
    console.log(`  - Oura: ${process.env.OURA_CLIENT_ID ? '✅' : '❌'}`);
    console.log(`  - Whoop: ${process.env.WHOOP_CLIENT_ID ? '✅' : '❌'}`);
});
