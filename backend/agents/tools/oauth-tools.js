const { OAuthToken, User } = require('../../models');
const { decrypt } = require('../../utils/encryption');
const fetch = require('node-fetch');

/**
 * OAuth Debugging and Management Tools
 * These tools help diagnose, validate, and fix OAuth authentication issues
 */

/**
 * Validate an OAuth token for a user and provider
 */
async function validateOAuthToken(userId, provider) {
    try {
        const token = await OAuthToken.findOne({
            where: { userId, provider }
        });

        if (!token) {
            return {
                valid: false,
                error: 'NO_TOKEN_FOUND',
                message: `No ${provider} token found for user ${userId}`,
                suggestions: [
                    `User needs to connect their ${provider} account`,
                    'Redirect user to OAuth authorization flow'
                ]
            };
        }

        // Check if token is expired
        const now = new Date();
        const expired = token.expiresAt && new Date(token.expiresAt) < now;

        if (expired) {
            return {
                valid: false,
                error: 'TOKEN_EXPIRED',
                message: `${provider} token expired at ${token.expiresAt}`,
                tokenId: token.id,
                expiresAt: token.expiresAt,
                hasRefreshToken: !!token.refreshTokenEncrypted,
                suggestions: [
                    token.refreshTokenEncrypted
                        ? 'Token can be refreshed using refresh token'
                        : 'User needs to re-authenticate - no refresh token available'
                ]
            };
        }

        // Try to decrypt token to ensure it's valid
        try {
            const decryptedToken = decrypt(token.accessTokenEncrypted);

            return {
                valid: true,
                message: `${provider} token is valid`,
                tokenId: token.id,
                expiresAt: token.expiresAt,
                scope: token.scope,
                provider,
                tokenLength: decryptedToken.length,
                suggestions: ['Token is healthy and ready to use']
            };
        } catch (decryptError) {
            return {
                valid: false,
                error: 'TOKEN_DECRYPT_FAILED',
                message: 'Token exists but cannot be decrypted',
                tokenId: token.id,
                suggestions: [
                    'Encryption key may have changed',
                    'Token may be corrupted',
                    'User should re-authenticate'
                ]
            };
        }

    } catch (error) {
        return {
            valid: false,
            error: 'VALIDATION_ERROR',
            message: error.message,
            suggestions: ['Check database connection', 'Review error logs']
        };
    }
}

/**
 * Diagnose OAuth flow issues for a specific provider
 */
async function diagnoseOAuthIssue(provider, errorDetails = {}) {
    const diagnosis = {
        provider,
        timestamp: new Date().toISOString(),
        issues: [],
        recommendations: []
    };

    // Check environment variables
    const envVars = {
        strava: ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'],
        oura: ['OURA_CLIENT_ID', 'OURA_CLIENT_SECRET'],
        garmin: ['GARMIN_CONSUMER_KEY', 'GARMIN_CONSUMER_SECRET'],
        whoop: ['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET']
    };

    const requiredVars = envVars[provider.toLowerCase()] || [];
    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        diagnosis.issues.push({
            severity: 'CRITICAL',
            type: 'MISSING_CREDENTIALS',
            message: `Missing environment variables: ${missingVars.join(', ')}`,
            vars: missingVars
        });
        diagnosis.recommendations.push(
            `Set missing environment variables: ${missingVars.join(', ')}`
        );
    }

    // Check for common OAuth error codes
    if (errorDetails.error) {
        const errorMappings = {
            'invalid_grant': {
                message: 'Authorization code or refresh token is invalid or expired',
                causes: [
                    'Code was already used',
                    'Code expired (usually 10 minutes)',
                    'Refresh token was revoked'
                ],
                fixes: [
                    'Request new authorization code',
                    'Check token exchange timing',
                    'Verify refresh token is still valid'
                ]
            },
            'invalid_client': {
                message: 'Client credentials are incorrect',
                causes: [
                    'Wrong CLIENT_ID or CLIENT_SECRET',
                    'Credentials for wrong environment (dev vs prod)'
                ],
                fixes: [
                    'Verify credentials in developer portal',
                    'Check environment variable spelling',
                    'Ensure using correct environment credentials'
                ]
            },
            'unauthorized_client': {
                message: 'Client not authorized for this grant type',
                causes: [
                    'OAuth app not configured correctly',
                    'Missing required scopes or permissions'
                ],
                fixes: [
                    'Check app configuration in developer portal',
                    'Verify grant type is enabled',
                    'Review requested scopes'
                ]
            },
            'access_denied': {
                message: 'User denied authorization',
                causes: [
                    'User clicked "Cancel" or "Deny"',
                    'User does not have required permissions'
                ],
                fixes: [
                    'User needs to retry authorization flow',
                    'Explain benefits of connecting to user',
                    'Ensure minimal scope requests'
                ]
            }
        };

        const errorInfo = errorMappings[errorDetails.error];
        if (errorInfo) {
            diagnosis.issues.push({
                severity: 'HIGH',
                type: errorDetails.error.toUpperCase(),
                message: errorInfo.message,
                causes: errorInfo.causes
            });
            diagnosis.recommendations.push(...errorInfo.fixes);
        }
    }

    // Provider-specific checks
    if (provider.toLowerCase() === 'garmin') {
        diagnosis.providerNotes = [
            'Garmin uses OAuth 1.0a hybrid with OAuth 2.0 tokens',
            'Requests must be signed with OAuth 1.0a signatures',
            'Check that signature generation is correct',
            'Verify timestamp is within acceptable range (±5 min)'
        ];
    }

    return diagnosis;
}

