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
            attributes: ['userId', 'providerUserId', 'connectedAt']
        });

        res.json({
            totalActivities: activities.length,
            totalTokens: tokens.length,
            activities: activities,
            tokens: tokens
        });
    } catch (error) {
        console.error('Error querying Garmin data:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
