const express = require('express');
const router = express.Router();
const { Activity, OAuthToken, HeartRateZone, DailyMetric, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * EMERGENCY: Separate mixed user data by device model
 * This fixes the data breach where two users' activities got merged
 *
 * POST /api/debug/garmin/separate-by-device
 * Body: {
 *   currentUserId: "uuid",           // The userId that has mixed data
 *   deviceToSeparate: "Forerunner 955", // Device model to move to new user
 *   newUserEmail: "other@email.com"  // Optional: email for new user
 * }
 */
router.post('/debug/garmin/separate-by-device', async (req, res) => {
    try {
        const { currentUserId, deviceToSeparate, newUserEmail } = req.body;

        if (!currentUserId || !deviceToSeparate) {
            return res.status(400).json({
                error: 'currentUserId and deviceToSeparate required'
            });
        }

        console.log(`🔧 EMERGENCY: Separating device "${deviceToSeparate}" from user ${currentUserId}`);

        // 1. Find all activities with this device
        const activitiesToMove = await Activity.findAll({
            where: {
                userId: currentUserId,
                provider: 'garmin'
            }
        });

        // Filter by device in rawData
        const matchingActivities = activitiesToMove.filter(a => {
            const raw = a.rawData || {};
            const device = raw.deviceName || raw.deviceModel || '';
            return device.toLowerCase().includes(deviceToSeparate.toLowerCase());
        });

        console.log(`📊 Found ${matchingActivities.length} activities with device "${deviceToSeparate}"`);

        if (matchingActivities.length === 0) {
            return res.json({
                success: false,
                message: `No activities found with device "${deviceToSeparate}"`,
                hint: 'Check device names in /api/debug/garmin/all'
            });
        }

        // 2. Create new user for the separated data
        const newUserId = uuidv4();
        const email = newUserEmail || `separated-user-${newUserId.substring(0, 8)}@athlytx.com`;

        await User.create({
            id: newUserId,
            email: email,
            name: `User (${deviceToSeparate})`,
            role: 'athlete',
            isActive: true
        });

        console.log(`✅ Created new user: ${newUserId}`);

        // 3. Move activities to new user
        const activityIds = matchingActivities.map(a => a.id);
        await Activity.update(
            { userId: newUserId },
            { where: { id: activityIds } }
        );

        console.log(`✅ Moved ${activityIds.length} activities to new user`);

        // 4. Move related HR zones
        const movedZones = await HeartRateZone.update(
            { userId: newUserId },
            { where: { activityId: activityIds } }
        );

        console.log(`✅ Moved ${movedZones[0]} HR zone records`);

        // 5. Check if Garmin token should move (based on providerUserId matching activities)
        // For now, we'll leave the token - the other user needs to reconnect

        res.json({
            success: true,
            message: `Successfully separated ${matchingActivities.length} activities`,
            newUserId: newUserId,
            newUserEmail: email,
            movedActivities: activityIds.length,
            movedHrZones: movedZones[0],
            nextSteps: [
                'The other user should clear localStorage and reconnect Garmin',
                'You may need to reconnect your Garmin as well',
                `New user can login with email: ${email}`
            ]
        });

    } catch (error) {
        console.error('Error separating users:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get activities grouped by device model
 * GET /api/debug/garmin/by-device?userId=xxx
 */
router.get('/debug/garmin/by-device', async (req, res) => {
    try {
        const { userId } = req.query;

        const where = { provider: 'garmin' };
        if (userId) where.userId = userId;

        const activities = await Activity.findAll({
            where,
            order: [['startTime', 'DESC']],
            limit: 200
        });

        // Group by device
        const byDevice = {};
        activities.forEach(a => {
            const raw = a.rawData || {};
            const device = raw.deviceName || raw.deviceModel || 'Unknown';
            if (!byDevice[device]) {
                byDevice[device] = {
                    count: 0,
                    activities: [],
                    userIds: new Set()
                };
            }
            byDevice[device].count++;
            byDevice[device].userIds.add(a.userId);
            byDevice[device].activities.push({
                id: a.id,
                name: a.activityName,
                type: a.activityType,
                date: a.startTime,
                userId: a.userId
            });
        });

        // Convert Sets to arrays for JSON
        Object.keys(byDevice).forEach(device => {
            byDevice[device].userIds = Array.from(byDevice[device].userIds);
        });

        res.json({
            totalActivities: activities.length,
            devices: byDevice
        });

    } catch (error) {
        console.error('Error grouping by device:', error);
        res.status(500).json({ error: error.message });
    }
});

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