/**
 * Get OAuth connection status for a user
 */
async function getOAuthStatus(userId) {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return { error: 'User not found' };
        }

        const tokens = await OAuthToken.findAll({
            where: { userId },
            attributes: ['provider', 'expiresAt', 'scope', 'createdAt', 'updatedAt']
        });

        const providers = ['strava', 'oura', 'garmin', 'whoop'];
        const status = {};

        for (const provider of providers) {
            const token = tokens.find(t => t.provider === provider);
            if (token) {
                const expired = token.expiresAt && new Date(token.expiresAt) < new Date();
                status[provider] = {
                    connected: true,
                    expired,
                    expiresAt: token.expiresAt,
                    scope: token.scope,
                    lastUpdated: token.updatedAt,
                    connectedSince: token.createdAt
                };
            } else {
                status[provider] = {
                    connected: false
                };
            }
        }

        return {
            userId,
            email: user.email,
            providers: status,
            connectedCount: tokens.length,
            totalProviders: providers.length
        };

    } catch (error) {
        return { error: error.message };
    }
}

/**
 * Test OAuth token by making a test API call
 */
async function testOAuthToken(userId, provider) {
    const validation = await validateOAuthToken(userId, provider);

    if (!validation.valid) {
        return {
            success: false,
            validation,
            message: 'Token validation failed'
        };
    }

    // Get the token
    const token = await OAuthToken.findOne({
        where: { userId, provider }
    });

    const accessToken = decrypt(token.accessTokenEncrypted);

    // Provider-specific test endpoints
    const testEndpoints = {
        strava: {
            url: 'https://www.strava.com/api/v3/athlete',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        },
        oura: {
            url: 'https://api.ouraring.com/v2/usercollection/personal_info',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        },
        whoop: {
            url: 'https://api.prod.whoop.com/developer/v1/user/profile/basic',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        }
        // Note: Garmin requires OAuth 1.0a signatures, handled separately
    };

    const testConfig = testEndpoints[provider.toLowerCase()];

    if (!testConfig) {
        return {
            success: false,
            message: `Test endpoint not configured for ${provider}`,
            suggestion: 'Manual testing required'
        };
    }

    try {
        const response = await fetch(testConfig.url, {
            method: testConfig.method,
            headers: testConfig.headers
        });

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                message: `${provider} token is working correctly`,
                statusCode: response.status,
                data
            };
        } else {
            return {
                success: false,
                message: `${provider} API returned error`,
                statusCode: response.status,
                error: data,
                suggestions: diagnoseOAuthIssue(provider, data).recommendations
            };
        }

    } catch (error) {
        return {
            success: false,
            message: 'Failed to test token',
            error: error.message,
            suggestions: ['Check network connectivity', 'Verify API endpoint is accessible']
        };
    }
}

module.exports = {
    validateOAuthToken,
    diagnoseOAuthIssue,
    getOAuthStatus,
    testOAuthToken
};
