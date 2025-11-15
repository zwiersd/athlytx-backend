/**
 * Feature Flag System
 *
 * Purpose: Allow gradual rollout of new invite system
 * Can instantly disable if bugs found in production
 */

const FLAGS = {
    // New invitation system with device sharing consent
    ENABLE_NEW_INVITE_SYSTEM: process.env.ENABLE_NEW_INVITE_SYSTEM === 'true',

    // Strict device requirement during onboarding
    REQUIRE_DEVICE_ONBOARDING: process.env.REQUIRE_DEVICE_ONBOARDING !== 'false', // default true

    // Email rate limiting
    ENABLE_RATE_LIMITING: process.env.ENABLE_RATE_LIMITING !== 'false' // default true
};

/**
 * Check if new invite system is enabled
 * @returns {boolean}
 */
function useNewInviteSystem() {
    return FLAGS.ENABLE_NEW_INVITE_SYSTEM;
}

/**
 * Check if device connection is required during onboarding
 * @returns {boolean}
 */
function requireDeviceDuringOnboarding() {
    return FLAGS.REQUIRE_DEVICE_ONBOARDING;
}

/**
 * Check if rate limiting is enabled
 * @returns {boolean}
 */
function isRateLimitingEnabled() {
    return FLAGS.ENABLE_RATE_LIMITING;
}

/**
 * Get all feature flags (for debugging/admin)
 * @returns {object}
 */
function getAllFlags() {
    return {
        ...FLAGS,
        environment: process.env.NODE_ENV || 'development'
    };
}

module.exports = {
    useNewInviteSystem,
    requireDeviceDuringOnboarding,
    isRateLimitingEnabled,
    getAllFlags,
    FLAGS
};
