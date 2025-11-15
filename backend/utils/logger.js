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
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
function logMigrationEvent(event, data) {
    const logMessage = formatLogMessage(LOG_LEVELS.INFO, `MIGRATION-${event}`, data);
    console.log(JSON.stringify(logMessage));
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
    LOG_LEVELS
};
