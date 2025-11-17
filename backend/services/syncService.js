const fetch = require('node-fetch');
const { User, OAuthToken, Activity, HeartRateZone, PowerZone, TrainingSummary } = require('../models');
const { decrypt } = require('../utils/encryption');

// HR Zone configuration (based on your zones)
const HR_ZONES = {
    zone1: { min: 0,   max: 121, name: 'Recovery' },
    zone2: { min: 122, max: 151, name: 'Endurance' },
    zone3: { min: 152, max: 166, name: 'Tempo' },
    zone4: { min: 167, max: 180, name: 'Threshold' },
    zone5: { min: 181, max: 220, name: 'Anaerobic' }
};

/**
 * Main sync function - fetches data for a specific user
 */
async function syncUserData(userId, daysBack = 1) {
    console.log(`🔄 Starting sync for user ${userId}`);

    try {
        // Get user's OAuth tokens
        const tokens = await OAuthToken.findAll({
            where: { userId }
        });

        const results = {
            strava: null,
            garmin: null,
            oura: null,
            whoop: null,
            errors: []
        };

        // Sync Strava
        const stravaToken = tokens.find(t => t.provider === 'strava');
        if (stravaToken) {
            try {
                results.strava = await syncStravaActivities(userId, stravaToken, daysBack);
            } catch (error) {
                results.errors.push(`Strava: ${error.message}`);
            }
        }

        // Sync Garmin - DISABLED: Garmin uses PUSH notifications only, PULL requests not allowed
        const garminToken = tokens.find(t => t.provider === 'garmin');
        if (garminToken) {
            console.log('⚠️  Garmin sync skipped - using PUSH notifications only (PULL requests forbidden for production apps)');
            results.garmin = {
                message: 'Garmin uses PUSH notifications - sync not needed',
                pushOnly: true
            };
            // PULL requests cause InvalidPullTokenException errors
            // All Garmin data comes via /api/garmin/push webhook
        }

        // Sync Oura
        const ouraToken = tokens.find(t => t.provider === 'oura');
        if (ouraToken) {
            try {
                results.oura = await syncOuraData(userId, ouraToken, daysBack);
            } catch (error) {
                results.errors.push(`Oura: ${error.message}`);
            }
        }

        // Sync Whoop
        const whoopToken = tokens.find(t => t.provider === 'whoop');
        if (whoopToken) {
            try {
                results.whoop = await syncWhoopData(userId, whoopToken, daysBack);
            } catch (error) {
                results.errors.push(`Whoop: ${error.message}`);
            }
        }

        // Calculate training summaries
        await calculateTrainingSummaries(userId);

        console.log(`✅ Sync complete for user ${userId}`);
        return results;
    } catch (error) {
        console.error(`❌ Sync failed for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Fetch and store Strava activities with HR zone data
 */
async function syncStravaActivities(userId, tokenRecord, daysBack) {
    console.log(`  🏃 Syncing Strava activities...`);

    const accessToken = decrypt(tokenRecord.accessTokenEncrypted);

    // Calculate timestamp for daysBack
    const after = Math.floor((Date.now() - (daysBack * 24 * 60 * 60 * 1000)) / 1000);

    // Fetch activities from Strava
    const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`);
    }

    const activities = await response.json();
    console.log(`  Found ${activities.length} Strava activities`);

    let stored = 0;
    for (const stravaActivity of activities) {
        try {
            // Only process activities with HR data
            if (!stravaActivity.has_heartrate) {
                continue;
            }

            // Store activity
            const [activity, created] = await Activity.findOrCreate({
                where: {
                    userId,
                    provider: 'strava',
                    externalId: String(stravaActivity.id)
                },
                defaults: {
                    userId,
                    provider: 'strava',
                    externalId: String(stravaActivity.id),
                    activityType: stravaActivity.type,
                    activityName: stravaActivity.name,
                    startTime: new Date(stravaActivity.start_date),
                    durationSeconds: stravaActivity.moving_time,
                    distanceMeters: stravaActivity.distance,
                    calories: stravaActivity.calories,
                    avgHr: stravaActivity.average_heartrate,
                    maxHr: stravaActivity.max_heartrate,
                    rawData: stravaActivity
                }
            });

            // Calculate HR zones from Strava data
            if (stravaActivity.average_heartrate) {
                await storeStravaHeartRateZones(
                    userId,
                    activity.id,
                    stravaActivity
                );
            }

            // Fetch and store power zones if activity has power data
            if (stravaActivity.device_watts || stravaActivity.average_watts) {
                await fetchStravaActivityZones(
                    userId,
                    activity.id,
                    stravaActivity.id,
                    accessToken
                );
            }

            if (created) stored++;
        } catch (error) {
            console.error(`  ❌ Failed to store Strava activity:`, error.message);
        }
    }

    console.log(`  ✅ Stored ${stored} new Strava activities`);
    return { activitiesFetched: activities.length, activitiesStored: stored };
}

