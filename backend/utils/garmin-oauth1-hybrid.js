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

        console.log('📝 Signature Generation Details:');
        console.log('  Sorted Params (first 200 chars):', sortedParams.substring(0, 200) + '...');

        // Step 2: Create signature base string
        const signatureBase = [
            method.toUpperCase(),
            this.percentEncode(url),
            this.percentEncode(sortedParams)
        ].join('&');

        console.log('  Signature Base String (first 300 chars):', signatureBase.substring(0, 300) + '...');

        // Step 3: Create signing key (consumer secret + empty token secret for OAuth 2.0)
        const signingKey = [
            this.percentEncode(this.consumerSecret),
            this.percentEncode(tokenSecret)
        ].join('&');

        console.log('  Signing Key Length:', signingKey.length);
        console.log('  Token Secret Used:', tokenSecret || '(empty)');

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
        if (!oauth2Token) {
            throw new Error('OAuth2 token is required but was null or undefined');
        }

        console.log('\n🔐 === OAuth 1.0a Signature Generation Debug ===');
        console.log('Method:', method);
        console.log('URL:', url);
        console.log('Query Params:', queryParams);
        console.log('OAuth2 Token Length:', oauth2Token.length);
        console.log('OAuth2 Token Prefix:', oauth2Token.substring(0, 50) + '...');

        // Generate OAuth parameters
        const oauthParams = {
            oauth_consumer_key: this.consumerKey,
            oauth_token: oauth2Token, // Use OAuth 2.0 token here
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
            oauth_nonce: this.generateNonce(),
            oauth_version: '1.0'
        };

        console.log('OAuth Parameters:', {
            ...oauthParams,
            oauth_token: oauthParams.oauth_token.substring(0, Math.min(50, oauthParams.oauth_token.length)) + '...'
        });

        // Combine OAuth and query parameters for signature
        const allParams = { ...oauthParams, ...queryParams };

        // Generate signature (no token secret for OAuth 2.0)
        const signature = this.generateSignature(method, url, allParams, '');
        oauthParams.oauth_signature = signature;

        console.log('Generated Signature:', signature);

        // Build Authorization header
        const headerParts = Object.keys(oauthParams)
            .sort()
            .map(key => `${key}="${this.percentEncode(oauthParams[key])}"`)
            .join(', ');

        const authHeader = `OAuth ${headerParts}`;
        console.log('Authorization Header Length:', authHeader.length);
        console.log('Authorization Header Preview:', authHeader.substring(0, 200) + '...');
        console.log('===========================================\n');

        return authHeader;
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