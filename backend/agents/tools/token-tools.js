const fetch = require('node-fetch');
const { OAuthToken } = require('../../models');
const { encrypt, decrypt } = require('../../utils/encryption');

/**
 * Token Management Tools
 * Handle token refresh, validation, and lifecycle management
 */

/**
 * Refresh an expired OAuth token
 */
async function refreshOAuthToken(userId, provider) {
    const token = await OAuthToken.findOne({
        where: { userId, provider }
    });

    if (!token) {
        return {
            success: false,
            error: 'NO_TOKEN',
            message: `No OAuth token found for ${provider}`
        };
    }

    if (!token.refreshTokenEncrypted) {
        return {
            success: false,
            error: 'NO_REFRESH_TOKEN',
            message: `No refresh token available for ${provider}`,
            suggestion: 'User must re-authenticate'
        };
    }

    const refreshToken = decrypt(token.refreshTokenEncrypted);

    // Provider-specific token refresh configurations
    const refreshConfigs = {
        strava: {
            url: 'https://www.strava.com/oauth/token',
            method: 'POST',
            body: {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }
        },
        oura: {
            url: 'https://api.ouraring.com/oauth/token',
            method: 'POST',
            body: {
                client_id: process.env.OURA_CLIENT_ID,
                client_secret: process.env.OURA_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }
        },
        whoop: {
            url: 'https://api.prod.whoop.com/oauth/token',
            method: 'POST',
            body: {
                client_id: process.env.WHOOP_CLIENT_ID,
                client_secret: process.env.WHOOP_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }
        }
        // Garmin uses different token mechanism - OAuth 2.0 tokens don't expire in same way
    };

    const config = refreshConfigs[provider.toLowerCase()];

    if (!config) {
        return {
            success: false,
            error: 'PROVIDER_NOT_SUPPORTED',
            message: `Token refresh not configured for ${provider}`
        };
    }

    try {
        const response = await fetch(config.url, {
            method: config.method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config.body)
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: 'REFRESH_FAILED',
                statusCode: response.status,
                message: `Failed to refresh ${provider} token`,
                details: data,
                suggestion: data.error === 'invalid_grant'
                    ? 'Refresh token is invalid or revoked. User must re-authenticate.'
                    : 'Check error details and retry'
            };
        }

        // Update token in database
        const expiresAt = data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000)
            : null;

        await token.update({
            accessTokenEncrypted: encrypt(data.access_token),
            refreshTokenEncrypted: data.refresh_token
                ? encrypt(data.refresh_token)
                : token.refreshTokenEncrypted,
            expiresAt,
            scope: data.scope || token.scope
        });

        return {
            success: true,
            message: `Successfully refreshed ${provider} token`,
            expiresAt,
            expiresIn: data.expires_in,
            scope: data.scope
        };

    } catch (error) {
        return {
            success: false,
            error: 'NETWORK_ERROR',
            message: `Network error while refreshing ${provider} token`,
            details: error.message
        };
    }
}

/**
 * Auto-refresh token if it's expired or about to expire
 */
async function autoRefreshIfNeeded(userId, provider, bufferMinutes = 5) {
    const token = await OAuthToken.findOne({
        where: { userId, provider }
    });

    if (!token) {
        return {
            refreshed: false,
            reason: 'NO_TOKEN'
        };
    }

    if (!token.expiresAt) {
        return {
            refreshed: false,
            reason: 'NO_EXPIRY',
            message: 'Token has no expiration date'
        };
    }

    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const bufferTime = new Date(expiresAt.getTime() - bufferMinutes * 60 * 1000);

    // Token is still valid with buffer
    if (now < bufferTime) {
        return {
            refreshed: false,
            reason: 'TOKEN_VALID',
            expiresAt,
            timeUntilExpiry: Math.floor((expiresAt - now) / 1000 / 60) + ' minutes'
        };
    }

    // Token is expired or about to expire, refresh it
    console.log(`🔄 Auto-refreshing ${provider} token for user ${userId}`);
    const refreshResult = await refreshOAuthToken(userId, provider);

    return {
        refreshed: refreshResult.success,
        reason: refreshResult.success ? 'TOKEN_REFRESHED' : 'REFRESH_FAILED',
        result: refreshResult
    };
}

