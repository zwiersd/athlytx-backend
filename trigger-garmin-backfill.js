#!/usr/bin/env node

/**
 * Trigger Garmin Health API Backfill for Authorized Users
 *
 * This script requests historical data (last 7 days) for all authorized Garmin users.
 * After OAuth authorization, Garmin waits for us to request data via backfill endpoint.
 */

const crypto = require('crypto');

// The 3 Garmin user IDs from Partner Verification Tool
const garminUserIds = [
    '94435bc6c4bf4e47d6ffb404257273d8',
    '0a2bd543599ed7457c076f3314f54be3',
    '35a83697-0114-4426-9baa-91fe6fbe2234'
];

const GARMIN_CONSUMER_KEY = process.env.GARMIN_CONSUMER_KEY || '4af31e5c-d758-442d-a007-809ea45f444a';
const GARMIN_CONSUMER_SECRET = process.env.GARMIN_CONSUMER_SECRET || 'GGDcZxqPhpn4UlVihFY62rHWhY+ZNkHbLE0auOYOkrU';

// OAuth 1.0a signature generation for Garmin Health API
function generateOAuth1Header(method, url, consumerKey, consumerSecret, token = '') {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const params = {
        oauth_consumer_key: consumerKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_version: '1.0'
    };

    if (token) {
        params.oauth_token = token;
    }

    // Sort parameters
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    // Create signature base string
    const signatureBaseString = [
        method.toUpperCase(),
        encodeURIComponent(url),
        encodeURIComponent(sortedParams)
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(token ? 'TOKEN_SECRET_HERE' : '')}`;

    // Generate signature
    const signature = crypto
        .createHmac('sha1', signingKey)
        .update(signatureBaseString)
        .digest('base64');

    params.oauth_signature = signature;

    // Build Authorization header
    const authHeader = 'OAuth ' + Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
        .join(', ');

    return authHeader;
}

async function requestBackfill(garminUserId) {
    console.log(`\n=== Requesting backfill for Garmin User: ${garminUserId} ===`);

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const uploadStartTime = Math.floor(startDate.getTime() / 1000);
    const uploadEndTime = Math.floor(endDate.getTime() / 1000);

    // Garmin Health API backfills endpoint
    const url = `https://apis.garmin.com/wellness-api/rest/backfill/dataFile?uploadStartTimeInSeconds=${uploadStartTime}&uploadEndTimeInSeconds=${uploadEndTime}`;

    console.log('URL:', url);
    console.log('Date Range:', startDate.toISOString(), 'to', endDate.toISOString());
    console.log('Timestamp Range:', uploadStartTime, 'to', uploadEndTime);

    try {
        // Generate OAuth 1.0a header
        const authHeader = generateOAuth1Header('GET', url.split('?')[0], GARMIN_CONSUMER_KEY, GARMIN_CONSUMER_SECRET);

        console.log('Authorization:', authHeader.substring(0, 80) + '...');

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log('\nResponse Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
        console.log('Response Body:', responseText);

        if (response.ok) {
            console.log(`✅ Backfill requested successfully for ${garminUserId}`);
            return { success: true, userId: garminUserId, response: responseText };
        } else {
            console.error(`❌ Backfill failed for ${garminUserId}:`, response.status, responseText);
            return { success: false, userId: garminUserId, error: responseText };
        }
    } catch (error) {
        console.error(`❌ Error requesting backfill for ${garminUserId}:`, error.message);
        return { success: false, userId: garminUserId, error: error.message };
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('Garmin Health API Backfill Request');
    console.log('='.repeat(60));
    console.log(`Consumer Key: ${GARMIN_CONSUMER_KEY.substring(0, 15)}...`);
    console.log(`Consumer Secret: ${GARMIN_CONSUMER_SECRET ? '***' + GARMIN_CONSUMER_SECRET.substring(GARMIN_CONSUMER_SECRET.length - 5) : 'NOT SET'}`);
    console.log(`Users to backfill: ${garminUserIds.length}`);
    console.log('='.repeat(60));

    const results = [];

    for (const userId of garminUserIds) {
        const result = await requestBackfill(userId);
        results.push(result);

        // Wait 2 seconds between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);

    if (failed > 0) {
        console.log('\nFailed users:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.userId}: ${r.error}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('NOTE: Backfill requests are asynchronous.');
    console.log('Garmin will send PUSH notifications to your webhook as data becomes available.');
    console.log('Check Partner Verification Tool in 10-30 minutes to see if data appears.');
    console.log('='.repeat(60));
}

main().catch(console.error);
