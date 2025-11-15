/**
 * Cryptographic Utilities
 *
 * Provides secure cryptographic functions for token comparison and validation
 */

const crypto = require('crypto');

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} True if strings match, false otherwise
 *
 * Why this matters:
 * Standard === comparison leaks information about string similarity through timing.
 * Attackers can use this to brute-force tokens by measuring response times.
 * This function always takes the same time regardless of where strings differ.
 */
function timingSafeEqual(a, b) {
    if (!a || !b) {
        return false;
    }

    // Convert strings to buffers
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));

    // If lengths differ, still do constant-time comparison to avoid leaking length info
    if (bufA.length !== bufB.length) {
        // Compare against a dummy buffer of same length as a
        const dummyBuf = Buffer.alloc(bufA.length);
        crypto.timingSafeEqual(bufA, dummyBuf);
        return false;
    }

    // Constant-time comparison
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validate UUID format
 * Prevents invalid UUID queries that could cause database errors
 *
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID format
 */
function isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Generate a cryptographically secure random token
 *
 * @param {number} length - Length of token in bytes (default: 32)
 * @returns {string} Hex-encoded random token
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a string using SHA-256
 * Useful for storing sensitive data like tokens in logs
 *
 * @param {string} data - Data to hash
 * @returns {string} Hex-encoded hash
 */
function hashSHA256(data) {
    return crypto.createHash('sha256').update(String(data)).digest('hex');
}

module.exports = {
    timingSafeEqual,
    isValidUUID,
    generateSecureToken,
    hashSHA256
};
