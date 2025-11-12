const fetch = require('node-fetch');
const { User, OAuthToken, Activity, HeartRateZone, TrainingSummary } = require('../models');
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

        // Sync Garmin
        const garminToken = tokens.find(t => t.provider === 'garmin');
        if (garminToken) {
            try {
                results.garmin = await syncGarminActivities(userId, garminToken, daysBack);
            } catch (error) {
                results.errors.push(`Garmin: ${error.message}`);
            }
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

            if (created) stored++;
        } catch (error) {
            console.error(`  ❌ Failed to store Strava activity:`, error.message);
        }
    }

    console.log(`  ✅ Stored ${stored} new Strava activities`);
    return { activitiesFetched: activities.length, activitiesStored: stored };
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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Fetch activities from Garmin
    const response = await fetch(
        `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startTimestamp}&uploadEndTimeInSeconds=${endTimestamp}`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Garmin API error: ${response.status}`);
    }

    const activities = await response.json();
    console.log(`  Found ${activities.length} Garmin activities`);

    let stored = 0;
    for (const garminActivity of activities) {
        try {
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
            for (const w of (workoutsData.data || [])) {
                activityTypes[w.activity] = (activityTypes[w.activity] || 0) + 1;
            }
            console.log(`  Activity types:`, activityTypes);

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

                    // Store HR zone data if available
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
    console.log(`  ✅ Stored ${stored} new Oura workouts`);

    return {
        daysFetched: dailyData.data?.length || 0,
        workoutsStored: stored
    };
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
