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

/**
 * Debug endpoint to verify token decryption and API request
 * GET /api/test/garmin/debug/:userId
 */
router.get('/garmin/debug/:userId', async (req, res) => {
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
            return res.status(404).json({ error: 'No Garmin token found for this user' });
        }

        // Decrypt token
        const accessToken = decrypt(tokenRecord.accessTokenEncrypted);

        // Show token info (first/last few chars for security)
        const tokenPreview = accessToken.length > 20
            ? `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 10)}`
            : '[token too short]';

        // Check if it's a JWT
        const isJWT = accessToken.split('.').length === 3;
        let jwtPayload = null;
        if (isJWT) {
            try {
                const payload = accessToken.split('.')[1];
                const decoded = Buffer.from(payload, 'base64').toString();
                jwtPayload = JSON.parse(decoded);
            } catch (e) {
                jwtPayload = { error: 'Failed to decode JWT' };
            }
        }

        // Test API call
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (3 * 24 * 60 * 60);

        const apiUrl = `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startDate}&uploadEndTimeInSeconds=${endDate}`;

        console.log('\n=== GARMIN DEBUG ===');
        console.log('User ID:', userId);
        console.log('Token Preview:', tokenPreview);
        console.log('Token Length:', accessToken.length);
        console.log('Is JWT:', isJWT);
        console.log('API URL:', apiUrl);
        console.log('Authorization Header:', `Bearer ${tokenPreview}`);

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

        let responseBody = null;
        const responseText = await response.text();

        try {
            responseBody = JSON.parse(responseText);
        } catch (e) {
            responseBody = responseText;
        }

        console.log('Response Body:', responseBody);
        console.log('===================\n');

        res.json({
            debug: {
                userId,
                tokenInfo: {
                    preview: tokenPreview,
                    length: accessToken.length,
                    isJWT,
                    jwtPayload: isJWT ? jwtPayload : null,
                    expiresAt: tokenRecord.expiresAt,
                    isExpired: tokenRecord.expiresAt ? new Date(tokenRecord.expiresAt) < new Date() : null
                },
                apiRequest: {
                    url: apiUrl,
                    method: 'GET',
                    startDate: new Date(startDate * 1000).toISOString(),
                    endDate: new Date(endDate * 1000).toISOString()
                },
                apiResponse: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: responseBody
                }
            }
        });

    } catch (error) {
        console.error('Debug endpoint error:', error);
        res.status(500).json({
            error: 'Debug failed',
            message: error.message,
            stack: error.stack
        });
    }
});

module.exports = router;
