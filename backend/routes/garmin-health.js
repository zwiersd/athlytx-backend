const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { OAuthToken } = require('../models');
const { decrypt } = require('../utils/encryption');

/**
 * Generate OAuth 1.0a Authorization header for Garmin Health API
 */
function generateGarminOAuth1Header(method, url, consumerKey, consumerSecret, accessToken, tokenSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');

    const params = {
        oauth_consumer_key: consumerKey,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_version: '1.0'
    };

    if (accessToken) {
        params.oauth_token = accessToken;
    }

    // Sort parameters and create parameter string
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    // Create signature base string (use base URL without query params)
    const baseUrl = url.split('?')[0];
    const signatureBaseString = [
        method.toUpperCase(),
        encodeURIComponent(baseUrl),
        encodeURIComponent(sortedParams)
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret || '')}`;

    // Generate signature
    const signature = crypto
        .createHmac('sha1', signingKey)
        .update(signatureBaseString)
        .digest('base64');

    params.oauth_signature = signature;

    // Build Authorization header
    return 'OAuth ' + Object.keys(params)
        .sort()
        .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(params[key])}"`)
        .join(', ');
}

/**
 * Request backfill from Garmin Health API
 * This makes the actual API call to Garmin to request historical data
 */
async function requestGarminBackfill(garminUserId, accessToken, tokenSecret, summaryStartTimeInSeconds, summaryEndTimeInSeconds) {
    const GARMIN_CONSUMER_KEY = process.env.GARMIN_CONSUMER_KEY;
    const GARMIN_CONSUMER_SECRET = process.env.GARMIN_CONSUMER_SECRET;

    // Garmin Health API backfill endpoints - request each data type
    const backfillTypes = [
        'dailies',
        'activities',
        'activityDetails',
        'epochs',
        'sleeps',
        'bodyComps',
        'stress',
        'userMetrics',
        'moveiq',
        'pulseOx',
        'respiration'
    ];

    const results = [];

    for (const dataType of backfillTypes) {
        const url = `https://apis.garmin.com/wellness-api/rest/backfill/${dataType}?summaryStartTimeInSeconds=${summaryStartTimeInSeconds}&summaryEndTimeInSeconds=${summaryEndTimeInSeconds}`;

        try {
            const authHeader = generateGarminOAuth1Header(
                'GET',
                url,
                GARMIN_CONSUMER_KEY,
                GARMIN_CONSUMER_SECRET,
                accessToken,
                tokenSecret
            );

            console.log(`📤 Requesting backfill for ${dataType}...`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                }
            });

            const status = response.status;
            let responseText = '';
            try {
                responseText = await response.text();
            } catch (e) {
                responseText = 'Unable to read response';
            }

            if (status === 200 || status === 202) {
                console.log(`✅ Backfill accepted for ${dataType}`);
                results.push({ type: dataType, status: 'accepted', httpStatus: status });
            } else if (status === 412) {
                console.log(`⚠️ Backfill rejected for ${dataType}: User hasn't enabled historical data toggle`);
                results.push({ type: dataType, status: 'permission_denied', httpStatus: status, message: 'Historical data toggle not enabled' });
            } else {
                console.log(`❌ Backfill failed for ${dataType}: ${status} - ${responseText}`);
                results.push({ type: dataType, status: 'failed', httpStatus: status, error: responseText });
            }
        } catch (error) {
            console.error(`❌ Error requesting backfill for ${dataType}:`, error.message);
            results.push({ type: dataType, status: 'error', error: error.message });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
}

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

        // Log what data types we received (summary only, not full payload)
        const dataTypes = Object.keys(data).filter(key => Array.isArray(data[key]) && data[key].length > 0);
        console.log('📊 PUSH data types received:', dataTypes);
        dataTypes.forEach(type => {
            console.log(`  - ${type}: ${data[type].length} items`);
        });

        // Only log first item of each array type for debugging (not entire 100MB payload)
        if (process.env.NODE_ENV === 'development') {
            dataTypes.forEach(type => {
                if (data[type].length > 0) {
                    console.log(`📝 Sample ${type}:`, JSON.stringify(data[type][0], null, 2));
                }
            });
        }

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
 * User Permission Webhook - Required for Historical Data Toggle (Dec 2024)
 * Garmin sends this when a user changes their historical data permission
 *
 * POST /api/garmin/userPermission
 */
