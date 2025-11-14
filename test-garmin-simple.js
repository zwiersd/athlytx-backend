#!/usr/bin/env node

/**
 * Simple test script to debug Garmin API authentication
 * Tests different approaches to see what works
 */

const fetch = require('node-fetch');

// The token from your latest connection
const JWT_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpLW9hdXRoLXNpZ25lci1wcm9kLTIwMjQtcTEifQ.eyJzY29wZSI6WyJQQVJUTkVSX1dSSVRFIiwiUEFSVE5FUl9SRUFEIiwiQ09OTkVDVF9SRUFEIiwiQ09OTkVDVF9XUklURSJdLCJpc3MiOiJodHRwczovL2RpYXV0aC5nYXJtaW4uY29tIiwicmV2b2NhdGlvbl9lbGlnaWJpbGl0eSI6WyJDTElFTlRfVVNFUl9SRVZPQ0FUSU9OIiwiTUFOQUdFRF9TVEFUVVMiXSwiY2xpZW50X3R5cGUiOiJQQVJUTkVSIiwiZXhwIjoxNzYzMjExMzQ2LCJpYXQiOjE3NjMxMjQ5NDYsImdhcm1pbl9ndWlkIjoiMjcyYTJjODItMGNiYi00OWZmLWFiZTktMGI2OGM1MDBmZDY3IiwianRpIjoiMmU1ZDAwNmItZWM5Mi00M2YzLWFlMGItNTI2ZjI5ZDM2MTQ4IiwiY2xpZW50X2lkIjoiNGFmMzFlNWMtZDc1OC00NDJkLWEwMDctODA5ZWE0NWY0NDRhIn0.dqqQJ6s3ZyPHWgxHQCIc2Ssj86q-Yb7oF1VuS9ASH8Ma-drNRm6ygO2vo5m7BsrQs-bRKFpMUz282Oz2hiRaH8LBTwH4xIXrKxN6SC6Gq9ruPdZSB1h_R0lzPQaIkuNJSbJgG5tkSXgoBhdlbr3K1XKaOylgGngDQ39GDJvo2NWC8qQe4YtF5r_8JQGKupMy3nw3wKVRTa9bQ_FCqMpM-NJ8tRzX-dSjhyq5IDFsUb0cepKz0TJUBS0EiKpj27d2PiYaEw8qA38EvN9U1bm6NQIfx_OE1YRrNINfRe1A5NpMJ3DVKMtUtuWA3eAIhH2oZp5Qwtuv11K80mclhnolFw';

// Extract garmin_guid from JWT
function extractGarminGuid(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.garmin_guid;
    } catch (e) {
        console.error('Failed to extract garmin_guid:', e.message);
        return null;
    }
}

async function test1_BearerToken() {
    console.log('\n========== TEST 1: Simple Bearer Token ==========');
    console.log('Using: Authorization: Bearer {token}');

    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (24 * 60 * 60);

    const url = `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'Accept': 'application/json'
        }
    });

    console.log('Response Status:', response.status, response.statusText);
    const text = await response.text();
    console.log('Response Body:', text);
}

async function test2_BearerWithGarminGuid() {
    console.log('\n========== TEST 2: Bearer with garmin_guid ==========');

    const garminGuid = extractGarminGuid(JWT_TOKEN);
    console.log('Extracted garmin_guid:', garminGuid);

    if (!garminGuid) {
        console.log('Failed to extract garmin_guid');
        return;
    }

    console.log('Using: Authorization: Bearer {garmin_guid}');

    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (24 * 60 * 60);

    const url = `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${garminGuid}`,
            'Accept': 'application/json'
        }
    });

    console.log('Response Status:', response.status, response.statusText);
    const text = await response.text();
    console.log('Response Body:', text);
}

async function test3_ConnectAPI() {
    console.log('\n========== TEST 3: Connect API Instead of Wellness ==========');
    console.log('Using Connect API endpoints with Bearer token');

    // Try the Connect API endpoints that are documented
    const urls = [
        'https://connectapi.garmin.com/userprofile-service/userprofile',
        'https://connectapi.garmin.com/activity-service/activities/recent',
        'https://connectapi.garmin.com/wellness-service/wellness/dailies'
    ];

    for (const url of urls) {
        console.log(`\nTrying: ${url}`);
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        console.log('Response Status:', response.status, response.statusText);
        if (response.status === 200) {
            const data = await response.json();
            console.log('SUCCESS! Data:', JSON.stringify(data, null, 2).substring(0, 500));
        } else {
            const text = await response.text();
            console.log('Response Body:', text);
        }
    }
}

async function test4_PartnerAPI() {
    console.log('\n========== TEST 4: Partner API Endpoints ==========');
    console.log('Testing Partner-specific endpoints');

    // Partner API might have different base URLs
    const urls = [
        'https://apis.garmin.com/partner-api/v1/users',
        'https://apis.garmin.com/partner/v1/users',
        'https://healthapi.garmin.com/partner/v1/users',
        'https://connectapi.garmin.com/partner/v1/users'
    ];

    for (const url of urls) {
        console.log(`\nTrying: ${url}`);
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        console.log('Response Status:', response.status, response.statusText);
        const text = await response.text();
        if (text) console.log('Response Body:', text.substring(0, 200));
    }
}

async function runAllTests() {
    console.log('Starting Garmin API tests...');
    console.log('JWT Token Length:', JWT_TOKEN.length);
    console.log('garmin_guid:', extractGarminGuid(JWT_TOKEN));

    try {
        await test1_BearerToken();
    } catch (e) {
        console.error('Test 1 failed:', e.message);
    }

    try {
        await test2_BearerWithGarminGuid();
    } catch (e) {
        console.error('Test 2 failed:', e.message);
    }

    try {
        await test3_ConnectAPI();
    } catch (e) {
        console.error('Test 3 failed:', e.message);
    }

    try {
        await test4_PartnerAPI();
    } catch (e) {
        console.error('Test 4 failed:', e.message);
    }

    console.log('\n========== TESTS COMPLETE ==========');
    console.log('Summary: Check which endpoints returned 200 OK');
}

runAllTests().catch(console.error);