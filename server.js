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

// Oura API proxy endpoints
app.get('/api/oura/personal', async (req, res) => {
    try {
        const { token } = req.query;
        
        const response = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Oura personal error:', error);
        res.status(500).json({ error: 'Failed to fetch Oura personal data' });
    }
});

app.get('/api/oura/sleep', async (req, res) => {
    try {
        const { token, start_date, end_date } = req.query;
        
        const response = await fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${start_date}&end_date=${end_date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Oura sleep error:', error);
        res.status(500).json({ error: 'Failed to fetch Oura sleep data' });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Athlytx Backend running on port ${PORT}`);
    console.log(`🌐 Available at: https://your-service.railway.app`);
});
