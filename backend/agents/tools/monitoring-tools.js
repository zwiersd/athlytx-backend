const { OAuthToken, User } = require('../../models');
const { getTokenHealth, autoRefreshIfNeeded } = require('./token-tools');
const { testOAuthToken } = require('./oauth-tools');

/**
 * Monitoring and Alerting Tools
 * Proactively monitor API health, token status, and system issues
 */

// In-memory monitoring state (use Redis in production)
const monitoringState = {
    lastChecks: new Map(),
    alerts: [],
    metrics: {
        apiCalls: new Map(),
        errors: new Map(),
        tokenRefreshes: 0,
        lastReset: new Date()
    }
};

/**
 * Monitor token health for all users
 */
async function monitorAllTokens() {
    const users = await User.findAll({
        include: [{
            model: OAuthToken,
            as: 'tokens'
        }]
    });

    const results = {
        timestamp: new Date(),
        totalUsers: users.length,
        usersWithTokens: 0,
        totalTokens: 0,
        healthyTokens: 0,
        expiringTokens: 0,
        expiredTokens: 0,
        refreshedTokens: 0,
        alerts: []
    };

    for (const user of users) {
        if (!user.tokens || user.tokens.length === 0) continue;

        results.usersWithTokens++;
        const health = await getTokenHealth(user.id);

        results.totalTokens += health.summary.total;
        results.healthyTokens += health.summary.healthy;
        results.expiringTokens += health.summary.expiring;
        results.expiredTokens += health.summary.expired;

        // Auto-refresh expired tokens
        for (const [provider, status] of Object.entries(health.providers)) {
            if (status.status === 'expired' && status.hasRefreshToken) {
                console.log(`🔄 Auto-refreshing expired token for user ${user.email} - ${provider}`);

                const refreshResult = await autoRefreshIfNeeded(user.id, provider);

                if (refreshResult.refreshed) {
                    results.refreshedTokens++;
                } else {
                    results.alerts.push({
                        severity: 'HIGH',
                        type: 'TOKEN_REFRESH_FAILED',
                        userId: user.id,
                        email: user.email,
                        provider,
                        message: `Failed to auto-refresh ${provider} token`,
                        details: refreshResult.result
                    });
                }
            }

            // Alert on expiring tokens
            if (status.status === 'expiring') {
                results.alerts.push({
                    severity: 'MEDIUM',
                    type: 'TOKEN_EXPIRING',
                    userId: user.id,
                    email: user.email,
                    provider,
                    expiresAt: status.expiresAt,
                    minutesUntilExpiry: status.minutesUntilExpiry
                });
            }
        }
    }

    monitoringState.lastChecks.set('token_health', {
        timestamp: new Date(),
        results
    });

    return results;
}

/**
 * Health check for all API integrations
 */
async function healthCheckAPIs() {
    const results = {
        timestamp: new Date(),
        providers: {},
        overall: 'healthy'
    };

    const providers = ['strava', 'oura', 'garmin', 'whoop'];

    for (const provider of providers) {
        // Check if credentials are configured
        const credentialChecks = {
            strava: ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'],
            oura: ['OURA_CLIENT_ID', 'OURA_CLIENT_SECRET'],
            garmin: ['GARMIN_CONSUMER_KEY', 'GARMIN_CONSUMER_SECRET'],
            whoop: ['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET']
        };

        const requiredVars = credentialChecks[provider];
        const hasCredentials = requiredVars.every(v => !!process.env[v]);

        if (!hasCredentials) {
            results.providers[provider] = {
                status: 'misconfigured',
                message: 'Missing credentials',
                missingVars: requiredVars.filter(v => !process.env[v])
            };
            results.overall = 'degraded';
            continue;
        }

        // Try to find a user with this provider token for testing
        const testToken = await OAuthToken.findOne({
            where: { provider },
            order: [['updatedAt', 'DESC']]
        });

        if (!testToken) {
            results.providers[provider] = {
                status: 'no_users',
                message: 'No users connected yet'
            };
            continue;
        }

        // Test the API connection
        const testResult = await testOAuthToken(testToken.userId, provider);

        results.providers[provider] = {
            status: testResult.success ? 'healthy' : 'error',
            message: testResult.message,
            lastTested: new Date(),
            statusCode: testResult.statusCode
        };

        if (!testResult.success) {
            results.overall = 'degraded';
        }
    }

    monitoringState.lastChecks.set('api_health', {
        timestamp: new Date(),
        results
    });

    return results;
}

/**
 * Track API call metrics
 */
function trackApiCall(provider, endpoint, success, duration, statusCode) {
    const key = `${provider}:${endpoint}`;
    const metrics = monitoringState.metrics.apiCalls.get(key) || {
        provider,
        endpoint,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageDuration: 0,
        lastCall: null,
        statusCodes: {}
    };

    metrics.totalCalls++;
    if (success) {
        metrics.successfulCalls++;
    } else {
        metrics.failedCalls++;
    }

    // Update average duration
    metrics.averageDuration =
        (metrics.averageDuration * (metrics.totalCalls - 1) + duration) / metrics.totalCalls;

    metrics.lastCall = new Date();
    metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;

    monitoringState.metrics.apiCalls.set(key, metrics);

    // Alert on high error rate
    const errorRate = metrics.failedCalls / metrics.totalCalls;
    if (metrics.totalCalls >= 10 && errorRate > 0.5) {
        createAlert({
            severity: 'HIGH',
            type: 'HIGH_ERROR_RATE',
            provider,
            endpoint,
            errorRate: (errorRate * 100).toFixed(1) + '%',
            totalCalls: metrics.totalCalls,
            failedCalls: metrics.failedCalls
        });
    }
}

