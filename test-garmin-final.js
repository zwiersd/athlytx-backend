#!/usr/bin/env node

/**
 * Final test - Try the simplest possible approach
 * Maybe Partner API just needs Bearer token without registration
 */

const fetch = require('node-fetch');

const JWT_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpLW9hdXRoLXNpZ25lci1wcm9kLTIwMjQtcTEifQ.eyJzY29wZSI6WyJQQVJUTkVSX1dSSVRFIiwiUEFSVE5FUl9SRUFEIiwiQ09OTkVDVF9SRUFEIiwiQ09OTkVDVF9XUklURSJdLCJpc3MiOiJodHRwczovL2RpYXV0aC5nYXJtaW4uY29tIiwicmV2b2NhdGlvbl9lbGlnaWJpbGl0eSI6WyJDTElFTlRfVVNFUl9SRVZPQ0FUSU9OIiwiTUFOQUdFRF9TVEFUVVMiXSwiY2xpZW50X3R5cGUiOiJQQVJUTkVSIiwiZXhwIjoxNzYzMjExMzQ2LCJpYXQiOjE3NjMxMjQ5NDYsImdhcm1pbl9ndWlkIjoiMjcyYTJjODItMGNiYi00OWZmLWFiZTktMGI2OGM1MDBmZDY3IiwianRpIjoiMmU1ZDAwNmItZWM5Mi00M2YzLWFlMGItNTI2ZjI5ZDM2MTQ4IiwiY2xpZW50X2lkIjoiNGFmMzFlNWMtZDc1OC00NDJkLWEwMDctODA5ZWE0NWY0NDRhIn0.dqqQJ6s3ZyPHWgxHQCIc2Ssj86q-Yb7oF1VuS9ASH8Ma-drNRm6ygO2vo5m7BsrQs-bRKFpMUz282Oz2hiRaH8LBTwH4xIXrKxN6SC6Gq9ruPdZSB1h_R0lzPQaIkuNJSbJgG5tkSXgoBhdlbr3K1XKaOylgGngDQ39GDJvo2NWC8qQe4YtF5r_8JQGKupMy3nw3wKVRTa9bQ_FCqMpM-NJ8tRzX-dSjhyq5IDFsUb0cepKz0TJUBS0EiKpj27d2PiYaEw8qA38EvN9U1bm6NQIfx_OE1YRrNINfRe1A5NpMJ3DVKMtUtuWA3eAIhH2oZp5Qwtuv11K80mclhnolFw';

// Decode JWT to get garmin_guid
function decodeJWT(token) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
}

async function testSimplestApproach() {
    const payload = decodeJWT(JWT_TOKEN);
    const garminGuid = payload.garmin_guid;

    console.log('\n=== SIMPLEST APPROACH TEST ===');
    console.log('Token Type:', payload.client_type);
    console.log('Garmin GUID:', garminGuid);
    console.log('Scopes:', payload.scope);

    // Skip registration entirely and just try to fetch data
    console.log('\n1. Testing direct data access (no registration):');

    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (24 * 60 * 60);

    // Test different URL patterns
    const urlPatterns = [
        // Standard Wellness API
        `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`,

        // With user GUID in path
        `https://apis.garmin.com/wellness-api/rest/user/${garminGuid}/activities?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`,

        // Dailies endpoint
        `https://apis.garmin.com/wellness-api/rest/dailies?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`,

        // User metrics
        `https://apis.garmin.com/wellness-api/rest/userMetrics`,

        // Backfill endpoint (might work differently)
        `https://apis.garmin.com/wellness-api/rest/backfill?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`,

        // Without query parameters
        'https://apis.garmin.com/wellness-api/rest/activities',

        // Health API alternative base
        'https://healthapi.garmin.com/wellness-api/rest/activities'
    ];

    for (const url of urlPatterns) {
        console.log(`\nTrying: ${url.substring(0, 80)}...`);

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`,
                    'Accept': 'application/json',
                    'X-Garmin-Client-Id': payload.client_id,
                    'X-Garmin-User-Id': garminGuid
                }
            });

            console.log(`Response: ${response.status} ${response.statusText}`);

            if (response.status === 200) {
                console.log('✅ SUCCESS! This endpoint works without registration!');
                const data = await response.json();
                console.log('Sample data:', JSON.stringify(data).substring(0, 200));
                return true;
            } else if (response.status === 403) {
                const text = await response.text();
                if (text.includes('Unknown UserAccessToken')) {
                    console.log('❌ Unknown UserAccessToken - registration still needed');
                } else {
                    console.log('❌ Other 403 error:', text.substring(0, 100));
                }
            } else {
                const text = await response.text();
                console.log('Response:', text.substring(0, 100));
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    }

    return false;
}

async function testOAuth2Only() {
    console.log('\n=== OAUTH 2.0 ONLY TEST ===');
    console.log('Testing if we can skip OAuth 1.0a entirely for Partner apps...');

    // Try the Push API endpoints which might work differently
    const pushUrls = [
        'https://apis.garmin.com/wellness-api/rest/pushes',
        'https://apis.garmin.com/wellness-api/rest/notifications',
        'https://apis.garmin.com/wellness-api/rest/subscriptions'
    ];

    for (const url of pushUrls) {
        console.log(`\nTrying: ${url}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        console.log(`Response: ${response.status} ${response.statusText}`);

        if (response.status === 200) {
            console.log('✅ This endpoint works with just Bearer token!');
            const data = await response.json();
            console.log('Data:', JSON.stringify(data).substring(0, 200));
        }
    }
}

async function runFinalTest() {
    console.log('Running final Garmin test...');
    console.log('Hypothesis: Partner API might not need OAuth 1.0a at all\n');

    const worksWithoutRegistration = await testSimplestApproach();

    if (!worksWithoutRegistration) {
        await testOAuth2Only();
    }

    console.log('\n=== CONCLUSION ===');
    if (worksWithoutRegistration) {
        console.log('✅ Partner API works with Bearer token only!');
        console.log('Solution: Remove OAuth 1.0a entirely, use Bearer tokens');
    } else {
        console.log('❌ Still getting "Unknown UserAccessToken"');
        console.log('The registration step is required but failing');
        console.log('Need to contact Garmin support for Partner API documentation');
    }
}

runFinalTest().catch(console.error);