/**
 * Fetch detailed power zones from Strava activity zones endpoint
 */
async function fetchStravaActivityZones(userId, activityId, stravaActivityId, accessToken) {
    try {
        const response = await fetch(
            `https://www.strava.com/api/v3/activities/${stravaActivityId}/zones`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            console.log(`  ⚠️  Could not fetch zones for activity ${stravaActivityId}: ${response.status}`);
            return;
        }

        const zonesData = await response.json();

        // Look for power zones in the response
        const powerZones = zonesData.find(z => z.type === 'power');

        if (powerZones && powerZones.distribution_buckets) {
            await storeStravaPowerZones(userId, activityId, powerZones, stravaActivityId);
        }
    } catch (error) {
        console.error(`  ❌ Failed to fetch zones for activity ${stravaActivityId}:`, error.message);
    }
}

/**
 * Store power zones data from Strava
 */
async function storeStravaPowerZones(userId, activityId, powerZones, stravaActivityId) {
    const activity = await Activity.findByPk(activityId);
    if (!activity) return;

    // Parse distribution buckets into 7 zones based on FTP
    // Strava provides buckets, we need to map them to zones
    const buckets = powerZones.distribution_buckets;

    // Initialize zone data
    const zoneData = {
        zone1Seconds: 0, // <55% FTP
        zone2Seconds: 0, // 56-75% FTP
        zone3Seconds: 0, // 76-90% FTP
        zone4Seconds: 0, // 91-105% FTP
        zone5Seconds: 0, // 106-120% FTP
        zone6Seconds: 0, // 121-150% FTP
        zone7Seconds: 0  // >150% FTP
    };

    // Map Strava buckets to zones
    // Strava typically provides buckets like: {min: 0, max: 50, time: 120}
    for (const bucket of buckets) {
        const time = bucket.time || 0;

        // Strava zones are typically indexed 1-7
        if (bucket.zone !== undefined) {
            const zone = bucket.zone;
            if (zone >= 1 && zone <= 7) {
                zoneData[`zone${zone}Seconds`] = time;
            }
        }
    }

    // Extract FTP if available
    const ftpWatts = powerZones.sensor_based ? null : (powerZones.custom_zones ? null : null);

    // Calculate energy system contributions based on Matt Roberts' notes
    const totalTime = Object.values(zoneData).reduce((sum, val) => sum + val, 0);
    let atpPcSystem = 0;
    let glycolyticSystem = 0;
    let aerobicSystem = 0;

    if (totalTime > 0) {
        // ATP-PC system: zones 6-7 (anaerobic/neuromuscular)
        atpPcSystem = ((zoneData.zone6Seconds + zoneData.zone7Seconds) / totalTime) * 100;

        // Glycolytic system: zones 4-5 (lactate threshold, VO2 max)
        glycolyticSystem = ((zoneData.zone4Seconds + zoneData.zone5Seconds) / totalTime) * 100;

        // Aerobic system: zones 1-3 (recovery, endurance, tempo)
        aerobicSystem = ((zoneData.zone1Seconds + zoneData.zone2Seconds + zoneData.zone3Seconds) / totalTime) * 100;
    }

    await PowerZone.upsert({
        userId,
        activityId,
        date: activity.startTime.toISOString().split('T')[0],
        activityType: activity.activityType,
        durationSeconds: activity.durationSeconds,
        distanceMeters: activity.distanceMeters,
        ...zoneData,
        avgPower: activity.rawData?.average_watts || null,
        maxPower: activity.rawData?.max_watts || null,
        normalizedPower: activity.rawData?.weighted_average_watts || null,
        ftpWatts: ftpWatts,
        atpPcSystem: atpPcSystem.toFixed(2),
        glycolyticSystem: glycolyticSystem.toFixed(2),
        aerobicSystem: aerobicSystem.toFixed(2),
        provider: 'strava'
    });

    console.log(`  ✅ Stored power zones for activity ${stravaActivityId}`);
}

