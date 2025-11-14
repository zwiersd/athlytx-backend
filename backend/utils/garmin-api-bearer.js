/**
 * Garmin Partner API client using Bearer authentication
 * For Partner API apps, OAuth 2.0 Bearer tokens work directly without OAuth 1.0a
 */

const fetch = require('node-fetch');

const WELLNESS_BASE = 'https://apis.garmin.com/wellness-api/rest';

/**
 * Make authenticated request to Garmin Wellness API using Bearer token
 * @param {string} path - API endpoint path
 * @param {string} method - HTTP method
 * @param {string} accessToken - OAuth 2.0 access token
 * @param {Object} query - Query parameters
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithBearer(path, method = 'GET', accessToken, query = {}, options = {}) {
    if (!accessToken) {
        throw new Error('Access token is required');
    }

    // Build URL with query parameters
    const url = new URL(`${WELLNESS_BASE}${path}`);
    Object.keys(query).forEach(key => {
        url.searchParams.append(key, query[key]);
    });

    console.log(`🚀 Garmin Partner API Request (Bearer auth):`);
    console.log(`  URL: ${url.toString()}`);
    console.log(`  Method: ${method}`);
    console.log(`  Token (first 50 chars): ${accessToken.substring(0, 50)}...`);

    // Make request with Bearer token
    const response = await fetch(url.toString(), {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    console.log(`  Response: ${response.status} ${response.statusText}`);

    // Don't consume the body here - let the caller handle it
    if (!response.ok) {
        console.log(`  Response status indicates error: ${response.status}`);
    }

    return response;
}

/**
 * Check if time range is valid (max 24 hours for most endpoints)
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {boolean} True if valid
 */
function validateTimeRange(startTime, endTime) {
    const MAX_RANGE = 86400; // 24 hours in seconds
    const range = endTime - startTime;
    // Must have at least 1 second range and not exceed max
    return range > 0 && range <= MAX_RANGE;
}

/**
 * Split time range into valid chunks if needed
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @returns {Array} Array of time ranges
 */
function splitTimeRange(startTime, endTime) {
    const MAX_RANGE = 86400; // 24 hours
    const ranges = [];

    let currentStart = startTime;
    while (currentStart < endTime) {
        const currentEnd = Math.min(currentStart + MAX_RANGE, endTime);
        ranges.push({ start: currentStart, end: currentEnd });
        currentStart = currentEnd;
    }

    return ranges;
}

module.exports = {
    fetchWithBearer,
    validateTimeRange,
    splitTimeRange,
    WELLNESS_BASE
};