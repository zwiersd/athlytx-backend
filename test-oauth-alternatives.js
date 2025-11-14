#!/usr/bin/env node

const crypto = require('crypto');
const fetch = require('node-fetch');

// Environment values
const CONSUMER_KEY = '4af31e5c-d758-442d-a007-809ea45f444a';
const CONSUMER_SECRET = 'GGDcZxqPhpn4UlVihFY62rHWhY+ZNkHbLE0auOYOkrU';

// JWT Token
const JWT_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpLW9hdXRoLXNpZ25lci1wcm9kLTIwMjQtcTEifQ.eyJzY29wZSI6WyJQQVJUTkVSX1dSSVRFIiwiUEFSVE5FUl9SRUFEIiwiQ09OTkVDVF9SRUFEIiwiQ09OTkVDVF9XUklURSJdLCJpc3MiOiJodHRwczovL2RpYXV0aC5nYXJtaW4uY29tIiwicmV2b2NhdGlvbl9lbGlnaWJpbGl0eSI6WyJDTElFTlRfVVNFUl9SRVZPQ0FUSU9OIiwiTUFOQUdFRF9TVEFUVVMiXSwiY2xpZW50X3R5cGUiOiJQQVJUTkVSIiwiZXhwIjoxNzYzMjExMzQ2LCJpYXQiOjE3NjMxMjQ5NDYsImdhcm1pbl9ndWlkIjoiMjcyYTJjODItMGNiYi00OWZmLWFiZTktMGI2OGM1MDBmZDY3IiwianRpIjoiMmU1ZDAwNmItZWM5Mi00M2YzLWFlMGItNTI2ZjI5ZDM2MTQ4IiwiY2xpZW50X2lkIjoiNGFmMzFlNWMtZDc1OC00NDJkLWEwMDctODA5ZWE0NWY0NDRhIn0.dqqQJ6s3ZyPHWgxHQCIc2Ssj86q-Yb7oF1VuS9ASH8Ma-drNRm6ygO2vo5m7BsrQs-bRKFpMUz282Oz2hiRaH8LBTwH4xIXrKxN6SC6Gq9ruPdZSB1h_R0lzPQaIkuNJSbJgG5tkSXgoBhdlbr3K1XKaOylgGngDQ39GDJvo2NWC8qQe4YtF5r_8JQGKupMy3nw3wKVRTa9bQ_FCqMpM-NJ8tRzX-dSjhyq5IDFsUb0cepKz0TJUBS0EiKpj27d2PiYaEw8qA38EvN9U1bm6NQIfx_OE1YRrNINfRe1A5NpMJ3DVKMtUtuWA3eAIhH2oZp5Qwtuv11K80mclhnolFw';

// Extract info from JWT
function decodeJWT(token) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
}

function percentEncode(str) {
    return encodeURIComponent(str)
        .replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
}

function generateOAuth1Signature(method, url, params, consumerSecret, tokenSecret = '') {
    // Sort and encode parameters
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
        .join('&');

    // Create signature base string
    const signatureBase = [
        method.toUpperCase(),
        percentEncode(url),
        percentEncode(sortedParams)
    ].join('&');

    // Create signing key
    const signingKey = [
        percentEncode(consumerSecret),
        percentEncode(tokenSecret)
    ].join('&');

    // Generate HMAC-SHA1 signature
    return crypto
        .createHmac('sha1', signingKey)
        .update(signatureBase)
        .digest('base64');
}

async function testApproach(name, oauthToken, description) {
    console.log(`\n========== ${name} ==========`);
    console.log(description);
    console.log('OAuth Token Used:', oauthToken ? oauthToken.substring(0, 50) + '...' : 'none');

    const url = 'https://apis.garmin.com/wellness-api/rest/user/registration';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const oauthParams = {
        oauth_consumer_key: CONSUMER_KEY,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0'
    };

    // Only add oauth_token if provided
    if (oauthToken) {
        oauthParams.oauth_token = oauthToken;
    }

    // Generate signature
    const signature = generateOAuth1Signature('POST', url, oauthParams, CONSUMER_SECRET, '');
    oauthParams.oauth_signature = signature;

    // Build Authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams)
        .sort()
        .map(key => `${key}="${percentEncode(oauthParams[key])}"`)
        .join(', ');

    console.log('Auth Header Length:', authHeader.length);
    console.log('Auth Header Preview:', authHeader.substring(0, 150) + '...');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({})
        });

        console.log('Response:', response.status, response.statusText);
        const text = await response.text();
        console.log('Body:', text);

        return response.status === 200 || response.status === 204;
    } catch (e) {
        console.error('Error:', e.message);
        return false;
    }
}

async function runTests() {
    console.log('Testing different OAuth 1.0a approaches...\n');

    const payload = decodeJWT(JWT_TOKEN);
    console.log('JWT Info:', {
        garmin_guid: payload.garmin_guid,
        client_type: payload.client_type,
        client_id: payload.client_id
    });

    // Test 1: Full JWT token as oauth_token
    await testApproach(
        'APPROACH 1: Full JWT Token',
        JWT_TOKEN,
        'Using the complete JWT token as oauth_token parameter'
    );

    // Test 2: Just the garmin_guid as oauth_token
    await testApproach(
        'APPROACH 2: Garmin GUID Only',
        payload.garmin_guid,
        'Using only the garmin_guid from JWT as oauth_token'
    );

    // Test 3: No oauth_token at all (consumer key only)
    await testApproach(
        'APPROACH 3: No OAuth Token',
        null,
        'Using only consumer key/secret, no oauth_token'
    );

    // Test 4: Client ID as oauth_token
    await testApproach(
        'APPROACH 4: Client ID',
        payload.client_id,
        'Using the client_id from JWT as oauth_token'
    );

    console.log('\n========== TESTS COMPLETE ==========');
    console.log('Check which approach returned 200/204');
}

runTests().catch(console.error);