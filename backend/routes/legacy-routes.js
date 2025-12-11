const fetch = require('node-fetch');

// This module exports all existing OAuth routes
module.exports = function(app) {

// ===== STRAVA ENDPOINTS =====
app.post('/api/strava/token', async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.userId || req.body.userId;

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
                grant_type: 'authorization_code',
                redirect_uri: process.env.STRAVA_REDIRECT_URI || 'https://www.athlytx.com'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Strava token exchange failed: ${data.message}`);
        }

        // **CRITICAL:** Save token to database so data can be associated with user
        try {
            console.log('\n💾 === SAVING STRAVA TOKEN TO DATABASE ===');

            const { OAuthToken } = require('../models');
            const { encrypt } = require('../utils/encryption');

            const userId = req.session?.userId || req.body.userId;

            if (!userId) {
                console.error('❌ CRITICAL: No userId available - token will NOT be saved to database!');
                console.error('   User will need to reconnect! This is a BUG that must be fixed!');
                return res.status(400).json({
                    error: 'No user session',
                    message: 'You must be logged in to connect Strava'
                });
            }

            const expiryTimestamp = Date.now() + (data.expires_in * 1000);
            const stravaUserId = data.athlete?.id?.toString();

            await OAuthToken.upsert({
                userId: userId,
                provider: 'strava',
                providerUserId: stravaUserId,
                accessTokenEncrypted: encrypt(data.access_token),
                refreshTokenEncrypted: data.refresh_token ? encrypt(data.refresh_token) : null,
                expiresAt: new Date(expiryTimestamp),
                scopes: data.scope || null
            });

            console.log('✅ Strava token saved to database for user:', userId);
            console.log('   Athlete ID:', stravaUserId);

            // Log successful OAuth flow to database
            const { logAPICall } = require('../utils/logger');
            await logAPICall({
                method: 'POST',
                endpoint: '/api/strava/token',
                statusCode: 200,
                durationMs: Date.now() - startTime,
                userId: userId,
                provider: 'strava',
                requestBody: req.body,
                responseBody: data,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                isOAuthFlow: true,
                tags: ['oauth', 'token_exchange', 'strava']
            });
        } catch (dbError) {
            console.error('❌ CRITICAL: Failed to save Strava token to database:', dbError);

            // Log OAuth failure to database
            const { logAPICall } = require('../utils/logger');
            await logAPICall({
                method: 'POST',
                endpoint: '/api/strava/token',
                statusCode: 500,
                durationMs: Date.now() - startTime,
                userId: userId,
                provider: 'strava',
                requestBody: req.body,
                errorMessage: dbError.message,
                errorStack: dbError.stack,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                isOAuthFlow: true,
                tags: ['oauth', 'token_exchange', 'strava', 'error', 'database_save_failed']
            });

            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to save connection. Please try again.'
            });
        }

        res.json(data);
    } catch (error) {
        console.error('Strava token error:', error);

        // Log OAuth error to database
        const { logAPICall } = require('../utils/logger');
        await logAPICall({
            method: 'POST',
            endpoint: '/api/strava/token',
            statusCode: 500,
            durationMs: Date.now() - startTime,
            userId: userId,
            provider: 'strava',
            requestBody: req.body,
            errorMessage: error.message,
            errorStack: error.stack,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            isOAuthFlow: true,
            tags: ['oauth', 'token_exchange', 'strava', 'error']
        });

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

// Get Strava activities from database (not Strava API)
app.get('/api/strava/db/activities', async (req, res) => {
    try {
        const { Activity } = require('../models');
        const userId = req.query.userId;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        const activities = await Activity.findAll({
            where: {
                userId: userId,
                provider: 'strava'
            },
            order: [['startTime', 'DESC']],
            limit: 100,
            raw: true
        });

        console.log(`✅ Fetched ${activities.length} Strava activities from database for user ${userId}`);

        // Transform database format to match Strava API format for frontend compatibility
        const formattedActivities = activities.map(act => ({
            id: act.externalId,
            type: act.activityType,
            name: act.activityName,
            start_date: act.startTime,
            moving_time: act.durationSeconds,
            distance: act.distanceMeters,
            calories: act.calories,
            average_heartrate: act.avgHr,
            max_heartrate: act.maxHr,
            suffer_score: act.rawData?.suffer_score,
            total_elevation_gain: act.rawData?.total_elevation_gain,
            average_watts: act.rawData?.average_watts,
            device_watts: act.rawData?.device_watts,
            has_heartrate: act.avgHr ? true : false,
            // Include any additional fields from rawData
            ...act.rawData
        }));

        res.json({ activities: formattedActivities });
    } catch (error) {
        console.error('Strava DB activities error:', error);
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

        // **CRITICAL:** Save token to database so data can be associated with user
        try {
            console.log('\n💾 === SAVING OURA TOKEN TO DATABASE ===');

            const { OAuthToken } = require('../models');
            const { encrypt } = require('../utils/encryption');

            const userId = req.session?.userId || req.body.userId;

            if (!userId) {
                console.error('❌ CRITICAL: No userId available - token will NOT be saved to database!');
                console.error('   User will need to reconnect! This is a BUG that must be fixed!');
                return res.status(400).json({
                    error: 'No user session',
                    message: 'You must be logged in to connect Oura'
                });
            }

            const expiryTimestamp = Date.now() + (data.expires_in * 1000);

            // Get Oura user ID from personal info endpoint
            let ouraUserId = null;
            try {
                const personalResponse = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
                    headers: { 'Authorization': `Bearer ${data.access_token}` }
                });
                const personalData = await personalResponse.json();
                ouraUserId = personalData.id;
            } catch (e) {
                console.warn('⚠️ Could not fetch Oura user ID:', e.message);
            }

            await OAuthToken.upsert({
                userId: userId,
                provider: 'oura',
                providerUserId: ouraUserId,
                accessTokenEncrypted: encrypt(data.access_token),
                refreshTokenEncrypted: data.refresh_token ? encrypt(data.refresh_token) : null,
                expiresAt: new Date(expiryTimestamp),
                scopes: null
            });

            console.log('✅ Oura token saved to database for user:', userId);
            console.log('   Oura User ID:', ouraUserId);
        } catch (dbError) {
            console.error('❌ CRITICAL: Failed to save Oura token to database:', dbError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to save connection. Please try again.'
            });
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

        // **CRITICAL:** Save token to database so data can be associated with user
        try {
            console.log('\n💾 === SAVING WHOOP TOKEN TO DATABASE ===');

            const { OAuthToken, User } = require('../models');
            const { encrypt } = require('../utils/encryption');
            // Prefer session token (Bearer or sessionToken param) for logged-in users
            const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.query.sessionToken || req.body.sessionToken;
            const requestedUserId = req.session?.userId || req.body.userId;

            let userId = null;

            if (sessionToken) {
                const user = await User.findOne({
                    where: { sessionToken, sessionExpiry: { [require('sequelize').Op.gt]: new Date() } },
                    attributes: ['id']
                });
                if (user) {
                    userId = user.id;
                }
            }

            if (!userId && requestedUserId) {
                // Fallback for guest/legacy flows, but ensure user exists
                const user = await User.findOne({ where: { id: requestedUserId }, attributes: ['id'] });
                if (user) {
                    userId = user.id;
                }
            }

            if (!userId) {
                console.error('❌ CRITICAL: No valid user found for Whoop connect; aborting save');
                return res.status(400).json({
                    error: 'No user session',
                    message: 'Please log in and retry Whoop connect.'
                });
            }

            const expiryTimestamp = Date.now() + (data.expires_in * 1000);

            // Get Whoop user ID from profile endpoint
            let whoopUserId = null;
            try {
                const profileResponse = await fetch('https://api.prod.whoop.com/developer/v2/user/profile/basic', {
                    headers: { 'Authorization': `Bearer ${data.access_token}` }
                });
                const profileData = await profileResponse.json();
                whoopUserId = profileData.user_id?.toString();
            } catch (e) {
                console.warn('⚠️ Could not fetch Whoop user ID:', e.message);
            }

            await OAuthToken.upsert({
                userId: userId,
                provider: 'whoop',
                providerUserId: whoopUserId,
                accessTokenEncrypted: encrypt(data.access_token),
                refreshTokenEncrypted: data.refresh_token ? encrypt(data.refresh_token) : null,
                expiresAt: new Date(expiryTimestamp),
                scopes: data.scope || null
            });

            console.log('✅ Whoop token saved to database for user:', userId);
            console.log('   Whoop User ID:', whoopUserId);
        } catch (dbError) {
            console.error('❌ CRITICAL: Failed to save Whoop token to database:', dbError);
            return res.status(500).json({
                error: 'Database error',
                message: 'Failed to save connection. Please try again.'
            });
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Whoop token error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's saved OAuth tokens from database
app.get('/api/user/tokens', async (req, res) => {
    try {
        const userId = req.query.userId || req.session?.userId;

        if (!userId) {
            return res.status(400).json({ error: 'No userId provided' });
        }

        const { OAuthToken } = require('../models');
        const { decrypt } = require('../utils/encryption');

        // Fetch all tokens for this user
        const tokens = await OAuthToken.findAll({
            where: { userId },
            attributes: ['provider', 'accessTokenEncrypted', 'refreshTokenEncrypted', 'expiresAt', 'scopes']
        });

        // Decrypt and format tokens for frontend
        const decryptedTokens = {};
        for (const token of tokens) {
            decryptedTokens[token.provider] = {
                access_token: decrypt(token.accessTokenEncrypted),
                refresh_token: token.refreshTokenEncrypted ? decrypt(token.refreshTokenEncrypted) : null,
                expires_at: token.expiresAt,
                expiry: token.expiresAt ? new Date(token.expiresAt).getTime() : null,
                scopes: token.scopes
            };
        }

        console.log(`✅ Loaded ${Object.keys(decryptedTokens).length} saved tokens for user ${userId}`);

        res.json({ tokens: decryptedTokens });
    } catch (error) {
        console.error('❌ Error loading user tokens:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/profile', async (req, res) => {
    try {
        const { token } = req.query;

        const response = await fetch('https://api.prod.whoop.com/developer/v2/user/profile/basic', {
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

        const url = `https://api.prod.whoop.com/developer/v2/recovery?start=${start}&end=${end}&limit=25`;
        console.log('Fetching Whoop recovery:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Whoop recovery error response:', errorText);
            throw new Error(`Whoop recovery fetch failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();

        // V2 API returns recovery objects directly with correct structure
        res.json(data);
    } catch (error) {
        console.error('Whoop recovery error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/sleep', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://api.prod.whoop.com/developer/v2/activity/sleep?start=${start}&end=${end}&limit=25`;
        console.log('Fetching Whoop sleep:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Whoop sleep error response:', errorText);
            throw new Error(`Whoop sleep fetch failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();

        // V2 API returns sleep objects directly
        res.json(data);
    } catch (error) {
        console.error('Whoop sleep error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/workouts', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://api.prod.whoop.com/developer/v2/activity/workout?start=${start}&end=${end}&limit=25`;
        console.log('Fetching Whoop workouts:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Whoop workouts error response:', errorText);
            throw new Error(`Whoop workouts fetch failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();

        // V2 API returns workout objects directly
        res.json(data);
    } catch (error) {
        console.error('Whoop workouts error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/whoop/cycles', async (req, res) => {
    try {
        const { token, start, end } = req.query;

        const url = `https://api.prod.whoop.com/developer/v2/cycle?start=${start}&end=${end}&limit=25`;
        console.log('Fetching Whoop cycles:', url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Whoop cycles error response:', errorText);
            throw new Error(`Whoop cycles fetch failed: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Whoop cycles error:', error);
        res.status(500).json({ error: error.message });
    }
});

// WHOOP Token Refresh Endpoint
app.post('/api/whoop/refresh', async (req, res) => {
    try {
        const { refresh_token, client_id, client_secret } = req.body;

        console.log('🔄 Whoop token refresh attempt:', {
            has_refresh_token: !!refresh_token,
            has_client_id: !!client_id,
            has_client_secret: !!client_secret
        });

        const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                client_id: client_id || process.env.WHOOP_CLIENT_ID,
                client_secret: client_secret || process.env.WHOOP_CLIENT_SECRET
            })
        });

        const data = await response.json();

        console.log('🔄 Whoop refresh response:', {
            status: response.status,
            hasAccessToken: !!data.access_token,
            error: data.error
        });

        if (!response.ok) {
            throw new Error(`Whoop token refresh failed: ${data.error || data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Whoop token refresh error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== GARMIN ENDPOINTS (OAuth 2.0 with PKCE) =====
app.post('/api/garmin/token', async (req, res) => {
    const startTime = Date.now();
    const userId = req.session?.userId || req.body.userId;

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

        // PRIMARY METHOD: Extract Garmin User ID from JWT access token (most reliable)
        console.log('\n📝 === EXTRACTING GARMIN USER ID FROM JWT ===');
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
                console.warn('JWT payload:', JSON.stringify(payload, null, 2));
            }
        } catch (jwtError) {
            console.error('⚠️ Failed to decode JWT:', jwtError.message);
        }

        // For OAuth2 apps there is no separate POST registration step; bearer access token is sufficient for push.

        // **CRITICAL:** Save token to database so PUSH webhooks can find the user
        try {
            console.log('\n💾 === SAVING GARMIN TOKEN TO DATABASE ===');

            const { OAuthToken, Activity } = require('../models');
            const { encrypt } = require('../utils/encryption');

            // Get userId from session or request
            let userId = req.session?.userId || req.body.userId;

            if (!userId) {
                console.warn('⚠️ No userId available - token will not be saved to database');
                console.warn('   PUSH notifications will not work without database storage!');
            } else {
                // Canonicalize ownership for this Garmin GUID across guest/registered accounts
                if (garminUserId) {
                    const { User } = require('../models');
                    const allTokens = await OAuthToken.findAll({
                        where: { provider: 'garmin', providerUserId: garminUserId },
                        include: [{ model: User }]
                    });

                    if (allTokens.length > 0) {
                        // Prefer a non-guest (registered) user if present
                        const registeredHolder = allTokens.find(t => t.User && t.User.isGuest === false);
                        let canonicalUserId = registeredHolder ? registeredHolder.userId : userId;

                        // If none registered yet, but there is an existing token owner, prefer that existing owner
                        if (!registeredHolder && allTokens[0] && allTokens[0].userId) {
                            canonicalUserId = allTokens.some(t => t.userId === userId) ? userId : allTokens[0].userId;
                        }

                        if (canonicalUserId !== userId) {
                            console.log(`🔄 Canonical Garmin owner resolved: ${canonicalUserId} (was ${userId})`);
                            // Move any activities and dailies from current userId to canonical
                            const { DailyMetric } = require('../models');
                            const migratedActs = await Activity.update(
                                { userId: canonicalUserId },
                                { where: { userId, provider: 'garmin' } }
                            );
                            const migratedDailies = await DailyMetric.update(
                                { userId: canonicalUserId },
                                { where: { userId } }
                            );
                            console.log(`   Migrated activities: ${migratedActs[0]}, dailies: ${migratedDailies[0]}`);
                            userId = canonicalUserId;
                            data.userId = userId;
                        }

                        // Remove duplicate tokens for same GUID under other users, keep newest under canonical
                        const newest = [...allTokens].sort((a,b) => new Date(b.connectedAt) - new Date(a.connectedAt))[0];
                        await Promise.all(allTokens
                            .filter(t => t.id !== newest.id)
                            .map(async (t) => {
                                if (t.userId !== userId) {
                                    await t.destroy();
                                }
                            })
                        );
                    } else {
                        console.log(`🆕 New Garmin connection for ${garminUserId} with userId ${userId}`);
                    }
                }

                const expiryTimestamp = Date.now() + (data.expires_in * 1000);

                await OAuthToken.upsert({
                    userId: userId,
                    provider: 'garmin',
                    providerUserId: garminUserId,
                    accessTokenEncrypted: encrypt(data.access_token),
                    refreshTokenEncrypted: data.refresh_token ? encrypt(data.refresh_token) : null,
                    expiresAt: new Date(expiryTimestamp),
                    scopes: data.scope || null
                });

                console.log('✅ Garmin token saved to database for user:', userId);
                console.log('   Provider User ID:', garminUserId);

                // Log successful OAuth flow to database
                const { logAPICall } = require('../utils/logger');
                await logAPICall({
                    method: 'POST',
                    endpoint: '/api/garmin/token',
                    statusCode: 200,
                    durationMs: Date.now() - startTime,
                    userId: userId,
                    provider: 'garmin',
                    requestBody: req.body,
                    responseBody: data,
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    isOAuthFlow: true,
                    tags: ['oauth', 'token_exchange', 'garmin', 'success']
                });
            }
        } catch (dbError) {
            console.error('❌ Failed to save token to database (CRITICAL):', dbError);
            console.error('   PUSH notifications will NOT work without database storage!');

            // Log OAuth failure to database
            const { logAPICall } = require('../utils/logger');
            await logAPICall({
                method: 'POST',
                endpoint: '/api/garmin/token',
                statusCode: 500,
                durationMs: Date.now() - startTime,
                userId: userId,
                provider: 'garmin',
                requestBody: req.body,
                errorMessage: dbError.message,
                errorStack: dbError.stack,
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                isOAuthFlow: true,
                tags: ['oauth', 'token_exchange', 'garmin', 'error', 'database_save_failed']
            });
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Garmin token error:', error);

        // Log OAuth error to database
        const { logAPICall } = require('../utils/logger');
        await logAPICall({
            method: 'POST',
            endpoint: '/api/garmin/token',
            statusCode: 500,
            durationMs: Date.now() - startTime,
            userId: userId,
            provider: 'garmin',
            requestBody: req.body,
            errorMessage: error.message,
            errorStack: error.stack,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            isOAuthFlow: true,
            tags: ['oauth', 'token_exchange', 'garmin', 'error']
        });

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
        // Empty body per Garmin Health API spec - user registration doesn't require request body
        const response = await signAndFetch('/user/registration', 'POST', token, {});

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

// Garmin Token Refresh Endpoint
app.post('/api/garmin/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        console.log('🔄 Garmin token refresh attempt');

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
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            })
        });

        const data = await response.json();

        console.log('🔄 Garmin refresh response:', {
            status: response.status,
            hasAccessToken: !!data.access_token
        });

        if (!response.ok) {
            throw new Error(`Garmin token refresh failed: ${data.error || data.message}`);
        }

        res.json(data);
    } catch (error) {
        console.error('❌ Garmin token refresh error:', error);
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

// NEW: Database-backed endpoints for displaying Garmin data (compliant with PUSH-only)
// These endpoints fetch data that was received via PUSH webhooks, not from Garmin API

app.get('/api/garmin/db/activities', async (req, res) => {
    try {
        const { Activity } = require('../models');
        const userId = req.query.userId;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        const activities = await Activity.findAll({
            where: {
                userId: userId,
                provider: 'garmin'
            },
            order: [['startTime', 'DESC']],
            limit: 30
        });

        console.log(`✅ Fetched ${activities.length} Garmin activities from database for user ${userId}`);

        res.json({
            activities: activities.map(a => ({
                activityId: a.externalId,
                activityType: a.activityType,
                activityName: a.activityName,
                startTimeInSeconds: Math.floor(new Date(a.startTime).getTime() / 1000),
                durationInSeconds: a.durationSeconds,
                distanceInMeters: a.distanceMeters,
                activeKilocalories: a.calories,
                averageHeartRateInBeatsPerMinute: a.avgHr,
                maxHeartRateInBeatsPerMinute: a.maxHr,
                deviceModel: a.deviceModel
            }))
        });

    } catch (error) {
        console.error('❌ Error fetching Garmin activities from database:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/garmin/db/dailies', async (req, res) => {
    try {
        const { DailyMetric } = require('../models');
        const userId = req.query.userId;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        const dailyMetrics = await DailyMetric.findAll({
            where: {
                userId: userId
            },
            order: [['date', 'DESC']],
            limit: 30
        });

        console.log(`✅ Fetched ${dailyMetrics.length} Garmin daily summaries from database for user ${userId}`);

        res.json({
            dailies: dailyMetrics.map(d => ({
                calendarDate: d.date,
                steps: d.steps,
                restingHr: d.restingHr,
                sleepHours: d.sleepHours,
                hrvAvg: d.hrvAvg,
                bodyBatteryHighestValue: d.bodyBatteryHighestValue,
                bodyBatteryLowestValue: d.bodyBatteryLowestValue,
                averageStressLevel: d.averageStressLevel,
                avgWakingRespirationValue: d.avgWakingRespirationValue
            }))
        });

    } catch (error) {
        console.error('❌ Error fetching Garmin dailies from database:', error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG: Get ALL Garmin activities and tokens in database
app.get('/api/debug/garmin/all', async (req, res) => {
    try {
        const { Activity, OAuthToken } = require('../models');

        const activities = await Activity.findAll({
            where: { provider: 'garmin' },
            attributes: ['id', 'userId', 'externalId', 'activityType', 'startTime', 'distanceMeters', 'durationSeconds'],
            order: [['startTime', 'DESC']],
            limit: 100
        });

        const tokens = await OAuthToken.findAll({
            where: { provider: 'garmin' },
            attributes: ['userId', 'providerUserId', 'connectedAt']
        });

        console.log(`📊 DEBUG: Found ${activities.length} Garmin activities and ${tokens.length} tokens`);

        res.json({
            totalActivities: activities.length,
            totalTokens: tokens.length,
            activities: activities,
            tokens: tokens
        });
    } catch (error) {
        console.error('❌ Error querying Garmin data:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Remove specific Garmin activity by externalId
app.delete('/api/debug/garmin/activity/:externalId', async (req, res) => {
    try {
        const { externalId } = req.params;
        const { Activity } = require('../models');

        const result = await Activity.destroy({
            where: {
                externalId: externalId,
                provider: 'garmin'
            }
        });

        console.log(`✅ Deleted ${result} Garmin activity with externalId ${externalId}`);

        res.json({
            success: true,
            deleted: result,
            externalId
        });
    } catch (error) {
        console.error('❌ Error deleting Garmin activity:', error);
        res.status(500).json({ error: error.message });
    }
});

// EMERGENCY: Separate mixed user data by device model
// This fixes data breach where two users' activities got merged under same userId
app.post('/api/debug/garmin/separate-by-device', async (req, res) => {
    try {
        const { currentUserId, deviceToSeparate, newUserEmail } = req.body;
        const { Activity, HeartRateZone, User } = require('../models');
        const { v4: uuidv4 } = require('uuid');

        if (!currentUserId || !deviceToSeparate) {
            return res.status(400).json({
                error: 'currentUserId and deviceToSeparate required'
            });
        }

        console.log(`🔧 EMERGENCY: Separating device "${deviceToSeparate}" from user ${currentUserId}`);

        // 1. Find all activities with this device
        const activitiesToMove = await Activity.findAll({
            where: {
                userId: currentUserId,
                provider: 'garmin'
            }
        });

        // Filter by device in rawData
        const matchingActivities = activitiesToMove.filter(a => {
            const raw = a.rawData || {};
            const device = raw.deviceName || raw.deviceModel || '';
            return device.toLowerCase().includes(deviceToSeparate.toLowerCase());
        });

        console.log(`📊 Found ${matchingActivities.length} activities with device "${deviceToSeparate}"`);

        if (matchingActivities.length === 0) {
            return res.json({
                success: false,
                message: `No activities found with device "${deviceToSeparate}"`,
                hint: 'Check device names in /api/debug/garmin/all'
            });
        }

        // 2. Create new user for the separated data
        const newUserId = uuidv4();
        const email = newUserEmail || `separated-user-${newUserId.substring(0, 8)}@athlytx.com`;

        await User.create({
            id: newUserId,
            email: email,
            name: `User (${deviceToSeparate})`,
            role: 'athlete',
            isActive: true
        });

        console.log(`✅ Created new user: ${newUserId}`);

        // 3. Move activities to new user
        const activityIds = matchingActivities.map(a => a.id);
        await Activity.update(
            { userId: newUserId },
            { where: { id: activityIds } }
        );

        console.log(`✅ Moved ${activityIds.length} activities to new user`);

        // 4. Move related HR zones
        const movedZones = await HeartRateZone.update(
            { userId: newUserId },
            { where: { activityId: activityIds } }
        );

        console.log(`✅ Moved ${movedZones[0]} HR zone records`);

        res.json({
            success: true,
            message: `Successfully separated ${matchingActivities.length} activities`,
            newUserId: newUserId,
            newUserEmail: email,
            movedActivities: activityIds.length,
            movedHrZones: movedZones[0],
            nextSteps: [
                'The other user should clear localStorage and reconnect Garmin',
                'You may need to reconnect your Garmin as well',
                `New user can login with email: ${email}`
            ]
        });

    } catch (error) {
        console.error('Error separating users:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get activities grouped by device model
app.get('/api/debug/garmin/by-device', async (req, res) => {
    try {
        const { userId } = req.query;
        const { Activity } = require('../models');

        const where = { provider: 'garmin' };
        if (userId) where.userId = userId;

        const activities = await Activity.findAll({
            where,
            order: [['startTime', 'DESC']],
            limit: 200
        });

        // Group by device
        const byDevice = {};
        activities.forEach(a => {
            const raw = a.rawData || {};
            const device = raw.deviceName || raw.deviceModel || 'Unknown';
            if (!byDevice[device]) {
                byDevice[device] = {
                    count: 0,
                    activities: [],
                    userIds: new Set()
                };
            }
            byDevice[device].count++;
            byDevice[device].userIds.add(a.userId);
            byDevice[device].activities.push({
                id: a.id,
                name: a.activityName,
                type: a.activityType,
                date: a.startTime,
                userId: a.userId
            });
        });

        // Convert Sets to arrays for JSON
        Object.keys(byDevice).forEach(device => {
            byDevice[device].userIds = Array.from(byDevice[device].userIds);
        });

        res.json({
            totalActivities: activities.length,
            devices: byDevice
        });

    } catch (error) {
        console.error('Error grouping by device:', error);
        res.status(500).json({ error: error.message });
    }
});

// MIGRATE: Move Garmin activities from one userId to another
app.post('/api/debug/garmin/migrate', async (req, res) => {
    try {
        const { fromUserId, toUserId } = req.body;

        if (!fromUserId || !toUserId) {
            return res.status(400).json({ error: 'fromUserId and toUserId required' });
        }

        const { Activity } = require('../models');

        const result = await Activity.update(
            { userId: toUserId },
            {
                where: {
                    userId: fromUserId,
                    provider: 'garmin'
                }
            }
        );

        console.log(`✅ Migrated ${result[0]} Garmin activities from ${fromUserId} to ${toUserId}`);

        res.json({
            success: true,
            migrated: result[0],
            fromUserId,
            toUserId
        });
    } catch (error) {
        console.error('❌ Error migrating Garmin activities:', error);
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ Legacy OAuth routes loaded');

}; // End of module.exports
