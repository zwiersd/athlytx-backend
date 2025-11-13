const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { OAuthToken, Activity } = require('../models');
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

        // Return raw data so we can see the structure - LOOK FOR DEVICE FIELDS
        res.json({
            message: 'Raw Garmin data (last 3 days)',
            count: activities.length,
            deviceFieldsFound: {
                hasDeviceId: activities.some(a => a.deviceId),
                hasDeviceModel: activities.some(a => a.deviceModel),
                hasDeviceName: activities.some(a => a.deviceName),
                hasManufacturer: activities.some(a => a.manufacturerName),
                hasMetadata: activities.some(a => a.metadataDTO),
                sampleDeviceFields: activities[0] ? {
                    deviceId: activities[0].deviceId,
                    deviceModel: activities[0].deviceModel,
                    deviceName: activities[0].deviceName,
                    manufacturer: activities[0].manufacturerName,
                    metadata: activities[0].metadataDTO
                } : null
            },
            activities: activities.map(a => ({
                activityId: a.activityId || a.summaryId,
                activityType: a.activityType,
                activityName: a.activityName,
                startTime: new Date(a.startTimeInSeconds * 1000),
                durationMinutes: Math.round(a.durationInSeconds / 60),
                averageHR: a.averageHeartRateInBeatsPerMinute,
                maxHR: a.maxHeartRateInBeatsPerMinute,
                // Device fields - checking what's available:
                deviceId: a.deviceId,
                deviceModel: a.deviceModel,
                deviceName: a.deviceName,
                manufacturer: a.manufacturerName,
                metadataDTO: a.metadataDTO,
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

/**
 * Check for device model data in stored Garmin activities
 * GET /api/test/garmin/device-data/:userId
 */
router.get('/garmin/device-data/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get recent Garmin activities with rawData
        const activities = await Activity.findAll({
            where: {
                userId,
                provider: 'garmin'
            },
            attributes: ['id', 'activityType', 'activityName', 'startTime', 'rawData'],
            limit: 10,
            order: [['startTime', 'DESC']]
        });

        if (activities.length === 0) {
            return res.json({
                userId,
                message: 'No Garmin activities found',
                activitiesFound: 0
            });
        }

        // Extract and display rawData to look for device fields
        const deviceData = activities.map(act => {
            const rawData = act.rawData || {};

            return {
                id: act.id,
                activityType: act.activityType,
                activityName: act.activityName,
                startTime: act.startTime,
                rawDataKeys: Object.keys(rawData),
                deviceFields: {
                    deviceId: rawData.deviceId,
                    deviceModel: rawData.deviceModel,
                    deviceName: rawData.deviceName,
                    device: rawData.device,
                    manufacturerName: rawData.manufacturerName,
                    sourceDevice: rawData.sourceDevice,
                    metadataDTO: rawData.metadataDTO
                },
                // Sample of full raw data (first activity only)
                fullRawDataSample: activities.indexOf(act) === 0 ? rawData : undefined
            };
        });

        res.json({
            userId,
            activitiesFound: activities.length,
            deviceData,
            summary: {
                hasDeviceId: deviceData.some(d => d.deviceFields.deviceId),
                hasDeviceModel: deviceData.some(d => d.deviceFields.deviceModel),
                hasDeviceName: deviceData.some(d => d.deviceFields.deviceName),
                hasMetadata: deviceData.some(d => d.deviceFields.metadataDTO)
            }
        });
    } catch (error) {
        console.error('Device data check error:', error);
        res.status(500).json({
            error: 'Device data check failed',
            message: error.message
        });
    }
});

module.exports = router;