router.post('/userPermission', async (req, res) => {
    console.log('🔐 Garmin User Permission update received');

    try {
        const data = req.body;

        // Log the permission change details
        console.log('📋 Permission update payload:', JSON.stringify(data, null, 2));

        // Extract user and permission info
        // Payload format: { userId: "garmin_user_id", permissions: { historicalData: true/false } }
        const { userId, userAccessToken, permissions } = data;

        if (userId || userAccessToken) {
            console.log(`👤 User: ${userId || 'token-based'}`);
            console.log(`📊 Historical data access: ${permissions?.historicalData ? 'ENABLED' : 'DISABLED'}`);

            // Store permission state on the token for future reference
            if (userId) {
                const token = await OAuthToken.findOne({
                    where: { provider: 'garmin', providerUserId: userId },
                    order: [['connectedAt', 'DESC']]
                });

                if (token) {
                    let scopesObj = {};
                    if (token.scopes) {
                        scopesObj = typeof token.scopes === 'string'
                            ? JSON.parse(token.scopes)
                            : token.scopes;
                    }
                    scopesObj.historicalDataEnabled = permissions?.historicalData || false;
                    scopesObj.permissionUpdatedAt = new Date().toISOString();
                    token.scopes = scopesObj;
                    await token.save();
                    console.log(`✅ Stored permission state for user ${token.userId}`);
                }
            }
        }

        // Return 200 immediately (required by Garmin)
        res.status(200).json({
            status: 'received',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Garmin User Permission webhook error:', error);
        // Still return 200 to acknowledge receipt
        res.status(200).json({ status: 'error', message: error.message });
    }
});

/**
 * Backfill Endpoint - Request historical data from Garmin
 * This makes actual API calls to Garmin to request historical data
 * NOTE: As of Dec 2024, backfill returns HTTP 412 if user hasn't enabled historical data toggle
 *
 * POST /api/garmin/backfill
 */
router.post('/backfill', async (req, res) => {
    console.log('⏪ Garmin backfill request');

    try {
        const { userId, daysBack: requestedDays, startDate, endDate } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: 'Missing userId',
                message: 'userId (internal Athlytx user ID) is required for backfill'
            });
        }

        console.log('Backfill requested:', { userId, requestedDays, startDate, endDate });

        // Find the user's Garmin token
        const garminToken = await OAuthToken.findOne({
            where: { userId, provider: 'garmin' },
            order: [['connectedAt', 'DESC']]
        });

        if (!garminToken) {
            return res.status(404).json({
                error: 'No Garmin connection',
                message: 'User does not have a connected Garmin account'
            });
        }

        // Get access token and token secret
        const accessToken = garminToken.accessTokenEncrypted
            ? decrypt(garminToken.accessTokenEncrypted)
            : null;
        const tokenSecret = garminToken.refreshTokenEncrypted
            ? decrypt(garminToken.refreshTokenEncrypted)
            : null;

        if (!accessToken) {
            return res.status(400).json({
                error: 'Invalid token',
                message: 'Garmin access token not found'
            });
        }

        // Calculate time range
        let daysBack = requestedDays || 90;

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

        // Calculate Unix timestamps for Garmin API
        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (daysBack * 24 * 60 * 60);

        console.log(`📅 Requesting backfill for ${daysBack} days`);
        console.log(`⏰ Time range: ${new Date(startTime * 1000).toISOString()} to ${new Date(endTime * 1000).toISOString()}`);

        // Make the actual Garmin API backfill requests
        const backfillResults = await requestGarminBackfill(
            garminToken.providerUserId,
            accessToken,
            tokenSecret,
            startTime,
            endTime
        );

        // Check results for permission issues
        const permissionDenied = backfillResults.some(r => r.status === 'permission_denied');
        const accepted = backfillResults.filter(r => r.status === 'accepted').length;
        const failed = backfillResults.filter(r => r.status === 'failed' || r.status === 'error').length;

        if (permissionDenied) {
            return res.status(200).json({
                status: 'partial',
                message: 'Some backfill requests were denied - user may need to enable historical data toggle in Garmin Connect',
                timestamp: new Date().toISOString(),
                daysRequested: daysBack,
                results: backfillResults,
                summary: { accepted, permissionDenied: backfillResults.filter(r => r.status === 'permission_denied').length, failed }
            });
        }

        res.status(200).json({
            status: 'accepted',
            message: 'Backfill requests sent to Garmin. Data will arrive via PUSH webhook.',
            timestamp: new Date().toISOString(),
            daysRequested: daysBack,
            results: backfillResults,
            summary: { accepted, failed }
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
        const { Activity, HeartRateZone, DailyMetric, OAuthToken } = require('../models');

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

        // Fallback if Garmin omitted userId: use the single Garmin token we have
        if (!garminUserId) {
            const garminTokens = await OAuthToken.findAll({ where: { provider: 'garmin' }, order: [['connectedAt', 'DESC']] });
            if (garminTokens.length === 1) {
                const token = garminTokens[0];
                const scopesObj = typeof token.scopes === 'string' ? (() => { try { return JSON.parse(token.scopes); } catch { return {}; } })() : (token.scopes || {});
                garminUserId = scopesObj.wellnessUserId || token.providerUserId;
                if (garminUserId) {
                    console.log(`🔗 Fallback Garmin userId resolved to ${garminUserId} via single token`);
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
            allDayRespiration, epochs, dailies, thirdPartyDailies, hrv
        } = data;

        // Find our internal userId from the Garmin GUID
        // Use the MOST RECENT token if there are duplicates
        let token = await OAuthToken.findOne({
            where: {
                provider: 'garmin',
                providerUserId: garminUserId
            },
            order: [['connectedAt', 'DESC']]  // Get most recent connection
        });

        if (!token) {
            // Try mapping by previously stored wellnessUserId in token.scopes
            try {
                const allTokens = await OAuthToken.findAll({
                    where: { provider: 'garmin' },
                    order: [['connectedAt', 'DESC']]
                });

                const mapped = allTokens.find(t => {
                    try {
                        if (!t.scopes) return false;
                        const s = typeof t.scopes === 'string' ? JSON.parse(t.scopes) : t.scopes;
                        return s && s.wellnessUserId === garminUserId;
                    } catch (_) { return false; }
                });

                if (mapped) {
                    token = mapped;
                }

                if (!token) {
                    // SECURITY FIX: Do NOT assume unknown Garmin userIds belong to existing users
                    // This was causing data to be assigned to wrong users (data breach)
                    console.error(`🚨 SECURITY: Unknown Garmin userId ${garminUserId} - cannot map to any user`);
                    console.error(`🚨 Known Garmin providerUserIds:`, allTokens.map(t => t.providerUserId));
                    console.warn('⚠️  Rejecting PUSH data - user must reconnect their Garmin account');
                    return;
                }
            } catch (mapError) {
                console.warn('⚠️  Fallback mapping error:', mapError.message);
                return;
            }
        }

        const ourUserId = token.userId;
        console.log(`Processing Health API data for user: ${ourUserId} (Garmin: ${garminUserId})`);

        let stored = 0;

        // Process dailies (Garmin's daily summary endpoint - same as summaries but different name)
        // Garmin can send either "summaries" or "dailies" - both contain daily health metrics
        const dailySummaries = summaries || dailies || [];

        console.log(`🔍 PUSH data check - summaries: ${summaries?.length || 0}, dailies: ${dailies?.length || 0}`);
        console.log(`🔍 Combined dailySummaries length: ${dailySummaries.length}`);

        if (dailySummaries.length > 0) {
            console.log(`📊 Processing ${dailySummaries.length} daily summaries from ${summaries ? 'summaries' : 'dailies'} array`);
            console.log(`📊 Sample daily summary keys:`, Object.keys(dailySummaries[0]));

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
            console.log(`📊 Sample epoch keys:`, Object.keys(epochs[0]));
            console.log(`📊 Sample epoch data:`, JSON.stringify(epochs[0], null, 2));
            // Epochs contain granular HRV data throughout the day
            // For now, we'll calculate daily average from epochs

            const epochsByDate = {};
            epochs.forEach(epoch => {
                console.log(`🔍 Epoch hrvValue: ${epoch.hrvValue}, heartRateVariability: ${epoch.heartRateVariability}`);
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

        // Process stress details
        if (stressDetails && stressDetails.length > 0) {
            console.log(`😰 Processing ${stressDetails.length} stress detail records`);
            stored = 0;

            const stressByDate = {};
            stressDetails.forEach(stress => {
                const date = stress.calendarDate;
                if (!date) return;

                if (!stressByDate[date]) {
                    stressByDate[date] = {
                        avgStress: stress.averageStressLevel,
                        maxStress: stress.maxStressLevel,
                        restDuration: stress.restStressDurationInSeconds,
                        activityDuration: stress.activityStressDurationInSeconds,
                        lowDuration: stress.lowStressDurationInSeconds,
                        mediumDuration: stress.mediumStressDurationInSeconds,
                        highDuration: stress.highStressDurationInSeconds
                    };
                }
            });

            for (const [date, stressData] of Object.entries(stressByDate)) {
                try {
                    await DailyMetric.upsert({
                        userId: ourUserId,
                        date: date,
                        averageStressLevel: stressData.avgStress,
                        maxStressLevel: stressData.maxStress,
                        restStressDuration: stressData.restDuration,
                        activityStressDuration: stressData.activityDuration,
                        lowStressDuration: stressData.lowDuration,
                        mediumStressDuration: stressData.mediumDuration,
                        highStressDuration: stressData.highDuration
                    });
                    stored++;
                } catch (err) {
                    console.error('Error storing stress data:', err.message);
                }
            }
            console.log(`✅ Stored stress data for ${stored} days`);
        }

        // Process all-day respiration
        if (allDayRespiration && allDayRespiration.length > 0) {
            console.log(`😮‍💨 Processing ${allDayRespiration.length} respiration records`);
            stored = 0;

            for (const resp of allDayRespiration) {
                try {
                    const date = resp.calendarDate || (resp.startTimeInSeconds
                        ? new Date(resp.startTimeInSeconds * 1000).toISOString().split('T')[0]
                        : null);
                    if (!date) continue;

                    await DailyMetric.upsert({
                        userId: ourUserId,
                        date: date,
                        avgWakingRespirationValue: resp.avgWakingRespirationValue,
                        highestRespirationValue: resp.highestRespirationValue,
                        lowestRespirationValue: resp.lowestRespirationValue,
                        avgSleepRespirationValue: resp.avgSleepRespirationValue
                    });
                    stored++;
                } catch (err) {
                    console.error('Error storing respiration data:', err.message);
                }
            }
            console.log(`✅ Stored respiration data for ${stored} days`);
        }

        // Process HRV payload (some pushes may come as { hrv: [...] } without userId)
        if (hrv && hrv.length > 0) {
            console.log(`💓 Processing ${hrv.length} HRV records`);
            console.log('💓 HRV sample keys:', Object.keys(hrv[0] || {}));
            stored = 0;
            for (const item of hrv) {
                try {
                    const date = item.calendarDate || item.summaryDate ||
                        (item.startTimeInSeconds ? new Date(item.startTimeInSeconds * 1000).toISOString().split('T')[0] : null);
                    const hrvValue = item.hrvValue || item.heartRateVariability || item.heartRateVariabilityAvg;
                    if (hrvValue === undefined || hrvValue === null) {
                        console.log('💓 HRV record missing value:', item);
                    }
                    if (!date || hrvValue === undefined || hrvValue === null) continue;
                    await DailyMetric.upsert({
                        userId: ourUserId,
                        date,
                        hrvAvg: hrvValue,
                        restingHr: item.restingHeartRate || item.restingHeartRateInBeatsPerMinute || null
                    });
                    stored++;
                } catch (err) {
                    console.error('Error storing HRV record:', err.message);
                }
            }
            console.log(`✅ Stored HRV data for ${stored} days`);
        }

        console.log('✅ Garmin Health API PUSH data processed successfully');

    } catch (error) {
        console.error('❌ Error in processGarminPushData:', error);
        throw error;
    }
}

module.exports = router;
