#!/usr/bin/env node

/**
 * Test if Partner API tokens work with Bearer auth instead of OAuth 1.0a
 */

const fetch = require('node-fetch');

// Your JWT token from the latest connection
const JWT_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpLW9hdXRoLXNpZ25lci1wcm9kLTIwMjQtcTEifQ.eyJzY29wZSI6WyJQQVJUTkVSX1dSSVRFIiwiUEFSVE5FUl9SRUFEIiwiQ09OTkVDVF9SRUFEIiwiQ09OTkVDVF9XUklURSJdLCJpc3MiOiJodHRwczovL2RpYXV0aC5nYXJtaW4uY29tIiwicmV2b2NhdGlvbl9lbGlnaWJpbGl0eSI6WyJDTElFTlRfVVNFUl9SRVZPQ0FUSU9OIiwiTUFOQUdFRF9TVEFUVVMiXSwiY2xpZW50X3R5cGUiOiJQQVJUTkVSIiwiZXhwIjoxNzYzMjExMzQ2LCJpYXQiOjE3NjMxMjQ5NDYsImdhcm1pbl9ndWlkIjoiMjcyYTJjODItMGNiYi00OWZmLWFiZTktMGI2OGM1MDBmZDY3IiwianRpIjoiMmU1ZDAwNmItZWM5Mi00M2YzLWFlMGItNTI2ZjI5ZDM2MTQ4IiwiY2xpZW50X2lkIjoiNGFmMzFlNWMtZDc1OC00NDJkLWEwMDctODA5ZWE0NWY0NDRhIn0.dqqQJ6s3ZyPHWgxHQCIc2Ssj86q-Yb7oF1VuS9ASH8Ma-drNRm6ygO2vo5m7BsrQs-bRKFpMUz282Oz2hiRaH8LBTwH4xIXrKxN6SC6Gq9ruPdZSB1h_R0lzPQaIkuNJSbJgG5tkSXgoBhdlbr3K1XKaOylgGngDQ39GDJvo2NWC8qQe4YtF5r_8JQGKupMy3nw3wKVRTa9bQ_FCqMpM-NJ8tRzX-dSjhyq5IDFsUb0cepKz0TJUBS0EiKpj27d2PiYaEw8qA38EvN9U1bm6NQIfx_OE1YRrNINfRe1A5NpMJ3DVKMtUtuWA3eAIhH2oZp5Qwtuv11K80mclhnolFw';

// Extract garmin_guid from JWT
function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
    } catch (e) {
        console.error('Failed to decode JWT:', e.message);
        return null;
    }
}

async function testPartnerAPIRegistration() {
    console.log('\n========== PARTNER API REGISTRATION TEST ==========');

    const payload = decodeJWT(JWT_TOKEN);
    console.log('JWT Payload:', {
        client_type: payload.client_type,
        garmin_guid: payload.garmin_guid,
        client_id: payload.client_id,
        scopes: payload.scope
    });

    // Test 1: Try registration with Bearer token (no OAuth 1.0a)
    console.log('\n1. Testing registration with Bearer token:');
    const regUrl = 'https://apis.garmin.com/wellness-api/rest/user/registration';

    const regResponse = await fetch(regUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({})
    });

    console.log('Registration Response:', {
        status: regResponse.status,
        statusText: regResponse.statusText
    });
    const regText = await regResponse.text();
    console.log('Registration Body:', regText);

    // Test 2: If registration worked, try fetching data
    if (regResponse.status === 200 || regResponse.status === 204) {
        console.log('\n✅ Registration successful! Testing data fetch...');

        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (24 * 60 * 60);

        const actUrl = `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`;

        const actResponse = await fetch(actUrl, {
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        console.log('Activities Response:', {
            status: actResponse.status,
            statusText: actResponse.statusText
        });
        const actText = await actResponse.text();
        console.log('Activities Body:', actText.substring(0, 500));
    }
}

async function testPartnerSpecificEndpoints() {
    console.log('\n========== PARTNER-SPECIFIC ENDPOINTS TEST ==========');

    const payload = decodeJWT(JWT_TOKEN);
    const garminGuid = payload.garmin_guid;

    // Test various partner-specific endpoint patterns
    const endpoints = [
        // Partner user endpoints
        `https://apis.garmin.com/wellness-api/rest/user/${garminGuid}/registration`,
        `https://apis.garmin.com/wellness-api/rest/partner/user/registration`,
        `https://apis.garmin.com/wellness-api/rest/partner/users/${garminGuid}`,

        // Partner data endpoints
        `https://apis.garmin.com/wellness-api/rest/partner/dailies`,
        `https://apis.garmin.com/wellness-api/rest/partner/activities`,

        // User-specific endpoints with GUID
        `https://apis.garmin.com/wellness-api/rest/users/${garminGuid}/dailies`,
        `https://apis.garmin.com/wellness-api/rest/users/${garminGuid}/activities`
    ];

    for (const url of endpoints) {
        console.log(`\nTesting: ${url}`);
        try {
            const response = await fetch(url, {
                method: url.includes('registration') ? 'POST' : 'GET',
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: url.includes('registration') ? JSON.stringify({}) : undefined
            });

            console.log(`Response: ${response.status} ${response.statusText}`);

            if (response.status === 200 || response.status === 204) {
                console.log('✅ SUCCESS! This endpoint works!');
                const text = await response.text();
                if (text) {
                    console.log('Response body:', text.substring(0, 200));
                }
            } else {
                const text = await response.text();
                console.log('Response body:', text.substring(0, 200));
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

async function runTests() {
    console.log('Starting Partner API tests...');
    console.log('Token type: PARTNER (from JWT payload)');

    await testPartnerAPIRegistration();
    await testPartnerSpecificEndpoints();

    console.log('\n========== TESTS COMPLETE ==========');
    console.log('Check which endpoints returned 200/204 for the correct approach');
}

runTests().catch(console.error);