/**
 * Store HR zones for Strava activities
 * Strava doesn't provide time-in-zones, so we estimate based on avg HR
 */
async function storeStravaHeartRateZones(userId, activityId, stravaActivity) {
    const activity = await Activity.findByPk(activityId);
    if (!activity) return;

    // Estimate which zone the activity was mostly in based on average HR
    const avgHr = stravaActivity.average_heartrate;
    const duration = stravaActivity.moving_time;

    let zoneData = {
        zone1Seconds: 0,
        zone2Seconds: 0,
        zone3Seconds: 0,
        zone4Seconds: 0,
        zone5Seconds: 0
    };

    // Assign to primary zone based on average HR
    if (avgHr <= HR_ZONES.zone1.max) {
        zoneData.zone1Seconds = duration;
    } else if (avgHr <= HR_ZONES.zone2.max) {
        zoneData.zone2Seconds = duration;
    } else if (avgHr <= HR_ZONES.zone3.max) {
        zoneData.zone3Seconds = duration;
    } else if (avgHr <= HR_ZONES.zone4.max) {
        zoneData.zone4Seconds = duration;
    } else {
        zoneData.zone5Seconds = duration;
    }

    await HeartRateZone.upsert({
        userId,
        activityId,
        date: activity.startTime.toISOString().split('T')[0],
        activityType: stravaActivity.type,
        durationSeconds: duration,
        ...zoneData,
        avgHr: Math.round(avgHr),
        maxHr: stravaActivity.max_heartrate,
        provider: 'strava'
    });
}

/**
 * Fetch and store Garmin activities with HR zone data
 */
async function syncGarminActivities(userId, tokenRecord, daysBack) {
    console.log(`  📊 Syncing Garmin activities...`);

    const accessToken = decrypt(tokenRecord.accessTokenEncrypted);
    const tokenSecret = tokenRecord.refreshTokenEncrypted ? decrypt(tokenRecord.refreshTokenEncrypted) : '';

    // Garmin uses OAuth 1.0a, so we need to sign requests
    const GarminOAuth1Hybrid = require('../utils/garmin-oauth1-hybrid');
    const signer = new GarminOAuth1Hybrid(
        process.env.GARMIN_CONSUMER_KEY,
        process.env.GARMIN_CONSUMER_SECRET
    );

    // Garmin API only allows 24-hour windows (86400 seconds max)
    // So we need to make multiple requests, one for each day
    const MAX_SECONDS = 86400; // 24 hours
    const allActivities = [];

    const now = Math.floor(Date.now() / 1000);

    // Fetch data day by day, going backwards from now
    for (let day = 0; day < daysBack; day++) {
        const endTimestamp = now - (day * MAX_SECONDS);
        const startTimestamp = now - ((day + 1) * MAX_SECONDS);

        console.log(`  Fetching day ${day + 1}/${daysBack}...`);

        try {
            const url = `https://apis.garmin.com/wellness-api/rest/activities?summaryStartTimeInSeconds=${startTimestamp}&summaryEndTimeInSeconds=${endTimestamp}`;

            // Generate OAuth 1.0a signature
            const authHeader = signer.generateAuthHeader('GET', url, {}, accessToken, tokenSecret);

            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`  ❌ Day ${day + 1} failed: ${response.status} - ${errorText}`);
                continue; // Skip this day but continue with others
            }

            const activities = await response.json();
            allActivities.push(...activities);
            console.log(`  Found ${activities.length} activities on day ${day + 1}`);

        } catch (error) {
            console.error(`  ❌ Error fetching day ${day + 1}:`, error.message);
            // Continue with other days
        }
    }

    console.log(`  Found ${allActivities.length} total Garmin activities`);
    const activities = allActivities;

    let stored = 0;
    for (const garminActivity of activities) {
        try {
            // Extract device model from various possible fields
            let deviceModel = null;
            if (garminActivity.deviceModel) {
                deviceModel = garminActivity.deviceModel;
            } else if (garminActivity.metadataDTO && garminActivity.metadataDTO.deviceModel) {
                deviceModel = garminActivity.metadataDTO.deviceModel;
            } else if (garminActivity.deviceName) {
                deviceModel = garminActivity.deviceName;
            } else if (garminActivity.metadataDTO && garminActivity.metadataDTO.deviceName) {
                deviceModel = garminActivity.metadataDTO.deviceName;
            } else if (garminActivity.deviceId && garminActivity.manufacturerName) {
                // Fallback: use manufacturer + deviceId
                deviceModel = `${garminActivity.manufacturerName} ${garminActivity.deviceId}`;
            }

            // Store activity
            const [activity, created] = await Activity.findOrCreate({
                where: {
                    userId,
                    provider: 'garmin',
                    externalId: garminActivity.activityId || garminActivity.summaryId
                },
                defaults: {
                    userId,
                    provider: 'garmin',
                    externalId: garminActivity.activityId || garminActivity.summaryId,
                    activityType: garminActivity.activityType,
                    activityName: garminActivity.activityName,
                    startTime: new Date(garminActivity.startTimeInSeconds * 1000),
                    durationSeconds: garminActivity.durationInSeconds,
                    distanceMeters: garminActivity.distanceInMeters,
                    calories: garminActivity.activeKilocalories,
                    avgHr: garminActivity.averageHeartRateInBeatsPerMinute,
                    maxHr: garminActivity.maxHeartRateInBeatsPerMinute,
                    deviceModel: deviceModel,
                    rawData: garminActivity
                }
            });

            // Parse and store HR zone data
            if (garminActivity.timeInHeartRateZonesInSeconds) {
                await storeHeartRateZones(
                    userId,
                    activity.id,
                    garminActivity,
                    'garmin'
                );
            }

            // Parse and store power zone data
            if (garminActivity.averagePowerInWatts || garminActivity.timeInPowerZonesInSeconds) {
                await storeGarminPowerZones(
                    userId,
                    activity.id,
                    garminActivity
                );
            }

            if (created) stored++;
        } catch (error) {
            console.error(`  ❌ Failed to store activity:`, error.message);
        }
    }

    console.log(`  ✅ Stored ${stored} new activities`);
    return { activitiesFetched: activities.length, activitiesStored: stored };
}

