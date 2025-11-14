const fetch = require('node-fetch');
const GarminOAuth1Hybrid = require('./garmin-oauth1-hybrid');

const WELLNESS_BASE = 'https://healthapi.garmin.com/wellness-api/rest';

/**
 * Helper to sign and fetch from Garmin Wellness API
 * Uses OAuth 1.0a signatures with OAuth 2.0 tokens
 */
async function signAndFetch(path, method, accessToken, query = {}, options = {}) {
    if (!process.env.GARMIN_CONSUMER_KEY || !process.env.GARMIN_CONSUMER_SECRET) {
        throw new Error('Missing GARMIN_CONSUMER_KEY or GARMIN_CONSUMER_SECRET');
    }

    const signer = new GarminOAuth1Hybrid(
        process.env.GARMIN_CONSUMER_KEY,
        process.env.GARMIN_CONSUMER_SECRET
    );

    const baseUrl = `${WELLNESS_BASE}${path}`;
    const authHeader = signer.generateAuthHeader(method, baseUrl, query, accessToken);

    // Build URL with query params
    const url = Object.keys(query).length > 0
        ? `${baseUrl}?${new URLSearchParams(query).toString()}`
        : baseUrl;

    return fetch(url, {
        method,
        headers: {
            Authorization: authHeader,
            Accept: 'application/json',
            ...(options.headers || {})
        },
        body: options.body
    });
}

module.exports = { signAndFetch, WELLNESS_BASE };