const express = require('express');
const router = express.Router();
const { OAuthToken } = require('../models');

/**
 * GARMIN HEALTH API REQUIRED ENDPOINTS
 *
 * These endpoints are required for Garmin Health API production approval
 * See: https://developer.garmin.com/gc-developer-program/overview/
 */

/**
 * PING Endpoint - Required by Garmin
 * Garmin sends periodic pings to verify your server is responding
 * Must return HTTP 200 within 30 seconds
 *
 * GET /api/garmin/ping
 */
router.get('/ping', async (req, res) => {
    console.log('📍 Garmin PING received');

    try {
        // Return 200 immediately to confirm server is alive
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'Athlytx Garmin Health API'
        });
    } catch (error) {
        console.error('❌ Garmin PING error:', error);
        // Still return 200 to pass verification
        res.status(200).json({ status: 'ok' });
    }
});

/**
 * PUSH/Webhook Endpoint - Required by Garmin
 * Receives health data from Garmin asynchronously
 * Must handle min 10MB payloads (Activity Details: 100MB)
 * Must return HTTP 200 within 30 seconds
 *
 * POST /api/garmin/push
 */
router.post('/push', async (req, res) => {
    console.log('📨 Garmin PUSH notification received');

    try {
        const data = req.body;

        // Log what data types we received
        const dataTypes = Object.keys(data).filter(key => Array.isArray(data[key]) && data[key].length > 0);
        console.log('📊 PUSH data types received:', dataTypes);
        dataTypes.forEach(type => {
            console.log(`  - ${type}: ${data[type].length} items`);
        });

        console.log('PUSH data:', JSON.stringify(data, null, 2));

        // Return 200 immediately (within 30 seconds requirement)
        res.status(200).json({
            status: 'received',
            timestamp: new Date().toISOString()
        });

        // Process data asynchronously after responding
        processGarminPushData(data).catch(err => {
            console.error('❌ Error processing Garmin PUSH data:', err);
        });

    } catch (error) {
        console.error('❌ Garmin PUSH error:', error);
        // Still return 200 to maintain connection
        res.status(200).json({ status: 'error', message: error.message });
    }
});

/**
 * User Deregistration Endpoint - Required by Garmin
 * Called when a user disconnects their Garmin account
 * Must delete all user data and return HTTP 200
 *
 * POST /api/garmin/deregister
 * Body: { userId: "garmin_user_id" } or { userAccessToken: "..." }
 */
router.post('/deregister', async (req, res) => {
    console.log('🗑️  Garmin user deregistration requested');

    try {
        const { userId, userAccessToken } = req.body;

        console.log('Deregistering user:', { userId, hasToken: !!userAccessToken });

        if (!userId && !userAccessToken) {
            return res.status(400).json({
                error: 'userId or userAccessToken required'
            });
        }

        // Find and delete OAuth token
        let deleted = 0;

        if (userId) {
            deleted = await OAuthToken.destroy({
                where: {
                    userId: userId,
                    provider: 'garmin'
                }
            });
        }

        // Also try to find by external identifiers if provided
        // (You may need to add a garminUserId field to OAuthToken model)

        console.log(`✅ Deregistered Garmin user, deleted ${deleted} token(s)`);

        res.status(200).json({
            status: 'success',
            message: 'User deregistered',
            deletedTokens: deleted
        });

    } catch (error) {
        console.error('❌ Garmin deregistration error:', error);
        res.status(500).json({
            error: 'Deregistration failed',
            message: error.message
        });
    }
});

/**
 * User Permissions Endpoint - Required by Garmin
 * Returns what data permissions your app is requesting
 *
 * GET /api/garmin/permissions
 */