/**
 * Parse Garmin HR zone data and map to our zones
 */
function parseGarminZones(garminActivity) {
    const zones = {
        zone1: 0,
        zone2: 0,
        zone3: 0,
        zone4: 0,
        zone5: 0
    };

    // Garmin provides: timeInHeartRateZonesInSeconds
    // This is an array of time spent in different zones
    // We need to map Garmin's zones to our custom zones based on BPM ranges

    if (garminActivity.timeInHeartRateZonesInSeconds && Array.isArray(garminActivity.timeInHeartRateZonesInSeconds)) {
        // Garmin typically provides 5 zones, but we need to verify the BPM ranges match ours
        // For now, we'll do a direct mapping (this might need adjustment based on actual Garmin data)
        const garminZones = garminActivity.timeInHeartRateZonesInSeconds;

        zones.zone1 = garminZones[0] || 0;
        zones.zone2 = garminZones[1] || 0;
        zones.zone3 = garminZones[2] || 0;
        zones.zone4 = garminZones[3] || 0;
        zones.zone5 = garminZones[4] || 0;
    }

    return zones;
}

/**
 * Store power zones data from Garmin
 */
async function storeGarminPowerZones(userId, activityId, garminActivity) {
    const activity = await Activity.findByPk(activityId);
    if (!activity) return;

    // Initialize zone data
    const zoneData = {
        zone1Seconds: 0,
        zone2Seconds: 0,
        zone3Seconds: 0,
        zone4Seconds: 0,
        zone5Seconds: 0,
        zone6Seconds: 0,
        zone7Seconds: 0
    };

    // Garmin provides power zones similar to HR zones
    if (garminActivity.timeInPowerZonesInSeconds && Array.isArray(garminActivity.timeInPowerZonesInSeconds)) {
        const zones = garminActivity.timeInPowerZonesInSeconds;

        // Garmin typically provides 7 power zones
        zoneData.zone1Seconds = zones[0] || 0;
        zoneData.zone2Seconds = zones[1] || 0;
        zoneData.zone3Seconds = zones[2] || 0;
        zoneData.zone4Seconds = zones[3] || 0;
        zoneData.zone5Seconds = zones[4] || 0;
        zoneData.zone6Seconds = zones[5] || 0;
        zoneData.zone7Seconds = zones[6] || 0;
    }

    // Calculate energy system contributions
    const totalTime = Object.values(zoneData).reduce((sum, val) => sum + val, 0);
    let atpPcSystem = 0;
    let glycolyticSystem = 0;
    let aerobicSystem = 0;

    if (totalTime > 0) {
        // ATP-PC system: zones 6-7 (anaerobic/neuromuscular)
        atpPcSystem = ((zoneData.zone6Seconds + zoneData.zone7Seconds) / totalTime) * 100;

        // Glycolytic system: zones 4-5 (lactate threshold, VO2 max)
        glycolyticSystem = ((zoneData.zone4Seconds + zoneData.zone5Seconds) / totalTime) * 100;

        // Aerobic system: zones 1-3 (recovery, endurance, tempo)
        aerobicSystem = ((zoneData.zone1Seconds + zoneData.zone2Seconds + zoneData.zone3Seconds) / totalTime) * 100;
    }

    const activityDate = new Date(garminActivity.startTimeInSeconds * 1000);

    await PowerZone.upsert({
        userId,
        activityId,
        date: activityDate.toISOString().split('T')[0],
        activityType: garminActivity.activityType,
        durationSeconds: garminActivity.durationInSeconds,
        distanceMeters: garminActivity.distanceInMeters,
        elevationGainMeters: garminActivity.elevationGainInMeters,
        ...zoneData,
        avgPower: garminActivity.averagePowerInWatts || null,
        maxPower: garminActivity.maxPowerInWatts || null,
        normalizedPower: garminActivity.normalizedPowerInWatts || null,
        ftpWatts: garminActivity.functionalThresholdPower || null,
        intensityFactor: garminActivity.intensityFactor || null,
        tss: garminActivity.trainingStressScore || null,
        variabilityIndex: garminActivity.variabilityIndex || null,
        atpPcSystem: atpPcSystem.toFixed(2),
        glycolyticSystem: glycolyticSystem.toFixed(2),
        aerobicSystem: aerobicSystem.toFixed(2),
        provider: 'garmin'
    });

    console.log(`  ✅ Stored power zones for Garmin activity`);
}

