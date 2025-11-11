// Test script for Garmin OAuth 2.0 with PKCE
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// OAuth 2.0 parameters
const client_id = 'ee6809d5-abc0-4a33-b38a-d433e5045987';
const client_secret = process.env.GARMIN_CONSUMER_SECRET || 'YOUR_SECRET_HERE';
const redirect_uri = 'https://www.athlytx.com';

// Generate code verifier for PKCE
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

// Generate code challenge from verifier
function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Generate authorization URL for OAuth 2.0 with PKCE
function generateAuthorizationUrl() {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
        client_id: client_id,
        response_type: 'code',
        redirect_uri: redirect_uri,
        scope: 'HEALTH_READ',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });

    const authUrl = `https://connect.garmin.com/oauth2Confirm?${params.toString()}`;

    return {
        authUrl,
        codeVerifier,
        state
    };
}

// Exchange authorization code for access token
async function exchangeCodeForToken(authorizationCode, codeVerifier) {
    const tokenData = querystring.stringify({
        grant_type: 'authorization_code',
        client_id: client_id,
        client_secret: client_secret,
        code: authorizationCode,
        redirect_uri: redirect_uri,
        code_verifier: codeVerifier
    });

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'connectapi.garmin.com',
            path: '/oauth-service/oauth/access_token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(tokenData)
            }
        };

        console.log('\nToken Exchange Request Options:', JSON.stringify(options, null, 2));
        console.log('Token Exchange Data:', tokenData);

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('\nToken Response Status:', res.statusCode);
                console.log('Token Response Headers:', res.headers);
                console.log('Token Response Body:', data);

                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        const parsed = querystring.parse(data);
                        resolve(parsed);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(tokenData);
        req.end();
    });
}

// Test API call with access token
async function testApiCall(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'apis.garmin.com',
            path: '/wellness-api/rest/user/permissions',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        console.log('\nAPI Test Request Options:', JSON.stringify(options, null, 2));

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('\nAPI Response Status:', res.statusCode);
                console.log('API Response Headers:', res.headers);
                console.log('API Response Body:', data);

                if (res.statusCode === 200) {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

// Test the OAuth 2.0 flow
async function testGarminOAuth() {
    console.log('Testing Garmin OAuth 2.0 with PKCE Flow');
    console.log('========================================');
    console.log('Client ID:', client_id);
    console.log('Client Secret:', client_secret ? '***' + client_secret.slice(-4) : 'NOT SET');
    console.log('Redirect URI:', redirect_uri);

    if (!client_secret || client_secret === 'YOUR_SECRET_HERE') {
        console.error('\n❌ ERROR: GARMIN_CONSUMER_SECRET not found in environment variables!');
        console.log('Please ensure your .env file contains: GARMIN_CONSUMER_SECRET=your_actual_secret');
        return;
    }

    try {
        console.log('\n📡 Generating OAuth 2.0 authorization URL...\n');
        const { authUrl, codeVerifier, state } = generateAuthorizationUrl();

        console.log('✅ Authorization URL generated:');
        console.log('URL:', authUrl);
        console.log('State:', state);
        console.log('Code Verifier (save this):', codeVerifier);

        console.log('\n📋 Next steps:');
        console.log('1. Visit the authorization URL above');
        console.log('2. Log in to your Garmin account');
        console.log('3. Grant permissions to your app');
        console.log('4. You will be redirected to your redirect URI with a code parameter');
        console.log('5. Use that code with the exchangeCodeForToken function');

        console.log('\n💡 To test token exchange, run:');
        console.log('exchangeCodeForToken("YOUR_AUTH_CODE", "' + codeVerifier + '")');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.log('\nPossible issues:');
        console.log('1. Invalid client ID or secret');
        console.log('2. Redirect URI not registered with Garmin');
        console.log('3. App not approved for OAuth 2.0');
    }
}

// Run the test
testGarminOAuth();