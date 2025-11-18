#!/usr/bin/env node

/**
 * Register Garmin Users for Health API Push Notifications
 *
 * After OAuth 2.0 authorization, users must be registered with Garmin Health API
 * to enable PUSH notifications. This is a REQUIRED step that was missing!
 *
 * This script registers the 3 authorized users so Garmin will start sending
 * activity data to our webhook.
 */

const crypto = require('crypto');

const GARMIN_CONSUMER_KEY = process.env.GARMIN_CONSUMER_KEY || '4af31e5c-d758-442d-a007-809ea45f444a';
const GARMIN_CONSUMER_SECRET = process.env.GARMIN_CONSUMER_SECRET || 'GGDcZxqPhpn4UlVihFY62rHWhY+ZNkHbLE0auOYOkrU';

// Use Sequelize models
const { OAuthToken } = require('./backend/models');

// OAuth 1.0a + OAuth 2.0 Hybrid signature for Garmin Health API
class GarminOAuth1Hybrid {
    constructor(consumerKey, consumerSecret) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
    }

    generateAuthHeader(method, url, queryParams = {}, oauth2Token = '') {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonce = crypto.randomBytes(16).toString('hex');

        const oauthParams = {
            oauth_consumer_key: this.consumerKey,
            oauth_nonce: nonce,
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: timestamp,
            oauth_version: '1.0',
            oauth_token: oauth2Token // OAuth 2.0 access token goes here
        };

        // Combine OAuth params with query params for signature
        const allParams = { ...oauthParams, ...queryParams };

        // Sort and encode parameters
        const sortedParams = Object.keys(allParams)
            .sort()
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
            .join('&');

        // Create signature base string
        const signatureBaseString = [
            method.toUpperCase(),
            encodeURIComponent(url),
            encodeURIComponent(sortedParams)
        ].join('&');

        // Signing key is consumer secret + empty token secret (OAuth 2.0 has no token secret)
        const signingKey = `${encodeURIComponent(this.consumerSecret)}&`;

        // Generate HMAC-SHA1 signature
        const signature = crypto
            .createHmac('sha1', signingKey)
            .update(signatureBaseString)
            .digest('base64');

        oauthParams.oauth_signature = signature;

        // Build Authorization header
        const authHeader = 'OAuth ' + Object.keys(oauthParams)
            .sort()
            .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
            .join(', ');

        return authHeader;
    }
}

async function getGarminTokensFromDB() {
    console.log('📊 Fetching Garmin OAuth tokens from database...\n');

    try {
        const tokens = await OAuthToken.findAll({
            where: {
                provider: 'garmin'
            },
            order: [['createdAt', 'DESC']]
        });

        console.log(`Found ${tokens.length} Garmin OAuth token(s)\n`);

        return tokens.map(t => ({
            id: t.id,
            userId: t.userId,
            provider: t.provider,
            accessToken: t.accessToken,
            refreshToken: t.refreshToken,
            providerUserId: t.providerUserId,
            createdAt: t.createdAt
        }));
    } catch (error) {
        console.error('❌ Database error:', error.message);
        throw error;
    }
}

async function registerUserWithGarmin(accessToken, userId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Registering User ${userId} with Garmin Health API`);
    console.log('='.repeat(60));

    const registrationUrl = 'https://apis.garmin.com/wellness-api/rest/user/registration';

    const signer = new GarminOAuth1Hybrid(GARMIN_CONSUMER_KEY, GARMIN_CONSUMER_SECRET);
    const authHeader = signer.generateAuthHeader('POST', registrationUrl, {}, accessToken);

    console.log('URL:', registrationUrl);
    console.log('Method: POST');
    console.log('Access Token:', accessToken.substring(0, 20) + '...');
    console.log('Authorization Header:', authHeader.substring(0, 80) + '...\n');

    try {
        const response = await fetch(registrationUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) // Empty body for registration
        });

        const responseText = await response.text();

        console.log('Response Status:', response.status);
        console.log('Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
        console.log('Response Body:', responseText);

        if (response.ok || response.status === 200 || response.status === 201) {
            console.log(`✅ User ${userId} registered successfully!`);
            return { success: true, userId, response: responseText };
        } else if (response.status === 409 || responseText.includes('already registered')) {
            console.log(`ℹ️  User ${userId} already registered (this is OK)`);
            return { success: true, userId, response: responseText, alreadyRegistered: true };
        } else {
            console.error(`❌ Registration failed for user ${userId}:`, response.status, responseText);
            return { success: false, userId, error: `${response.status}: ${responseText}` };
        }
    } catch (error) {
        console.error(`❌ Error registering user ${userId}:`, error.message);
        return { success: false, userId, error: error.message };
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('Garmin Health API User Registration');
    console.log('='.repeat(60));
    console.log(`Consumer Key: ${GARMIN_CONSUMER_KEY.substring(0, 20)}...`);
    console.log(`Consumer Secret: ${GARMIN_CONSUMER_SECRET ? '***' : 'NOT SET'}`);
    console.log(`Database: Sequelize (SQLite/PostgreSQL)`);
    console.log('='.repeat(60));

    try {
        // Get all Garmin tokens from database
        const tokens = await getGarminTokensFromDB();

        if (tokens.length === 0) {
            console.log('⚠️  No Garmin users found in database.');
            console.log('Users must authorize via OAuth 2.0 first.\n');
            return;
        }

        const results = [];

        // Register each user
        for (const token of tokens) {
            console.log(`\nProcessing user ${token.userId} (Garmin ID: ${token.providerUserId || 'unknown'})...`);

            const result = await registerUserWithGarmin(token.accessToken, token.userId);
            results.push(result);

            // Wait 2 seconds between requests to avoid rate limiting
            if (tokens.indexOf(token) < tokens.length - 1) {
                console.log('\n⏳ Waiting 2 seconds before next request...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('REGISTRATION SUMMARY');
        console.log('='.repeat(60));

        const successful = results.filter(r => r.success).length;
        const alreadyRegistered = results.filter(r => r.alreadyRegistered).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`✅ Successfully registered: ${successful}/${results.length}`);
        console.log(`ℹ️  Already registered: ${alreadyRegistered}/${results.length}`);
        console.log(`❌ Failed: ${failed}/${results.length}`);

        if (failed > 0) {
            console.log('\nFailed users:');
            results.filter(r => !r.success).forEach(r => {
                console.log(`  - User ${r.userId}: ${r.error}`);
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('NEXT STEPS');
        console.log('='.repeat(60));
        console.log('1. Users should now be registered for Health API push notifications');
        console.log('2. When users record activities, Garmin will send PUSH to:');
        console.log('   https://athlytx-backend-production.up.railway.app/api/garmin/push');
        console.log('3. Check Partner Verification Tool in 30 minutes to see data');
        console.log('4. Check your server logs for incoming PUSH notifications');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main().catch(console.error);