router.get('/permissions', async (req, res) => {
    console.log('🔐 Garmin permissions request');

    try {
        // Define what Garmin Health API data you're accessing
        const permissions = {
            application: 'Athlytx',
            dataTypes: [
                'ACTIVITIES',           // Activity files and summaries
                'ACTIVITY_DETAILS',     // Detailed activity data
                'DAILY_SUMMARIES',      // Daily health summaries
                'WELLNESS',             // Heart rate, stress, sleep, etc.
                'USER_METRICS'          // User profile data
            ],
            purposes: [
                'Training analytics and coaching',
                'Heart rate zone analysis',
                'Performance tracking',
                'Training load management'
            ],
            dataRetention: '90 days',
            sharingWithThirdParties: false
        };

        res.status(200).json(permissions);

    } catch (error) {
        console.error('❌ Garmin permissions error:', error);
        res.status(500).json({
            error: 'Failed to retrieve permissions',
            message: error.message
        });
    }
});

/**
 * Backfill Endpoint - Optional but recommended
 * Allows requesting historical data for a user
 *
 * POST /api/garmin/backfill
 */
router.post('/backfill', async (req, res) => {
    console.log('⏪ Garmin backfill request');

    try {
        const { userId, startDate, endDate } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: 'Missing userId',
                message: 'userId is required for backfill'
            });
        }

        console.log('Backfill requested:', { userId, startDate, endDate });

        // Calculate days back from date range
        let daysBack = 90; // Default to 90 days (Garmin's data retention policy)

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            daysBack = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            console.log(`Calculated ${daysBack} days from date range`);
        } else if (startDate) {
            const start = new Date(startDate);
            const now = new Date();
            const diffTime = Math.abs(now - start);
            daysBack = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            console.log(`Calculated ${daysBack} days from start date to now`);
        }

        // Cap at 90 days (Garmin's data retention policy)
        daysBack = Math.min(daysBack, 90);

        // Acknowledge receipt immediately (required by Garmin)
        res.status(200).json({
            status: 'accepted',
            message: 'Backfill request queued',
            timestamp: new Date().toISOString(),
            daysToSync: daysBack
        });

        // Process backfill asynchronously using syncService
        const { syncUserData } = require('../services/syncService');

        syncUserData(userId, daysBack)
            .then(results => {
                console.log('✅ Backfill completed:', results);
            })
            .catch(error => {
                console.error('❌ Backfill processing failed:', error);
            });

    } catch (error) {
        console.error('❌ Garmin backfill error:', error);
        res.status(500).json({
            error: 'Backfill request failed',
            message: error.message
        });
    }
});

/**
 * Process Garmin PUSH data asynchronously
 * This runs AFTER we've already sent the 200 response
 */
