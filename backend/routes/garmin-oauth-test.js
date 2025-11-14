const express = require('express');
const router = express.Router();
const { OAuthToken } = require('../models');
const { decrypt } = require('../utils/encryption');
const GarminOAuth1Hybrid = require('../utils/garmin-oauth1-hybrid');
const fetch = require('node-fetch');

/**
 * Test OAuth 1.0a signature generation for Garmin Wellness API
 * GET /api/garmin/test/signature/:userId
 */
router.get('/signature/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        console.log('\n=== GARMIN OAUTH 1.0a SIGNATURE TEST ===');
        console.log('User ID:', userId);
        console.log('Consumer Key:', process.env.GARMIN_CONSUMER_KEY);
        console.log('Consumer Secret:', process.env.GARMIN_CONSUMER_SECRET ? 'Present' : 'Missing');

        // Get Garmin token
        const tokenRecord = await OAuthToken.findOne({
            where: {
                userId,
                provider: 'garmin'
            }
        });

        if (!tokenRecord) {
            return res.status(404).json({ error: 'No Garmin token found' });
        }

        const accessToken = decrypt(tokenRecord.accessTokenEncrypted);
        console.log('Access Token Length:', accessToken.length);
        console.log('Token Prefix:', accessToken.substring(0, 20) + '...');

        // Create signer
        const signer = new GarminOAuth1Hybrid(
            process.env.GARMIN_CONSUMER_KEY,
            process.env.GARMIN_CONSUMER_SECRET
        );

        // Test 1: User Registration
        console.log('\n📝 TEST 1: User Registration');
        const regUrl = 'https://apis.garmin.com/wellness-api/rest/user/registration';
        const regAuthHeader = signer.generateAuthHeader('POST', regUrl, {}, accessToken);

        console.log('Registration URL:', regUrl);
        console.log('Registration Auth Header:', regAuthHeader);

        const regResponse = await fetch(regUrl, {
            method: 'POST',
            headers: {
                'Authorization': regAuthHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({})
        });

        const regText = await regResponse.text();
        console.log('Registration Response Status:', regResponse.status);
        console.log('Registration Response Headers:', Object.fromEntries(regResponse.headers.entries()));
        console.log('Registration Response Body:', regText);

        // Test 2: Permissions Check
        console.log('\n🔐 TEST 2: Permissions Check');
        const permUrl = 'https://apis.garmin.com/wellness-api/rest/user/permissions';
        const permAuthHeader = signer.generateAuthHeader('GET', permUrl, {}, accessToken);

        console.log('Permissions URL:', permUrl);
        console.log('Permissions Auth Header:', permAuthHeader);

        const permResponse = await fetch(permUrl, {
            method: 'GET',
            headers: {
                'Authorization': permAuthHeader,
                'Accept': 'application/json'
            }
        });

        const permText = await permResponse.text();
        console.log('Permissions Response Status:', permResponse.status);
        console.log('Permissions Response Headers:', Object.fromEntries(permResponse.headers.entries()));
        console.log('Permissions Response Body:', permText);

        // Test 3: Activities with proper parameters
        console.log('\n🏃 TEST 3: Activities');
        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (24 * 60 * 60); // Last 24 hours
        const actUrl = 'https://apis.garmin.com/wellness-api/rest/activities';
        const actParams = {
            uploadStartTimeInSeconds: startTime.toString(),
            uploadEndTimeInSeconds: endTime.toString()
        };
        const actAuthHeader = signer.generateAuthHeader('GET', actUrl, actParams, accessToken);

        console.log('Activities URL:', actUrl);
        console.log('Activities Query Params:', actParams);
        console.log('Activities Auth Header:', actAuthHeader);

        const fullActUrl = `${actUrl}?${new URLSearchParams(actParams).toString()}`;
        const actResponse = await fetch(fullActUrl, {
            method: 'GET',
            headers: {
                'Authorization': actAuthHeader,
                'Accept': 'application/json'
            }
        });

        const actText = await actResponse.text();
        console.log('Activities Response Status:', actResponse.status);
        console.log('Activities Response Headers:', Object.fromEntries(actResponse.headers.entries()));
        console.log('Activities Response Body:', actText.substring(0, 500) + '...');

        console.log('===================\n');

        // Return comprehensive test results
        res.json({
            tests: {
                registration: {
                    status: regResponse.status,
                    statusText: regResponse.statusText,
                    headers: Object.fromEntries(regResponse.headers.entries()),
                    body: tryParseJSON(regText),
                    success: regResponse.ok
                },
                permissions: {
                    status: permResponse.status,
                    statusText: permResponse.statusText,
                    headers: Object.fromEntries(permResponse.headers.entries()),
                    body: tryParseJSON(permText),
                    success: permResponse.ok
                },
                activities: {
                    status: actResponse.status,
                    statusText: actResponse.statusText,
                    headers: Object.fromEntries(actResponse.headers.entries()),
                    body: tryParseJSON(actText),
                    success: actResponse.ok,
                    queryParams: actParams
                }
            },
            debug: {
                consumerKey: process.env.GARMIN_CONSUMER_KEY,
                tokenPrefix: accessToken.substring(0, 20) + '...',
                tokenLength: accessToken.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ OAuth test error:', error);
        res.status(500).json({
            error: 'OAuth test failed',
            message: error.message,
            stack: error.stack
        });
    }
});

/**
 * Test individual OAuth 1.0a signature components
 * GET /api/garmin/test/signature-components/:userId
 */
router.get('/signature-components/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get Garmin token
        const tokenRecord = await OAuthToken.findOne({
            where: {
                userId,
                provider: 'garmin'
            }
        });

        if (!tokenRecord) {
            return res.status(404).json({ error: 'No Garmin token found' });
        }

        const accessToken = decrypt(tokenRecord.accessTokenEncrypted);

        // Create signer
        const signer = new GarminOAuth1Hybrid(
            process.env.GARMIN_CONSUMER_KEY,
            process.env.GARMIN_CONSUMER_SECRET
        );

        // Generate sample OAuth params
        const oauthParams = {
            oauth_consumer_key: process.env.GARMIN_CONSUMER_KEY,
            oauth_token: accessToken,
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_nonce: signer.generateNonce(),
            oauth_version: '1.0'
        };

        const testUrl = 'https://apis.garmin.com/wellness-api/rest/activities';
        const testParams = {
            uploadStartTimeInSeconds: '1234567890',
            uploadEndTimeInSeconds: '1234567900'
        };

        // Generate signature
        const allParams = { ...oauthParams, ...testParams };
        const signature = signer.generateSignature('GET', testUrl, allParams, '');
        oauthParams.oauth_signature = signature;

        // Build header parts
        const headerParts = Object.keys(oauthParams)
            .sort()
            .map(key => `${key}="${signer.percentEncode(oauthParams[key])}"`)
            .join(', ');

        res.json({
            components: {
                consumerKey: process.env.GARMIN_CONSUMER_KEY,
                accessTokenPrefix: accessToken.substring(0, 20) + '...',
                oauthParams,
                testUrl,
                testParams,
                allParams,
                signature,
                authHeader: `OAuth ${headerParts}`,
                signingKey: `${signer.percentEncode(process.env.GARMIN_CONSUMER_SECRET)}&`
            }
        });

    } catch (error) {
        console.error('❌ Signature components test error:', error);
        res.status(500).json({
            error: 'Signature components test failed',
            message: error.message
        });
    }
});

function tryParseJSON(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        return text;
    }
}

module.exports = router;