/**
 * Store heart rate zone data
 */
async function storeHeartRateZones(userId, activityId, garminActivity, provider) {
    const zones = parseGarminZones(garminActivity);

    const activityDate = new Date(garminActivity.startTimeInSeconds * 1000);

    await HeartRateZone.findOrCreate({
        where: {
            userId,
            activityId
        },
        defaults: {
            userId,
            activityId,
            date: activityDate,
            zone1Seconds: zones.zone1,
            zone2Seconds: zones.zone2,
            zone3Seconds: zones.zone3,
            zone4Seconds: zones.zone4,
            zone5Seconds: zones.zone5,
            avgHr: garminActivity.averageHeartRateInBeatsPerMinute,
            maxHr: garminActivity.maxHeartRateInBeatsPerMinute,
            activityType: garminActivity.activityType,
            durationSeconds: garminActivity.durationInSeconds,
            provider
        }
    });
}

/**
 * Store HR zones for Oura workouts
 * Oura provides heart rate data but not detailed time-in-zones
 * We'll estimate based on average HR similar to Strava
 */
async function storeOuraHeartRateZones(userId, activityId, workout) {
    const activity = await Activity.findByPk(activityId);
    if (!activity) return;

    const avgHr = workout.average_heart_rate;
    const duration = workout.duration;

    let zoneData = {
        zone1Seconds: 0,
        zone2Seconds: 0,
        zone3Seconds: 0,
        zone4Seconds: 0,
        zone5Seconds: 0
    };

    // Assign to primary zone based on average HR
    if (avgHr <= HR_ZONES.zone1.max) {
        zoneData.zone1Seconds = duration;
    } else if (avgHr <= HR_ZONES.zone2.max) {
        zoneData.zone2Seconds = duration;
    } else if (avgHr <= HR_ZONES.zone3.max) {
        zoneData.zone3Seconds = duration;
    } else if (avgHr <= HR_ZONES.zone4.max) {
        zoneData.zone4Seconds = duration;
    } else {
        zoneData.zone5Seconds = duration;
    }

    await HeartRateZone.upsert({
        userId,
        activityId,
        date: activity.startTime.toISOString().split('T')[0],
        activityType: workout.activity,
        durationSeconds: duration,
        ...zoneData,
        avgHr: Math.round(avgHr),
        maxHr: workout.max_heart_rate,
        provider: 'oura'
    });
}

/**
 * Sync Oura data (workouts and daily activity with HR data)
 */
