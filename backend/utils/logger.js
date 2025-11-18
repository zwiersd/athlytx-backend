/**
 * Logging Infrastructure
 *
 * Purpose: Centralized logging for invite system events
 * Helps with debugging, monitoring, and audit trails
 */

const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

/**
 * Format log message with timestamp and context
 * @param {string} level - Log level
 * @param {string} event - Event name
 * @param {object} data - Event data
 * @returns {object}
 */
function formatLogMessage(level, event, data) {
    return {
        timestamp: new Date().toISOString(),
        level,
        event,
        ...data
    };
}

/**
 * Log invite-related events
 * @param {string} event - Event name (e.g., 'CREATED', 'ACCEPTED', 'REVOKED')
 * @param {object} data - Event data
 */
function logInviteEvent(event, data) {
    const logMessage = formatLogMessage(LOG_LEVELS.INFO, `INVITE-${event}`, data);
    console.log(JSON.stringify(logMessage));

    // In production, could send to external logging service (DataDog, LogRocket, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //     sendToLoggingService(logMessage);
    // }
}

/**
 * Log device sharing consent events
 * @param {string} event - Event name (e.g., 'CONSENT_GRANTED', 'ACCESS_REVOKED')
 * @param {object} data - Event data
 */
function logConsentEvent(event, data) {
    const logMessage = formatLogMessage(LOG_LEVELS.INFO, `CONSENT-${event}`, data);
    console.log(JSON.stringify(logMessage));
}

/**
 * Log permission check events
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
function logPermissionEvent(event, data) {
    const logMessage = formatLogMessage(LOG_LEVELS.DEBUG, `PERMISSION-${event}`, data);

    // Only log in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.LOG_PERMISSIONS === 'true') {
        console.log(JSON.stringify(logMessage));
    }
}

/**
 * Log error events
 * @param {string} context - Context where error occurred
 * @param {Error} error - Error object
 * @param {object} additionalData - Additional context
 */
function logError(context, error, additionalData = {}) {
    const logMessage = formatLogMessage(LOG_LEVELS.ERROR, `ERROR-${context}`, {
        message: error.message,
        stack: error.stack,
        ...additionalData
    });
    console.error(JSON.stringify(logMessage));

    // In production, send to error tracking service (Sentry, etc.)
    // if (process.env.NODE_ENV === 'production') {
    //     sendToSentry(error, additionalData);
    // }
}

/**
 * Log email events
 * @param {string} event - Event name (e.g., 'SENT', 'FAILED')
 * @param {object} data - Event data
 */
function logEmailEvent(event, data) {
    const logMessage = formatLogMessage(LOG_LEVELS.INFO, `EMAIL-${event}`, data);
    console.log(JSON.stringify(logMessage));
}

/**
 * Log API request/response for debugging
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
function logAPIRequest(req, res, duration) {
    const logMessage = formatLogMessage(LOG_LEVELS.INFO, 'API-REQUEST', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    console.log(JSON.stringify(logMessage));
}

/**
 * Express middleware to log all API requests
 * Use: app.use(requestLogger);
 */
function requestLogger(req, res, next) {
    const startTime = Date.now();

    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logAPIRequest(req, res, duration);
    });

    next();
}

/**
 * Log migration events
 * @param {string} migration - Migration name
 * @param {string} status - Status (START, SUCCESS, ERROR, etc.)
 * @param {string} message - Log message
 */
function logMigrationEvent(migration, status, message) {
    const logMessage = formatLogMessage(LOG_LEVELS.INFO, `MIGRATION-${status}`, {
        migration,
        message
    });
    console.log(JSON.stringify(logMessage));
}

/**
 * Log API call to database for investigation and monitoring
 * @param {object} logData - API log data
 * @param {string} logData.method - HTTP method
 * @param {string} logData.endpoint - API endpoint
 * @param {number} logData.statusCode - Response status code
 * @param {number} logData.durationMs - Request duration in milliseconds
 * @param {string} logData.userId - User ID (if authenticated)
 * @param {string} logData.provider - OAuth provider (if applicable)
 * @param {object} logData.requestBody - Request body (sensitive fields will be redacted)
 * @param {object} logData.responseBody - Response body (sensitive fields will be redacted)
 * @param {string} logData.errorMessage - Error message (if failed)
 * @param {string} logData.errorStack - Error stack trace (if failed)
 * @param {string} logData.ipAddress - Client IP address
 * @param {string} logData.userAgent - Client user agent
 * @param {boolean} logData.isOAuthFlow - True if OAuth-related request
 * @param {array} logData.tags - Additional tags for categorization
 */
