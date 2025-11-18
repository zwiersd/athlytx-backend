const express = require('express');
const router = express.Router();
const { getAPILogs, getOAuthLogs, getRecentErrors } = require('../utils/logger');
const { APILog } = require('../models');

/**
 * Middleware to check if user is authenticated and is admin
 * In production, you'd want proper authentication middleware
 */
function requireAuth(req, res, next) {
    const userId = req.session?.userId || req.query.userId || req.body.userId;

    if (!userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'You must be logged in to access API logs'
        });
    }

    // TODO: Add admin role check
    // const { User } = require('../models');
    // const user = await User.findByPk(userId);
    // if (user.role !== 'admin') {
    //     return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    // }

    req.userId = userId;
    next();
}

/**
 * GET /api/logs
 * Query API logs with filters
 *
 * Query params:
 * - userId: Filter by user ID
 * - provider: Filter by OAuth provider (strava, garmin, whoop, oura)
 * - statusCode: Filter by HTTP status code
 * - endpoint: Filter by endpoint (partial match)
 * - startDate: Filter by start date (ISO 8601)
 * - endDate: Filter by end date (ISO 8601)
 * - isOAuthFlow: Filter OAuth flows only (true/false)
 * - limit: Limit results (default 100, max 500)
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const filters = {
            userId: req.query.userId,
            provider: req.query.provider,
            statusCode: req.query.statusCode ? parseInt(req.query.statusCode) : undefined,
            endpoint: req.query.endpoint,
            startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            isOAuthFlow: req.query.isOAuthFlow === 'true',
            limit: req.query.limit ? Math.min(parseInt(req.query.limit), 500) : 100
        };

        // Remove undefined values
        Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

        const logs = await getAPILogs(filters);

        res.json({
            success: true,
            count: logs.length,
            filters: filters,
            logs: logs
        });
    } catch (error) {
        console.error('API logs query error:', error);
        res.status(500).json({
            error: error.message,
            message: 'Failed to query API logs'
        });
    }
});

/**
 * GET /api/logs/oauth/:userId
 * Get OAuth flow logs for a specific user
 *
 * Query params:
 * - provider: Filter by specific provider (optional)
 */
router.get('/oauth/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const provider = req.query.provider;

        const logs = await getOAuthLogs(userId, provider);

        res.json({
            success: true,
            userId: userId,
            provider: provider || 'all',
            count: logs.length,
            logs: logs
        });
    } catch (error) {
        console.error('OAuth logs query error:', error);
        res.status(500).json({
            error: error.message,
            message: 'Failed to query OAuth logs'
        });
    }
});

/**
 * GET /api/logs/errors
 * Get recent API errors (status >= 400)
 *
 * Query params:
 * - hours: Number of hours to look back (default 24, max 168)
 * - limit: Limit results (default 100, max 500)
 */
router.get('/errors', requireAuth, async (req, res) => {
    try {
        const hours = req.query.hours ? Math.min(parseInt(req.query.hours), 168) : 24;
        const limit = req.query.limit ? Math.min(parseInt(req.query.limit), 500) : 100;

        const logs = await getRecentErrors(hours, limit);

        res.json({
            success: true,
            timeRange: `Last ${hours} hours`,
            count: logs.length,
            logs: logs
        });
    } catch (error) {
        console.error('Error logs query error:', error);
        res.status(500).json({
            error: error.message,
            message: 'Failed to query error logs'
        });
    }
});

/**
 * GET /api/logs/stats
 * Get API log statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { Op } = require('sequelize');

        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        const [totalLogs, totalErrors, oauthFlows, byProvider] = await Promise.all([
            // Total logs in last 24 hours
            APILog.count({
                where: {
                    createdAt: { [Op.gte]: last24Hours }
                }
            }),

            // Total errors in last 24 hours
            APILog.count({
                where: {
                    statusCode: { [Op.gte]: 400 },
                    createdAt: { [Op.gte]: last24Hours }
                }
            }),

            // OAuth flows in last 24 hours
            APILog.count({
                where: {
                    isOAuthFlow: true,
                    createdAt: { [Op.gte]: last24Hours }
                }
            }),

            // Counts by provider
            APILog.findAll({
                where: {
                    provider: { [Op.ne]: null },
                    createdAt: { [Op.gte]: last24Hours }
                },
                attributes: [
                    'provider',
                    [require('sequelize').fn('COUNT', '*'), 'count']
                ],
                group: ['provider']
            })
        ]);

        const providerStats = byProvider.reduce((acc, row) => {
            acc[row.provider] = parseInt(row.get('count'));
            return acc;
        }, {});

        res.json({
            success: true,
            timeRange: 'Last 24 hours',
            stats: {
                totalRequests: totalLogs,
                totalErrors: totalErrors,
                oauthFlows: oauthFlows,
                errorRate: totalLogs > 0 ? ((totalErrors / totalLogs) * 100).toFixed(2) + '%' : '0%',
                byProvider: providerStats
            }
        });
    } catch (error) {
        console.error('API stats query error:', error);
        res.status(500).json({
            error: error.message,
            message: 'Failed to query API statistics'
        });
    }
});

/**
 * DELETE /api/logs/cleanup
 * Cleanup old API logs (keeps last 30 days)
 */
router.delete('/cleanup', requireAuth, async (req, res) => {
    try {
        const daysToKeep = req.query.days ? parseInt(req.query.days) : 30;

        const deletedCount = await APILog.cleanupOldLogs(daysToKeep);

        res.json({
            success: true,
            message: `Cleaned up logs older than ${daysToKeep} days`,
            deletedCount: deletedCount
        });
    } catch (error) {
        console.error('Log cleanup error:', error);
        res.status(500).json({
            error: error.message,
            message: 'Failed to cleanup logs'
        });
    }
});

module.exports = router;
