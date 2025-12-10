const express = require('express');
const router = express.Router();
const { Activity, OAuthToken } = require('../models');

// Debug endpoint: Get ALL Garmin activities in database
router.get('/debug/garmin/all-activities', async (req, res) => {
    try {
        const activities = await Activity.findAll({
            where: { provider: 'garmin' },
            attributes: ['id', 'userId', 'externalId', 'activityType', 'startTime', 'distanceMeters'],
            order: [['startTime', 'DESC']],
            limit: 100
        });

        const tokens = await OAuthToken.findAll({
            where: { provider: 'garmin' },
            attributes: ['userId', 'providerUserId', 'connectedAt', 'accessTokenEncrypted', 'refreshTokenEncrypted', 'expiresAt']
        });

        // Sanitize tokens for response (don't expose full encrypted values)
        const sanitizedTokens = tokens.map(t => ({
            userId: t.userId,
            providerUserId: t.providerUserId,
            connectedAt: t.connectedAt,
            hasAccessToken: !!t.accessTokenEncrypted,
            hasRefreshToken: !!t.refreshTokenEncrypted,
            accessTokenLength: t.accessTokenEncrypted?.length || 0,
            expiresAt: t.expiresAt
        }));

        res.json({
            totalActivities: activities.length,
            totalTokens: tokens.length,
            activities: activities,
            tokens: sanitizedTokens
        });
    } catch (error) {
        console.error('Error querying Garmin data:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
