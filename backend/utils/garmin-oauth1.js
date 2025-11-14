/**
 * Garmin OAuth 1.0a implementation for Wellness API
 * The Garmin Wellness API requires OAuth 1.0a signatures, not OAuth 2.0 tokens
 */

const crypto = require('crypto');

class GarminOAuth1 {
    constructor(consumerKey, consumerSecret) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
    }

    /**
     * Generate OAuth 1.0a signature for Garmin API request
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} url - Full URL without query parameters
     * @param {Object} params - All parameters including OAuth and query parameters
     * @param {string} tokenSecret - OAuth token secret (empty string for 2-legged OAuth)
     * @returns {string} Base64 encoded signature
     */
    generateSignature(method, url, params, tokenSecret = '') {
        // Step 1: Normalize parameters
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
            .join('&');

        // Step 2: Create signature base string
        const signatureBase = [
            method.toUpperCase(),
            this.percentEncode(url),
            this.percentEncode(sortedParams)
        ].join('&');

        // Step 3: Create signing key
        const signingKey = [
            this.percentEncode(this.consumerSecret),
            this.percentEncode(tokenSecret)
        ].join('&');

        // Step 4: Generate HMAC-SHA1 signature
        const signature = crypto
            .createHmac('sha1', signingKey)
            .update(signatureBase)
            .digest('base64');

        return signature;
    }

    /**
     * Generate OAuth 1.0a Authorization header
     * @param {string} method - HTTP method
     * @param {string} url - Full URL
     * @param {Object} queryParams - Query parameters (not OAuth parameters)
     * @param {string} token - OAuth token (optional, for 3-legged OAuth)
     * @param {string} tokenSecret - OAuth token secret (optional)
     * @returns {string} Authorization header value
     */
    generateAuthHeader(method, url, queryParams = {}, token = null, tokenSecret = '') {
        // Generate OAuth parameters
        const oauthParams = {
            oauth_consumer_key: this.consumerKey,
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_nonce: this.generateNonce(),
            oauth_version: '1.0'
        };

        // Add token if provided (for 3-legged OAuth)
        if (token) {
            oauthParams.oauth_token = token;
        }

        // Combine OAuth and query parameters for signature
        const allParams = { ...oauthParams, ...queryParams };

        // Generate signature
        const signature = this.generateSignature(method, url, allParams, tokenSecret);
        oauthParams.oauth_signature = signature;

        // Build Authorization header
        const headerParts = Object.keys(oauthParams)
            .sort()
            .map(key => `${key}="${this.percentEncode(oauthParams[key])}"`)
            .join(', ');

        return `OAuth ${headerParts}`;
    }

    /**
     * Generate random nonce
     * @returns {string} Random nonce string
     */
    generateNonce() {
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Percent encode string per OAuth 1.0a spec
     * @param {string} str - String to encode
     * @returns {string} Encoded string
     */
    percentEncode(str) {
        return encodeURIComponent(str)
            .replace(/!/g, '%21')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\*/g, '%2A');
    }

    /**
     * Make authenticated request to Garmin API
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint path
     * @param {Object} params - Query parameters
     * @param {string} token - OAuth token (optional)
     * @param {string} tokenSecret - OAuth token secret (optional)
     * @returns {Promise} Fetch promise
     */
    async makeRequest(method, endpoint, params = {}, token = null, tokenSecret = '') {
        const baseUrl = 'https://apis.garmin.com';
        const url = `${baseUrl}${endpoint}`;

        // Separate base URL from query parameters
        const urlWithoutParams = url.split('?')[0];

        // Generate Authorization header
        const authHeader = this.generateAuthHeader(
            method,
            urlWithoutParams,
            params,
            token,
            tokenSecret
        );

        console.log('🔐 OAuth 1.0a Request:', {
            url: urlWithoutParams,
            params,
            authHeader: authHeader.substring(0, 50) + '...'
        });

        // Build full URL with query parameters
        const queryString = Object.keys(params)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
        const fullUrl = queryString ? `${urlWithoutParams}?${queryString}` : urlWithoutParams;

        // Make request
        const response = await fetch(fullUrl, {
            method,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        return response;
    }
}

module.exports = GarminOAuth1;