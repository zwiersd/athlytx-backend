/**
 * Garmin OAuth 1.0a signature generator for Wellness API
 * Used to sign API requests with OAuth 1.0a while using OAuth 2.0 tokens
 * This hybrid approach is required by the Garmin Wellness API
 */

const crypto = require('crypto');

class GarminOAuth1Hybrid {
    constructor(consumerKey, consumerSecret) {
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
    }

    /**
     * Generate OAuth 1.0a signature
     * @param {string} method - HTTP method
     * @param {string} url - Full URL without query parameters
     * @param {Object} params - All parameters including OAuth and query parameters
     * @param {string} tokenSecret - Token secret (empty for OAuth 2.0 tokens)
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

        // Step 3: Create signing key (consumer secret + empty token secret for OAuth 2.0)
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
     * Generate OAuth 1.0a Authorization header using OAuth 2.0 token
     * @param {string} method - HTTP method
     * @param {string} url - Full URL
     * @param {Object} queryParams - Query parameters
     * @param {string} oauth2Token - OAuth 2.0 access token
     * @returns {string} Authorization header value
     */
    generateAuthHeader(method, url, queryParams = {}, oauth2Token) {
        // Generate OAuth parameters
        const oauthParams = {
            oauth_consumer_key: this.consumerKey,
            oauth_token: oauth2Token, // Use OAuth 2.0 token here
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_nonce: this.generateNonce(),
            oauth_version: '1.0'
        };

        // Combine OAuth and query parameters for signature
        const allParams = { ...oauthParams, ...queryParams };

        // Generate signature (no token secret for OAuth 2.0)
        const signature = this.generateSignature(method, url, allParams, '');
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
}

module.exports = GarminOAuth1Hybrid;