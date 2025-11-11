const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { OAuthToken } = require('../models');
const { decrypt } = require('../utils/encryption');

/**
 * Test endpoint to see raw Garmin activity data
 * GET /api/test/garmin/:userId
 */
router.get('/garmin/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get Garmin token
        const tokenRecord = await OAuthToken.findOne({
            where: {
                userId,
                provider: 'garmin'
            }
        });

        if (!tokenRecord) {
            return res.status(404).json({ error: 'No Garmin token found' });
        }

        const accessToken = decrypt(tokenRecord.accessTokenEncrypted);

        // Fetch last 3 days of activities
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (3 * 24 * 60 * 60);

        const response = await fetch(
            `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startDate}&uploadEndTimeInSeconds=${endDate}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Garmin API error',
                status: response.status
            });
        }

        const activities = await response.json();

        // Return raw data so we can see the structure
        res.json({
            message: 'Raw Garmin data (last 3 days)',
            count: activities.length,
            activities: activities.map(a => ({
                activityId: a.activityId || a.summaryId,
                activityType: a.activityType,
                activityName: a.activityName,
                startTime: new Date(a.startTimeInSeconds * 1000),
                durationMinutes: Math.round(a.durationInSeconds / 60),
                averageHR: a.averageHeartRateInBeatsPerMinute,
                maxHR: a.maxHeartRateInBeatsPerMinute,
                // THIS IS THE KEY FIELD:
                hrZones: a.timeInHeartRateZonesInSeconds,
                // Full raw data:
                raw: a
            }))
        });

    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({
            error: 'Test failed',
            message: error.message
        });
    }
});

module.exports = router;
