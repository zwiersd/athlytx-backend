const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('🔐 Environment check:');
    console.log(`  - Strava: ${process.env.STRAVA_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Oura: ${process.env.OURA_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Whoop: ${process.env.WHOOP_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Garmin: ${process.env.GARMIN_CONSUMER_SECRET ? '✅' : '❌'}`);
    
    res.json({
        message: 'Athlytx Backend Live! 🚀',
        timestamp: new Date().toISOString(),
        status: 'healthy'
    });
});

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
        
        const response = await fetch('https://api.ouraring.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: 'https://www.athlytx.com',
                client_id: process.env.OURA_CLIENT_ID,
                client_secret: process.env.OURA_CLIENT_SECRET
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Oura token exchange failed: ${data.error_description || data.error}`);
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
        console.error('Oura personal info error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/oura/sleep', async (req, res) => {
    try {
        const { token, start_date, end_date } = req.query;
        
        const response = await fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${start_date}&end_date=${end_date}`, {
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
        
        const response = await fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${start_date}&end_date=${end_date}`, {
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
        
        const response = await fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${start_date}&end_date=${end_date}`, {
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
        const { code } = req.body;
        
        const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: 'https://www.athlytx.com',
                client_id: process.env.WHOOP_CLIENT_ID,
                client_secret: process.env.WHOOP_CLIENT_SECRET
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Whoop token exchange failed: ${data.error_description || data.error}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Whoop token error:', error);
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
        
        const response = await fetch(`https://api.prod.whoop.com/developer/v1/recovery?start=${start}&end=${end}`, {
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
        
        const response = await fetch(`https://api.prod.whoop.com/developer/v1/activity/sleep?start=${start}&end=${end}`, {
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
        
        const response = await fetch(`https://api.prod.whoop.com/developer/v1/activity/workout?start=${start}&end=${end}`, {
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
        
        const response = await fetch(`https://api.prod.whoop.com/developer/v1/cycle?start=${start}&end=${end}`, {
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

// ===== GARMIN ENDPOINTS =====
const crypto = require('crypto');

// Garmin OAuth 2.0 token exchange
app.post('/api/garmin/token', async (req, res) => {
    try {
        const { code, client_id, redirect_uri, code_verifier } = req.body;
        
        if (!code || !redirect_uri || !client_id || !code_verifier) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // IMPORTANT: Use connect.garmin.com, not apis.garmin.com or apis-secure
        const tokenUrl = 'https://connect.garmin.com/oauth2/token';
        console.log('Garmin OAuth 2.0 token exchange URL:', tokenUrl);
        console.log('Request params:', { code: code?.substring(0, 10) + '...', client_id, redirect_uri });
        
        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirect_uri);
        params.append('client_id', client_id);
        params.append('code_verifier', code_verifier);
        
        // Try with Basic auth first (for confidential clients)
        const clientSecret = process.env.GARMIN_CONSUMER_SECRET;
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        
        if (clientSecret) {
            // Add Basic authentication
            const basic = Buffer.from(`${client_id}:${clientSecret}`).toString('base64');
            headers['Authorization'] = `Basic ${basic}`;
            console.log('Using Basic authentication for token exchange');
        } else {
            // Fallback: include client_secret in form data if no Basic auth
            if (clientSecret) {
                params.append('client_secret', clientSecret);
            }
        }
        
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: headers,
            body: params.toString()
        });
        
        const responseText = await response.text();
        console.log('Garmin token response status:', response.status);
        
        if (!response.ok) {
            console.error('Garmin token exchange failed:', responseText);
            return res.status(response.status).send(responseText);
        }
        
        // Send response as JSON
        res.type('application/json').send(responseText);
        
    } catch (error) {
        console.error('Garmin OAuth 2.0 token error:', error);
        res.status(500).json({ error: `Garmin token exchange failed: ${error.message}` });
    }
});

// OAuth 1.0a signature generation for Garmin (keeping for backward compatibility)
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret = '') {
    const paramString = Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
    
    const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
    
    return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

// Step 1: Get request token
app.post('/api/garmin/request-token', async (req, res) => {
    try {
        const requestTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/request_token';
        
        const oauthParams = {
            oauth_callback: 'https://www.athlytx.com',
            oauth_consumer_key: process.env.GARMIN_CONSUMER_KEY,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_version: '1.0'
        };
        
        const signature = generateOAuthSignature('POST', requestTokenUrl, oauthParams, process.env.GARMIN_CONSUMER_SECRET);
        oauthParams.oauth_signature = signature;
        
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');
        
        const response = await fetch(requestTokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            throw new Error(`Garmin request token failed: ${responseText}`);
        }
        
        const params = new URLSearchParams(responseText);
        const requestToken = params.get('oauth_token');
        const requestTokenSecret = params.get('oauth_token_secret');
        
        res.json({
            oauth_token: requestToken,
            oauth_token_secret: requestTokenSecret,
            authorize_url: `https://connect.garmin.com/oauthConfirm?oauth_token=${requestToken}`
        });
        
    } catch (error) {
        console.error('Garmin request token error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Step 2: Exchange for access token
app.post('/api/garmin/access-token', async (req, res) => {
    try {
        const { oauth_token, oauth_verifier, oauth_token_secret } = req.body;
        
        const accessTokenUrl = 'https://connectapi.garmin.com/oauth-service/oauth/access_token';
        
        const oauthParams = {
            oauth_consumer_key: process.env.GARMIN_CONSUMER_KEY,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: oauth_token,
            oauth_verifier: oauth_verifier,
            oauth_version: '1.0'
        };
        
        const signature = generateOAuthSignature('POST', accessTokenUrl, oauthParams, process.env.GARMIN_CONSUMER_SECRET, oauth_token_secret);
        oauthParams.oauth_signature = signature;
        
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');
        
        const response = await fetch(accessTokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const responseText = await response.text();
        
        if (!response.ok) {
            throw new Error(`Garmin access token failed: ${responseText}`);
        }
        
        const params = new URLSearchParams(responseText);
        
        res.json({
            oauth_token: params.get('oauth_token'),
            oauth_token_secret: params.get('oauth_token_secret')
        });
        
    } catch (error) {
        console.error('Garmin access token error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Garmin data endpoints (OAuth 2.0 support)
app.get('/api/garmin/user', async (req, res) => {
    try {
        const { oauth_token, oauth_token_secret, token } = req.query;
        
        // If OAuth 2.0 token is provided, use it
        if (token) {
            const response = await fetch('https://apis.garmin.com/wellness-api/rest/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(`Garmin user fetch failed: ${data.message || JSON.stringify(data)}`);
            }
            
            res.json(data);
            return;
        }
        
        // Fallback to OAuth 1.0a for backward compatibility
        const userUrl = 'https://healthapi.garmin.com/wellness-api/rest/user/id';
        
        const oauthParams = {
            oauth_consumer_key: process.env.GARMIN_CONSUMER_KEY,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: oauth_token,
            oauth_version: '1.0'
        };
        
        const signature = generateOAuthSignature('GET', userUrl, oauthParams, process.env.GARMIN_CONSUMER_SECRET, oauth_token_secret);
        oauthParams.oauth_signature = signature;
        
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');
        
        const response = await fetch(userUrl, {
            headers: {
                'Authorization': authHeader
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Garmin user fetch failed: ${data.message}`);
        }
        
        res.json(data);
        
    } catch (error) {
        console.error('Garmin user error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/activities', async (req, res) => {
    try {
        const { oauth_token, oauth_token_secret, start_date, end_date } = req.query;
        
        const activitiesUrl = `https://healthapi.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${start_date}&uploadEndTimeInSeconds=${end_date}`;
        
        const oauthParams = {
            oauth_consumer_key: process.env.GARMIN_CONSUMER_KEY,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: oauth_token,
            oauth_version: '1.0'
        };
        
        const signature = generateOAuthSignature('GET', activitiesUrl, oauthParams, process.env.GARMIN_CONSUMER_SECRET, oauth_token_secret);
        oauthParams.oauth_signature = signature;
        
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');
        
        const response = await fetch(activitiesUrl, {
            headers: {
                'Authorization': authHeader
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

app.get('/api/garmin/dailies', async (req, res) => {
    try {
        const { oauth_token, oauth_token_secret, start_date, end_date } = req.query;
        
        const dailiesUrl = `https://healthapi.garmin.com/wellness-api/rest/dailies?uploadStartTimeInSeconds=${start_date}&uploadEndTimeInSeconds=${end_date}`;
        
        const oauthParams = {
            oauth_consumer_key: process.env.GARMIN_CONSUMER_KEY,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: oauth_token,
            oauth_version: '1.0'
        };
        
        const signature = generateOAuthSignature('GET', dailiesUrl, oauthParams, process.env.GARMIN_CONSUMER_SECRET, oauth_token_secret);
        oauthParams.oauth_signature = signature;
        
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');
        
        const response = await fetch(dailiesUrl, {
            headers: {
                'Authorization': authHeader
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Garmin dailies fetch failed: ${data.message}`);
        }
        
        res.json(data);
        
    } catch (error) {
        console.error('Garmin dailies error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/sleep', async (req, res) => {
    try {
        const { oauth_token, oauth_token_secret, start_date, end_date } = req.query;
        
        const sleepUrl = `https://healthapi.garmin.com/wellness-api/rest/sleepData?uploadStartTimeInSeconds=${start_date}&uploadEndTimeInSeconds=${end_date}`;
        
        const oauthParams = {
            oauth_consumer_key: process.env.GARMIN_CONSUMER_KEY,
            oauth_nonce: crypto.randomBytes(16).toString('hex'),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_token: oauth_token,
            oauth_version: '1.0'
        };
        
        const signature = generateOAuthSignature('GET', sleepUrl, oauthParams, process.env.GARMIN_CONSUMER_SECRET, oauth_token_secret);
        oauthParams.oauth_signature = signature;
        
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');
        
        const response = await fetch(sleepUrl, {
            headers: {
                'Authorization': authHeader
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✅ Athlytx Backend running on port ${PORT}`);
    console.log('🔐 Environment check:');
    console.log(`  - Strava: ${process.env.STRAVA_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Oura: ${process.env.OURA_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Whoop: ${process.env.WHOOP_CLIENT_SECRET ? '✅' : '❌'}`);
    console.log(`  - Garmin: ${process.env.GARMIN_CONSUMER_SECRET ? '✅' : '❌'}`);
});