/**
 * Revoke an OAuth token (disconnect provider)
 */
async function revokeOAuthToken(userId, provider) {
    const token = await OAuthToken.findOne({
        where: { userId, provider }
    });

    if (!token) {
        return {
            success: false,
            error: 'NO_TOKEN',
            message: `No OAuth token found for ${provider}`
        };
    }

    const accessToken = decrypt(token.accessTokenEncrypted);

    // Provider-specific revocation endpoints
    const revokeConfigs = {
        strava: {
            url: 'https://www.strava.com/oauth/deauthorize',
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        },
        // Other providers may have different revocation methods
    };

    const config = revokeConfigs[provider.toLowerCase()];

    // Try to revoke on provider side first
    if (config) {
        try {
            await fetch(config.url, {
                method: config.method,
                headers: config.headers
            });
        } catch (error) {
            console.warn(`Failed to revoke ${provider} token on provider side:`, error.message);
            // Continue to delete from database anyway
        }
    }

    // Delete token from database
    await token.destroy();

    return {
        success: true,
        message: `Successfully disconnected ${provider}`,
        provider
    };
}

/**
 * Get token health status for all providers
 */
async function getTokenHealth(userId) {
    const tokens = await OAuthToken.findAll({
        where: { userId }
    });

    const health = {
        userId,
        timestamp: new Date(),
        providers: {},
        summary: {
            total: 0,
            healthy: 0,
            expiring: 0,
            expired: 0,
            error: 0
        }
    };

    for (const token of tokens) {
        const provider = token.provider;
        const now = new Date();
        const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;

        let status = 'healthy';
        let details = {};

        if (!expiresAt) {
            status = 'healthy';
            details.note = 'No expiration date';
        } else {
            const timeUntilExpiry = expiresAt - now;
            const minutesUntilExpiry = Math.floor(timeUntilExpiry / 1000 / 60);

            if (timeUntilExpiry < 0) {
                status = 'expired';
                details.expiredAt = expiresAt;
                details.expiredMinutesAgo = Math.abs(minutesUntilExpiry);
                details.hasRefreshToken = !!token.refreshTokenEncrypted;
                health.summary.expired++;
            } else if (timeUntilExpiry < 24 * 60 * 60 * 1000) {
                status = 'expiring';
                details.expiresAt = expiresAt;
                details.minutesUntilExpiry = minutesUntilExpiry;
                health.summary.expiring++;
            } else {
                status = 'healthy';
                details.expiresAt = expiresAt;
                details.daysUntilExpiry = Math.floor(minutesUntilExpiry / 60 / 24);
                health.summary.healthy++;
            }
        }

        health.providers[provider] = {
            status,
            ...details,
            lastUpdated: token.updatedAt
        };

        health.summary.total++;
    }

    return health;
}

/**
 * Bulk token refresh for all expired tokens
 */
async function bulkRefreshTokens(userId) {
    const health = await getTokenHealth(userId);
    const refreshResults = [];

    for (const [provider, providerHealth] of Object.entries(health.providers)) {
        if (providerHealth.status === 'expired' && providerHealth.hasRefreshToken) {
            const result = await refreshOAuthToken(userId, provider);
            refreshResults.push({
                provider,
                ...result
            });
        }
    }

    const successful = refreshResults.filter(r => r.success).length;
    const failed = refreshResults.length - successful;

    return {
        total: refreshResults.length,
        successful,
        failed,
        results: refreshResults
    };
}

module.exports = {
    refreshOAuthToken,
    autoRefreshIfNeeded,
    revokeOAuthToken,
    getTokenHealth,
    bulkRefreshTokens
};