async function syncOuraData(userId, tokenRecord, daysBack) {
    console.log(`  💍 Syncing Oura data...`);

    const accessToken = decrypt(tokenRecord.accessTokenEncrypted);

    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    let stored = 0;

    // Fetch workouts (Oura v2 API)
    try {
        const workoutsResponse = await fetch(
            `https://api.ouraring.com/v2/usercollection/workout?start_date=${startDateStr}&end_date=${endDate}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (workoutsResponse.ok) {
            const workoutsData = await workoutsResponse.json();
            console.log(`  Found ${workoutsData.data?.length || 0} Oura workouts`);

            // Log activity types for debugging
            const activityTypes = {};
            let withHR = 0;
            let withoutHR = 0;
            for (const w of (workoutsData.data || [])) {
                activityTypes[w.activity] = (activityTypes[w.activity] || 0) + 1;
                if (w.average_heart_rate) withHR++;
                else withoutHR++;
            }
            console.log(`  Activity types:`, activityTypes);
            console.log(`  With HR data: ${withHR}, Without HR data: ${withoutHR}`);

            for (const workout of (workoutsData.data || [])) {
                try {
                    // Store workout activity
                    const [activity, created] = await Activity.findOrCreate({
                        where: {
                            userId,
                            provider: 'oura',
                            externalId: workout.id
                        },
                        defaults: {
                            userId,
                            provider: 'oura',
                            externalId: workout.id,
                            activityType: workout.activity,
                            activityName: workout.activity,
                            startTime: new Date(workout.start_datetime),
                            durationSeconds: workout.duration || 0,
                            distanceMeters: workout.distance || null,
                            calories: workout.calories || null,
                            avgHr: workout.average_heart_rate || null,
                            maxHr: workout.max_heart_rate || null,
                            intensityScore: workout.intensity,
                            rawData: workout
                        }
                    });

                    // Store HR zone data if available (always, even for existing activities)
                    if (workout.average_heart_rate) {
                        await storeOuraHeartRateZones(
                            userId,
                            activity.id,
                            workout
                        );
                    }

                    if (created) stored++;
                } catch (error) {
                    console.error(`  ❌ Failed to store Oura workout:`, error.message);
                }
            }
        }
    } catch (error) {
        console.error(`  ❌ Failed to fetch Oura workouts:`, error.message);
    }

    // Fetch daily activity for overall metrics
    const dailyResponse = await fetch(
        `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDateStr}&end_date=${endDate}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    if (!dailyResponse.ok) {
        throw new Error(`Oura API error: ${dailyResponse.status}`);
    }

    const dailyData = await dailyResponse.json();
    console.log(`  ✅ Fetched Oura data for ${dailyData.data?.length || 0} days`);

    // Log what HR fields are available
    if (dailyData.data && dailyData.data.length > 0) {
        const sample = dailyData.data[0];
        console.log(`  📊 Oura daily activity sample fields:`, Object.keys(sample));
        console.log(`  ❤️  HR fields:`, {
            average_heart_rate: sample.average_heart_rate,
            high_heart_rate: sample.high_heart_rate,
            low_heart_rate: sample.low_heart_rate,
            resting_heart_rate: sample.resting_heart_rate
        });
    }

    // Process daily activity data for HR information
    let dailyActivitiesStored = 0;
    if (dailyData.data && Array.isArray(dailyData.data)) {
        for (const day of dailyData.data) {
            try {
                // Check if this day has heart rate data
                if (day.average_heart_rate && day.average_heart_rate > 0) {
                    // Create an activity record for this day's overall activity
                    const dayDate = new Date(day.day);

                    const [activity, created] = await Activity.findOrCreate({
                        where: {
                            userId,
                            provider: 'oura',
                            externalId: `oura_daily_${day.day}`
                        },
                        defaults: {
                            userId,
                            provider: 'oura',
                            externalId: `oura_daily_${day.day}`,
                            activityType: 'Daily Activity',
                            activityName: 'Daily Activity',
                            startTime: dayDate,
                            durationSeconds: day.active_seconds || 0,
                            calories: day.active_calories || day.total_calories || null,
                            avgHr: Math.round(day.average_heart_rate),
                            maxHr: day.high_heart_rate || null,
                            rawData: day
                        }
                    });

                    // Store HR zone data for daily activity
                    if (day.average_heart_rate) {
                        await storeOuraHeartRateZones(
                            userId,
                            activity.id,
                            {
                                activity: 'Daily Activity',
                                average_heart_rate: day.average_heart_rate,
                                max_heart_rate: day.high_heart_rate,
                                duration: day.active_seconds || 0,
                                start_datetime: day.day
                            }
                        );
                    }

                    if (created) dailyActivitiesStored++;
                }
            } catch (error) {
                console.error(`  ❌ Failed to store Oura daily activity:`, error.message);
            }
        }
    }

    console.log(`  ✅ Stored ${stored} new Oura workouts`);
    console.log(`  ✅ Stored ${dailyActivitiesStored} new Oura daily activities with HR data`);

    return {
        daysFetched: dailyData.data?.length || 0,
        workoutsStored: stored,
        dailyActivitiesStored
    };
}

/**
 * Sync Whoop data (workouts with HR zones from cycles)
 */
async function syncWhoopData(userId, tokenRecord, daysBack) {
    console.log(`  💪 Syncing Whoop data from cycles...`);

    const accessToken = decrypt(tokenRecord.accessTokenEncrypted);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Whoop API requires ISO 8601 format with time
    const endDateStr = endDate.toISOString();
    const startDateStr = startDate.toISOString();

    // Fetch cycles from Whoop (which contain workout/activity data)
    const url = `https://api.prod.whoop.com/developer/v1/cycle?start=${startDateStr}&end=${endDateStr}`;
    console.log(`  📡 Fetching cycles from: ${url}`);

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    console.log(`  📊 Whoop response status: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.log(`  ❌ Whoop error response: ${errorText.substring(0, 200)}`);
        throw new Error(`Whoop API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    const cycles = data.records || [];
    console.log(`  Found ${cycles.length} Whoop cycles`);

    let stored = 0;
    for (const cycle of cycles) {
        try {
            // Skip full-day cycles - we only want actual workout sessions
            // Cycles over 4 hours are likely full day tracking, not individual workouts
            const durationSeconds = Math.round((new Date(cycle.end) - new Date(cycle.start)) / 1000);
            const durationHours = durationSeconds / 3600;

            if (durationHours > 4) {
                console.log(`  ⏭️  Skipping long cycle: ${durationHours.toFixed(1)} hours`);
                continue;
            }

            // Only process cycles with strain data (indicating activity)
            if (cycle.score && cycle.score.strain > 5) { // Higher threshold for actual workouts
                const [activity, created] = await Activity.findOrCreate({
                    where: {
                        userId,
                        provider: 'whoop',
                        externalId: `whoop_cycle_${cycle.id}`
                    },
                    defaults: {
                        userId,
                        provider: 'whoop',
                        externalId: `whoop_cycle_${cycle.id}`,
                        activityType: 'Workout',
                        activityName: `Strain ${cycle.score.strain.toFixed(1)}`,
                        startTime: new Date(cycle.start),
                        durationSeconds: durationSeconds,
                        calories: cycle.score.kilojoule ? Math.round(cycle.score.kilojoule * 0.239) : null,
                        avgHr: cycle.score.average_heart_rate ? Math.round(cycle.score.average_heart_rate) : null,
                        maxHr: null,
                        intensityScore: cycle.score.strain,
                        rawData: cycle
                    }
                });

                // Store basic HR zone record (cycles don't have detailed zone breakdown)
                if (cycle.score.average_heart_rate) {
                    await HeartRateZone.upsert({
                        userId,
                        activityId: activity.id,
                        date: activity.startTime.toISOString().split('T')[0],
                        activityType: 'Workout',
                        durationSeconds: durationSeconds,
                        zone1Seconds: 0,
                        zone2Seconds: 0,
                        zone3Seconds: 0,
                        zone4Seconds: 0,
                        zone5Seconds: 0,
                        avgHr: Math.round(cycle.score.average_heart_rate),
                        maxHr: null,
                        provider: 'whoop'
                    });
                }

                if (created) stored++;
            }
        } catch (error) {
            console.error(`  ❌ Failed to store Whoop cycle:`, error.message);
        }
    }

    console.log(`  ✅ Stored ${stored} new Whoop cycles`);
    return { cyclesFetched: cycles.length, cyclesStored: stored };
}

/**
 * Store HR zones for Whoop workouts
 * Whoop provides detailed time in each zone (milliseconds)
 */
async function storeWhoopHeartRateZones(userId, activityId, workout) {
    const activity = await Activity.findByPk(activityId);
    if (!activity) return;

    // Whoop provides zone_duration as an object with zone_zero through zone_five
    // Convert milliseconds to seconds
    const zoneDuration = workout.score.zone_duration;

    await HeartRateZone.upsert({
        userId,
        activityId,
        date: activity.startTime.toISOString().split('T')[0],
        activityType: workout.sport_name || 'Workout',
        durationSeconds: Math.round((new Date(workout.end) - new Date(workout.start)) / 1000),
        zone1Seconds: Math.round((zoneDuration.zone_one || 0) / 1000),
        zone2Seconds: Math.round((zoneDuration.zone_two || 0) / 1000),
        zone3Seconds: Math.round((zoneDuration.zone_three || 0) / 1000),
        zone4Seconds: Math.round((zoneDuration.zone_four || 0) / 1000),
        zone5Seconds: Math.round((zoneDuration.zone_five || 0) / 1000),
        avgHr: Math.round(workout.score.average_heart_rate),
        maxHr: Math.round(workout.score.max_heart_rate),
        provider: 'whoop'
    });
}

/**
 * Calculate weekly and monthly training summaries
 */
async function calculateTrainingSummaries(userId) {
    console.log(`  📈 Calculating training summaries...`);

    // Calculate weekly summary (last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const weeklyZones = await HeartRateZone.findAll({
        where: {
            userId,
            date: {
                [require('sequelize').Op.gte]: weekStart
            }
        }
    });

    if (weeklyZones.length > 0) {
        const summary = calculateZoneSummary(weeklyZones);

        await TrainingSummary.upsert({
            userId,
            periodType: 'weekly',
            periodStart: weekStart,
            periodEnd: new Date(),
            ...summary
        });
    }

    console.log(`  ✅ Training summaries updated`);
}