/**
 * Track errors
 */
function trackError(provider, endpoint, error, context = {}) {
    const key = `${provider}:${error.type || 'UNKNOWN'}`;
    const errorMetrics = monitoringState.metrics.errors.get(key) || {
        provider,
        errorType: error.type || 'UNKNOWN',
        count: 0,
        lastOccurrence: null,
        examples: []
    };

    errorMetrics.count++;
    errorMetrics.lastOccurrence = new Date();

    // Keep last 5 examples
    errorMetrics.examples.push({
        timestamp: new Date(),
        endpoint,
        message: error.message,
        context
    });
    if (errorMetrics.examples.length > 5) {
        errorMetrics.examples.shift();
    }

    monitoringState.metrics.errors.set(key, errorMetrics);

    // Alert on repeated errors
    if (errorMetrics.count >= 5) {
        createAlert({
            severity: 'MEDIUM',
            type: 'REPEATED_ERROR',
            provider,
            errorType: errorMetrics.errorType,
            count: errorMetrics.count,
            lastOccurrence: errorMetrics.lastOccurrence
        });
    }
}

/**
 * Create an alert
 */
function createAlert(alert) {
    const alertWithId = {
        id: Date.now().toString(),
        timestamp: new Date(),
        acknowledged: false,
        ...alert
    };

    monitoringState.alerts.push(alertWithId);

    // Keep only last 100 alerts
    if (monitoringState.alerts.length > 100) {
        monitoringState.alerts = monitoringState.alerts.slice(-100);
    }

    console.log(`🚨 [${alert.severity}] ${alert.type}:`, alert);

    return alertWithId;
}

/**
 * Get current alerts
 */
function getAlerts(filters = {}) {
    let alerts = [...monitoringState.alerts];

    if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
    }

    if (filters.type) {
        alerts = alerts.filter(a => a.type === filters.type);
    }

    if (filters.unacknowledged) {
        alerts = alerts.filter(a => !a.acknowledged);
    }

    return {
        total: alerts.length,
        alerts: alerts.reverse() // Most recent first
    };
}

/**
 * Acknowledge an alert
 */
function acknowledgeAlert(alertId) {
    const alert = monitoringState.alerts.find(a => a.id === alertId);
    if (alert) {
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date();
        return { success: true, alert };
    }
    return { success: false, error: 'Alert not found' };
}

/**
 * Get monitoring metrics summary
 */
function getMetricsSummary() {
    const apiCallsArray = Array.from(monitoringState.metrics.apiCalls.values());
    const errorsArray = Array.from(monitoringState.metrics.errors.values());

    const totalCalls = apiCallsArray.reduce((sum, m) => sum + m.totalCalls, 0);
    const totalErrors = apiCallsArray.reduce((sum, m) => sum + m.failedCalls, 0);
    const overallSuccessRate = totalCalls > 0
        ? ((totalCalls - totalErrors) / totalCalls * 100).toFixed(2)
        : 100;

    return {
        timestamp: new Date(),
        uptime: Date.now() - monitoringState.metrics.lastReset.getTime(),
        apiCalls: {
            total: totalCalls,
            successful: totalCalls - totalErrors,
            failed: totalErrors,
            successRate: overallSuccessRate + '%',
            byProvider: apiCallsArray
        },
        errors: {
            total: errorsArray.reduce((sum, e) => sum + e.count, 0),
            uniqueTypes: errorsArray.length,
            byType: errorsArray
        },
        tokenRefreshes: monitoringState.metrics.tokenRefreshes,
        alerts: {
            total: monitoringState.alerts.length,
            unacknowledged: monitoringState.alerts.filter(a => !a.acknowledged).length,
            bySeverity: {
                critical: monitoringState.alerts.filter(a => a.severity === 'CRITICAL').length,
                high: monitoringState.alerts.filter(a => a.severity === 'HIGH').length,
                medium: monitoringState.alerts.filter(a => a.severity === 'MEDIUM').length,
                low: monitoringState.alerts.filter(a => a.severity === 'LOW').length
            }
        }
    };
}

/**
 * Reset metrics
 */
function resetMetrics() {
    monitoringState.metrics.apiCalls.clear();
    monitoringState.metrics.errors.clear();
    monitoringState.metrics.tokenRefreshes = 0;
    monitoringState.metrics.lastReset = new Date();

    return { success: true, message: 'Metrics reset', timestamp: new Date() };
}

module.exports = {
    monitorAllTokens,
    healthCheckAPIs,
    trackApiCall,
    trackError,
    createAlert,
    getAlerts,
    acknowledgeAlert,
    getMetricsSummary,
    resetMetrics
};