async function logAPICall(logData) {
    try {
        const { APILog } = require('../models');

        // Redact sensitive data before saving
        const redactedRequestBody = logData.requestBody
            ? APILog.redactSensitiveData(logData.requestBody)
            : null;
        const redactedResponseBody = logData.responseBody
            ? APILog.redactSensitiveData(logData.responseBody)
            : null;

        // Save to database
        await APILog.create({
            userId: logData.userId || null,
            method: logData.method,
            endpoint: logData.endpoint,
            provider: logData.provider || null,
            statusCode: logData.statusCode,
            durationMs: logData.durationMs || null,
            requestBody: redactedRequestBody,
            responseBody: redactedResponseBody,
            errorMessage: logData.errorMessage || null,
            errorStack: process.env.NODE_ENV === 'development' ? logData.errorStack : null,
            ipAddress: logData.ipAddress || null,
            userAgent: logData.userAgent || null,
            isOAuthFlow: logData.isOAuthFlow || false,
            tags: logData.tags || null
        });

        // Also log to console for development
        if (process.env.NODE_ENV === 'development' || logData.statusCode >= 400) {
            const logMessage = formatLogMessage(
                logData.statusCode >= 500 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO,
                'API-CALL',
                {
                    method: logData.method,
                    endpoint: logData.endpoint,
                    status: logData.statusCode,
                    duration: logData.durationMs ? `${logData.durationMs}ms` : null,
                    provider: logData.provider,
                    isOAuth: logData.isOAuthFlow,
                    error: logData.errorMessage
                }
            );
            console.log(JSON.stringify(logMessage));
        }
    } catch (error) {
        // Don't throw - logging failures shouldn't crash the app
        console.error('❌ CRITICAL: Failed to log API call:', error.message);
        console.error('❌ Error details:', error);
        console.error('❌ Stack:', error.stack);
    }
}

/**
 * Query API logs with filters
 * @param {object} filters - Query filters
 * @param {string} filters.userId - Filter by user ID
 * @param {string} filters.provider - Filter by provider
 * @param {number} filters.statusCode - Filter by status code
 * @param {string} filters.endpoint - Filter by endpoint (partial match)
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {boolean} filters.isOAuthFlow - Filter OAuth flows only
 * @param {number} filters.limit - Limit results (default 100)
 * @returns {Promise<Array>} - Array of API log records
 */
async function getAPILogs(filters = {}) {
    try {
        const { APILog } = require('../models');
        const { Op } = require('sequelize');

        const where = {};

        if (filters.userId) where.userId = filters.userId;
        if (filters.provider) where.provider = filters.provider;
        if (filters.statusCode) where.statusCode = filters.statusCode;
        if (filters.endpoint) {
            where.endpoint = { [Op.like]: `%${filters.endpoint}%` };
        }
        if (filters.isOAuthFlow !== undefined) where.isOAuthFlow = filters.isOAuthFlow;

        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt[Op.gte] = filters.startDate;
            if (filters.endDate) where.createdAt[Op.lte] = filters.endDate;
        }

        const logs = await APILog.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: filters.limit || 100,
            include: [
                {
                    association: 'User',
                    attributes: ['id', 'email', 'role']
                }
            ]
        });

        return logs;
    } catch (error) {
        console.error('Failed to query API logs:', error.message);
        return [];
    }
}

/**
 * Get OAuth flow logs for a specific user and provider
 * @param {string} userId - User ID
 * @param {string} provider - OAuth provider (optional)
 * @returns {Promise<Array>} - Array of OAuth-related API logs
 */
async function getOAuthLogs(userId, provider = null) {
    const filters = {
        userId,
        isOAuthFlow: true,
        limit: 50
    };

    if (provider) {
        filters.provider = provider;
    }

    return getAPILogs(filters);
}

/**
 * Get recent API errors (status >= 400)
 * @param {number} hours - Number of hours to look back (default 24)
 * @param {number} limit - Limit results (default 100)
 * @returns {Promise<Array>} - Array of error logs
 */
async function getRecentErrors(hours = 24, limit = 100) {
    try {
        const { APILog } = require('../models');
        const { Op } = require('sequelize');

        const startDate = new Date();
        startDate.setHours(startDate.getHours() - hours);

        const logs = await APILog.findAll({
            where: {
                statusCode: { [Op.gte]: 400 },
                createdAt: { [Op.gte]: startDate }
            },
            order: [['createdAt', 'DESC']],
            limit: limit
        });

        return logs;
    } catch (error) {
        console.error('Failed to query recent errors:', error.message);
        return [];
    }
}

module.exports = {
    logInviteEvent,
    logConsentEvent,
    logPermissionEvent,
    logError,
    logEmailEvent,
    logAPIRequest,
    requestLogger,
    logMigrationEvent,
    // New API logging functions
    logAPICall,
    getAPILogs,
    getOAuthLogs,
    getRecentErrors,
    LOG_LEVELS
};
