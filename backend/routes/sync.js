const express = require('express');
const router = express.Router();
const { syncUserData, syncAllUsers } = require('../services/syncService');
const { HeartRateZone, TrainingSummary, Activity } = require('../models');

/**
 * Manually trigger sync for a specific user
 * POST /api/sync/manual
 * Body: { userId: "uuid", daysBack: 7 }
 */
router.post('/manual', async (req, res) => {
    try {
        const { userId, daysBack = 7 } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        console.log(`🔄 Manual sync requested for user ${userId}`);

        const results = await syncUserData(userId, daysBack);

        res.json({
            success: true,
            message: `Synced ${daysBack} days of data`,
            results
        });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            error: 'Sync failed',
            message: error.message
        });
    }
});

/**
 * Get sync status for a user
 * GET /api/sync/status/:userId
 */
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get last sync info
        const lastActivity = await Activity.findOne({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        const totalActivities = await Activity.count({
            where: { userId }
        });

        const totalZoneRecords = await HeartRateZone.count({
            where: { userId }
        });

        const weeklySummary = await TrainingSummary.findOne({
            where: {
                userId,
                periodType: 'weekly'
            },
            order: [['periodStart', 'DESC']]
        });

        res.json({
            userId,
            lastSync: lastActivity?.createdAt,
            totalActivities,
            totalZoneRecords,
            weeklySummary: weeklySummary ? {
                periodStart: weeklySummary.periodStart,
                periodEnd: weeklySummary.periodEnd,
                totalTrainingMinutes: weeklySummary.totalTrainingMinutes,
                zone1Percent: weeklySummary.zone1Percent,
                zone2Percent: weeklySummary.zone2Percent,
                zone3Percent: weeklySummary.zone3Percent,
                zone4Percent: weeklySummary.zone4Percent,
                zone5Percent: weeklySummary.zone5Percent
            } : null
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to get status',
            message: error.message
        });
    }
});

/**
 * Get HR zone data for a user
 * GET /api/sync/zones/:userId?days=7
 */
router.get('/zones/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const days = parseInt(req.query.days) || 7;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const zones = await HeartRateZone.findAll({
            where: {
                userId,
                date: {
                    [require('sequelize').Op.gte]: startDate
                }
            },
            order: [['date', 'DESC']],
            include: [{
                model: require('../models').Activity,
                attributes: ['activityName', 'activityType', 'startTime']
            }]
        });

        res.json({
            userId,
            days,
            zoneRecords: zones.length,
            data: zones.map(z => ({
                date: z.date,
                activityType: z.activityType,
                durationMinutes: Math.round(z.durationSeconds / 60),
                provider: z.provider,
                zones: {
                    zone1: Math.round(z.zone1Seconds / 60),
                    zone2: Math.round(z.zone2Seconds / 60),
                    zone3: Math.round(z.zone3Seconds / 60),
                    zone4: Math.round(z.zone4Seconds / 60),
                    zone5: Math.round(z.zone5Seconds / 60)
                },
                hr: {
                    avg: z.avgHr,
                    max: z.maxHr
                }
            }))
        });
    } catch (error) {
        console.error('Zone fetch error:', error);
        res.status(500).json({
            error: 'Failed to get zones',
            message: error.message
        });
    }
});

/**
 * Sync all users (admin only - for testing)
 * POST /api/sync/all
 */
router.post('/all', async (req, res) => {
    try {
        console.log('🔄 Syncing all users...');

        // Run async (don't wait for completion)
        syncAllUsers().catch(err => {
            console.error('Background sync error:', err);
        });

        res.json({
            success: true,
            message: 'Sync started for all users'
        });
    } catch (error) {
        console.error('Sync all error:', error);
        res.status(500).json({
            error: 'Failed to start sync',
            message: error.message
        });
    }
});

/**
 * List all users (for finding your user ID)
 * GET /api/sync/users
 */
router.get('/users', async (req, res) => {
    try {
        const { OAuthToken } = require('../models');

        const tokens = await OAuthToken.findAll({
            attributes: ['userId', 'provider', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            users: tokens.map(t => ({
                userId: t.userId,
                provider: t.provider,
                connectedAt: t.createdAt
            }))
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({
            error: 'Failed to list users',
            message: error.message
        });
    }
});

/**
 * Save OAuth token to database
 * POST /api/sync/save-token
 * Body: { provider: 'garmin', accessToken: '...', refreshToken: '...', expiresAt: '...' }
 */
router.post('/save-token', async (req, res) => {
    try {
        const { provider, accessToken, refreshToken, expiresAt } = req.body;
        const { User, OAuthToken } = require('../models');
        const { encrypt } = require('../utils/encryption');
        const { v4: uuidv4 } = require('uuid');

        if (!provider || !accessToken) {
            return res.status(400).json({ error: 'provider and accessToken required' });
        }

        // Create or get user (for now, use a single user - in production you'd use session)
        let user = await User.findOne({ where: { email: 'athlete@athlytx.com' } });

        if (!user) {
            user = await User.create({
                id: uuidv4(),
                email: 'athlete@athlytx.com',
                name: 'Athlytx Athlete'
            });
            console.log('✅ Created user:', user.id);
        }

        // Save or update OAuth token
        const [token, created] = await OAuthToken.upsert({
            userId: user.id,
            provider: provider,
            accessTokenEncrypted: encrypt(accessToken),
            refreshTokenEncrypted: refreshToken ? encrypt(refreshToken) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null
        }, {
            returning: true
        });

        console.log(`✅ ${created ? 'Created' : 'Updated'} ${provider} token for user ${user.id}`);

        res.json({
            success: true,
            userId: user.id,
            provider: provider,
            action: created ? 'created' : 'updated'
        });
    } catch (error) {
        console.error('Save token error:', error);
        res.status(500).json({
            error: 'Failed to save token',
            message: error.message
        });
    }
});

module.exports = router;