async function processGarminPushData(data) {
    console.log('🔄 Processing Garmin PUSH data asynchronously...');

    try {
        const { Activity, HeartRateZone, DailyMetric } = require('../models');

        // Extract userId from any array in the PUSH data
        // Garmin sends userId inside array elements (e.g., allDayRespiration[0].userId)
        let garminUserId = data.userId; // Try root level first

        if (!garminUserId) {
            // Check all possible array fields for userId
            const arrayFields = [
                'summaries', 'activities', 'sleeps', 'stressDetails', 'userMetrics',
                'allDayRespiration', 'epochs', 'dailies', 'thirdPartyDailies'
            ];

            for (const field of arrayFields) {
                if (data[field] && Array.isArray(data[field]) && data[field].length > 0) {
                    garminUserId = data[field][0].userId;
                    if (garminUserId) {
                        console.log(`📍 Found userId in ${field}[0].userId: ${garminUserId}`);
                        break;
                    }
                }
            }
        }

        if (!garminUserId) {
            console.warn('⚠️  No userId found in PUSH data');
            console.warn('Data keys:', Object.keys(data));
            return;
        }

        // Extract data arrays with backward compatibility
        const {
            summaries, activities, sleeps, stressDetails, userMetrics,
            allDayRespiration, epochs, dailies, thirdPartyDailies
        } = data;

        // Find our internal userId from the Garmin GUID
        const token = await OAuthToken.findOne({
            where: {
                provider: 'garmin',
                providerUserId: garminUserId
            }
        });

        if (!token) {
            console.warn(`⚠️  No user found for Garmin userId: ${garminUserId}`);
            return;
        }

        const ourUserId = token.userId;
        console.log(`Processing Health API data for user: ${ourUserId} (Garmin: ${garminUserId})`);

        let stored = 0;

        // Process dailies (Garmin's daily summary endpoint - same as summaries but different name)
        // Garmin can send either "summaries" or "dailies" - both contain daily health metrics
        const dailySummaries = summaries || dailies || [];

        if (dailySummaries.length > 0) {
            console.log(`📊 Processing ${dailySummaries.length} daily summaries from ${summaries ? 'summaries' : 'dailies'} array`);

            for (const summary of dailySummaries) {
                try {
                    await DailyMetric.upsert({
                        userId: ourUserId,
                        date: summary.calendarDate || summary.summaryDate,
                        // Basic metrics (handle both naming conventions)
                        steps: summary.steps,
                        totalKilocalories: summary.totalKilocalories || summary.activeKilocalories + summary.bmrKilocalories,
                        activeCalories: summary.activeKilocalories || summary.activeCalories,
                        bmrKilocalories: summary.bmrKilocalories,
                        // Heart rate (handle both naming conventions)
                        restingHr: summary.restingHeartRate || summary.restingHeartRateInBeatsPerMinute,
                        minHeartRate: summary.minHeartRate || summary.minHeartRateInBeatsPerMinute,
                        maxHeartRate: summary.maxHeartRate || summary.maxHeartRateInBeatsPerMinute,
                        avgHeartRate: summary.averageHeartRate || summary.averageHeartRateInBeatsPerMinute,
                        // Stress
                        averageStressLevel: summary.averageStressLevel,
                        maxStressLevel: summary.maxStressLevel,
                        restStressDuration: summary.restStressDurationInSeconds,
                        activityStressDuration: summary.activityStressDurationInSeconds,
                        lowStressDuration: summary.lowStressDurationInSeconds,
                        mediumStressDuration: summary.mediumStressDurationInSeconds,
                        highStressDuration: summary.highStressDurationInSeconds,
                        // Sleep
                        sleepingSeconds: summary.sleepingSeconds,
                        sleepHours: summary.sleepingSeconds ? summary.sleepingSeconds / 3600 : null,
                        // Activity intensity (handle both naming conventions)
                        moderateIntensityMinutes: summary.moderateIntensityMinutes ||
                            (summary.moderateIntensityDurationInSeconds ? summary.moderateIntensityDurationInSeconds / 60 : null),
                        vigorousIntensityMinutes: summary.vigorousIntensityMinutes ||
                            (summary.vigorousIntensityDurationInSeconds ? summary.vigorousIntensityDurationInSeconds / 60 : null),
                        // Movement (handle both naming conventions)
                        floorsAscended: summary.floorsAscended || summary.floorsClimbed,
                        floorsDescended: summary.floorsDescended,
                        distanceMeters: summary.totalDistanceMeters || summary.distanceInMeters,
                        // Body Battery
                        bodyBatteryChargedValue: summary.bodyBatteryChargedValue,
                        bodyBatteryDrainedValue: summary.bodyBatteryDrainedValue,
                        bodyBatteryHighestValue: summary.bodyBatteryHighestValue,
                        bodyBatteryLowestValue: summary.bodyBatteryLowestValue,
                        // Respiration
                        avgWakingRespirationValue: summary.avgWakingRespirationValue,
                        highestRespirationValue: summary.highestRespirationValue,
                        lowestRespirationValue: summary.lowestRespirationValue,
                        avgSleepRespirationValue: summary.avgSleepRespirationValue,
                        abnormalRespirationSeconds: summary.abnormalRespirationDurationInSeconds
                    });
                    stored++;
                } catch (err) {
                    console.error('Error storing summary:', err.message);
                }
            }
            console.log(`✅ Stored ${stored} daily summaries`);
        }

        // Process activities (workouts with HR data)
        if (activities && activities.length > 0) {
            console.log(`🏃 Processing ${activities.length} activities`);
            stored = 0;

            for (const activity of activities) {
                try {
                    // Store activity
                    const [activityRecord] = await Activity.upsert({
                        userId: ourUserId,
                        provider: 'garmin',
                        externalId: activity.activityId || activity.summaryId,
                        activityType: activity.activityType,
                        activityName: activity.activityName,
                        startTime: new Date(activity.startTimeInSeconds * 1000),
                        durationSeconds: activity.durationInSeconds,
                        distanceMeters: activity.distanceInMeters,
                        calories: activity.activeKilocalories,
                        avgHr: activity.averageHeartRateInBeatsPerMinute,
                        maxHr: activity.maxHeartRateInBeatsPerMinute,
                        deviceModel: activity.deviceModel || activity.deviceName,
                        rawData: activity
                    }, { returning: true });

                    // Process heart rate zones if available
                    if (activity.timeInHeartRateZonesInSeconds && activity.timeInHeartRateZonesInSeconds.length >= 5) {
                        const zones = activity.timeInHeartRateZonesInSeconds;

                        await HeartRateZone.upsert({
                            userId: ourUserId,
                            activityId: activityRecord.id,
                            provider: 'garmin',
                            date: new Date(activity.startTimeInSeconds * 1000),
                            activityType: activity.activityType,
                            durationSeconds: activity.durationInSeconds,
                            zone1Seconds: zones[0] || 0,
                            zone2Seconds: zones[1] || 0,
                            zone3Seconds: zones[2] || 0,
                            zone4Seconds: zones[3] || 0,
                            zone5Seconds: zones[4] || 0,
                            avgHr: activity.averageHeartRateInBeatsPerMinute,
                            maxHr: activity.maxHeartRateInBeatsPerMinute
                        });
                    }

                    stored++;
                } catch (err) {
                    console.error('Error storing activity:', err.message);
                }
            }
            console.log(`✅ Stored ${stored} activities`);
        }

        // Process sleep data
        if (sleeps && sleeps.length > 0) {
            console.log(`😴 Processing ${sleeps.length} sleep records`);
            // Sleep data can be added to DailyMetric or a separate Sleep model
        }

        // Process user metrics (includes HRV data)
        if (userMetrics && userMetrics.length > 0) {
            console.log(`📈 Processing ${userMetrics.length} user metrics (HRV data)`);
            stored = 0;

            for (const metric of userMetrics) {
                try {
                    // Find existing DailyMetric for this date or create new one
                    const date = metric.calendarDate || metric.summaryDate;

                    if (!date) continue;

                    await DailyMetric.upsert({
                        userId: ourUserId,
                        date: date,
                        hrvAvg: metric.avgWakingHeartRateVariabilityInMillis || metric.heartRateVariabilityAvg,
                        restingHr: metric.restingHeartRate
                    });
                    stored++;
                } catch (err) {
                    console.error('Error storing user metrics:', err.message);
                }
            }
            console.log(`✅ Stored ${stored} user metrics with HRV data`);
        }

        // Process epochs (intraday HRV measurements)
        if (epochs && epochs.length > 0) {
            console.log(`⏱️ Processing ${epochs.length} epochs (intraday HRV)`);
            // Epochs contain granular HRV data throughout the day
            // For now, we'll calculate daily average from epochs

            const epochsByDate = {};
            epochs.forEach(epoch => {
                if (epoch.hrvValue || epoch.heartRateVariability) {
                    const date = new Date(epoch.timestampGMT || epoch.startTimeInSeconds * 1000)
                        .toISOString().split('T')[0];

                    if (!epochsByDate[date]) {
                        epochsByDate[date] = [];
                    }
                    epochsByDate[date].push(epoch.hrvValue || epoch.heartRateVariability);
                }
            });

            stored = 0;
            for (const [date, hrvValues] of Object.entries(epochsByDate)) {
                if (hrvValues.length > 0) {
                    const avgHrv = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;

                    try {
                        await DailyMetric.upsert({
                            userId: ourUserId,
                            date: date,
                            hrvAvg: avgHrv
                        });
                        stored++;
                    } catch (err) {
                        console.error('Error storing epoch HRV:', err.message);
                    }
                }
            }
            console.log(`✅ Calculated and stored HRV averages from ${stored} days of epoch data`);
        }

        console.log('✅ Garmin Health API PUSH data processed successfully');

    } catch (error) {
        console.error('❌ Error in processGarminPushData:', error);
        throw error;
    }
}

module.exports = router;