/**
 * Calculate zone totals and percentages
 */
function calculateZoneSummary(zoneRecords) {
    const totals = {
        totalZone1Minutes: 0,
        totalZone2Minutes: 0,
        totalZone3Minutes: 0,
        totalZone4Minutes: 0,
        totalZone5Minutes: 0,
        totalTrainingMinutes: 0,
        totalActivities: zoneRecords.length
    };

    for (const record of zoneRecords) {
        totals.totalZone1Minutes += Math.round((record.zone1Seconds || 0) / 60);
        totals.totalZone2Minutes += Math.round((record.zone2Seconds || 0) / 60);
        totals.totalZone3Minutes += Math.round((record.zone3Seconds || 0) / 60);
        totals.totalZone4Minutes += Math.round((record.zone4Seconds || 0) / 60);
        totals.totalZone5Minutes += Math.round((record.zone5Seconds || 0) / 60);
    }

    totals.totalTrainingMinutes =
        totals.totalZone1Minutes +
        totals.totalZone2Minutes +
        totals.totalZone3Minutes +
        totals.totalZone4Minutes +
        totals.totalZone5Minutes;

    // Calculate percentages
    if (totals.totalTrainingMinutes > 0) {
        totals.zone1Percent = (totals.totalZone1Minutes / totals.totalTrainingMinutes * 100).toFixed(1);
        totals.zone2Percent = (totals.totalZone2Minutes / totals.totalTrainingMinutes * 100).toFixed(1);
        totals.zone3Percent = (totals.totalZone3Minutes / totals.totalTrainingMinutes * 100).toFixed(1);
        totals.zone4Percent = (totals.totalZone4Minutes / totals.totalTrainingMinutes * 100).toFixed(1);
        totals.zone5Percent = (totals.totalZone5Minutes / totals.totalTrainingMinutes * 100).toFixed(1);
    }

    return totals;
}

/**
 * Sync all users (for daily cron job)
 */
async function syncAllUsers() {
    console.log('🔄 Starting daily sync for all users...');

    const users = await User.findAll({
        include: [{
            model: OAuthToken,
            as: 'tokens',
            where: {
                provider: ['garmin', 'oura']
            },
            required: true
        }]
    });

    console.log(`Found ${users.length} users with connected devices`);

    for (const user of users) {
        try {
            await syncUserData(user.id, 1); // Sync last 1 day
        } catch (error) {
            console.error(`Failed to sync user ${user.id}:`, error.message);
        }
    }

    console.log('✅ Daily sync complete');
}

module.exports = {
    syncUserData,
    syncAllUsers,
    syncGarminActivities,
    calculateTrainingSummaries
};
