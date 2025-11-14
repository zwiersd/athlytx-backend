const { makeAuthenticatedCall } = require('./api-call-tools');
const { DailyMetric } = require('../../models');
const { Op } = require('sequelize');

/**
 * Natural Language Data Query Tools
 * Allow users to query their fitness data using natural language
 */

/**
 * Get activity data from provider with natural language parameters
 */
async function getActivities(userId, provider, params = {}) {
    const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
        endDate = new Date(),
        activityType = null,
        limit = 30
    } = params;

    // Provider-specific activity endpoints
    const endpoints = {
        strava: {
            url: `https://www.strava.com/api/v3/athlete/activities`,
            params: {
                after: Math.floor(new Date(startDate).getTime() / 1000),
                before: Math.floor(new Date(endDate).getTime() / 1000),
                per_page: limit
            }
        },
        garmin: {
            url: 'https://apis.garmin.com/wellness-api/rest/activities',
            // Garmin requires different handling with OAuth 1.0a
        }
    };

    const config = endpoints[provider.toLowerCase()];

    if (!config) {
        return {
            success: false,
            error: 'PROVIDER_NOT_SUPPORTED',
            message: `Activity queries not yet implemented for ${provider}`
        };
    }

    const url = config.url + (config.params ? '?' + new URLSearchParams(config.params) : '');

    const result = await makeAuthenticatedCall(userId, provider, url, {
        method: 'GET'
    });

    if (!result.success) {
        return result;
    }

    // Parse and format activities
    const activities = result.data;

    // Filter by activity type if specified
    let filtered = activities;
    if (activityType) {
        filtered = activities.filter(activity =>
            activity.type?.toLowerCase().includes(activityType.toLowerCase()) ||
            activity.sport_type?.toLowerCase().includes(activityType.toLowerCase())
        );
    }

    return {
        success: true,
        provider,
        count: filtered.length,
        dateRange: { startDate, endDate },
        activities: filtered.map(activity => ({
            id: activity.id,
            name: activity.name,
            type: activity.type || activity.sport_type,
            date: activity.start_date || activity.start_date_local,
            distance: activity.distance,
            duration: activity.moving_time || activity.elapsed_time,
            elevation: activity.total_elevation_gain,
            calories: activity.calories,
            averageHeartRate: activity.average_heartrate,
            maxHeartRate: activity.max_heartrate
        }))
    };
}

/**
 * Get sleep data with natural language parameters
 */
async function getSleepData(userId, provider, params = {}) {
    const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default: last 7 days
        endDate = new Date()
    } = params;

    const endpoints = {
        oura: {
            url: 'https://api.ouraring.com/v2/usercollection/sleep',
            params: {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            }
        },
        whoop: {
            url: 'https://api.prod.whoop.com/developer/v1/activity/sleep',
            params: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            }
        }
    };

    const config = endpoints[provider.toLowerCase()];

    if (!config) {
        return {
            success: false,
            error: 'PROVIDER_NOT_SUPPORTED',
            message: `Sleep data queries not yet implemented for ${provider}`
        };
    }

    const url = config.url + '?' + new URLSearchParams(config.params);

    const result = await makeAuthenticatedCall(userId, provider, url, {
        method: 'GET'
    });

    if (!result.success) {
        return result;
    }

    // Normalize sleep data across providers
    const sleepData = provider.toLowerCase() === 'oura' ? result.data.data : result.data.records;

    return {
        success: true,
        provider,
        count: sleepData.length,
        dateRange: { startDate, endDate },
        sleep: sleepData.map(sleep => ({
            id: sleep.id,
            date: sleep.day || sleep.created_at?.split('T')[0],
            totalSleep: sleep.total_sleep_duration || sleep.score?.sleep_duration_minutes,
            deepSleep: sleep.deep_sleep_duration,
            remSleep: sleep.rem_sleep_duration,
            lightSleep: sleep.light_sleep_duration,
            awakeTime: sleep.awake_time,
            efficiency: sleep.efficiency || sleep.score?.sleep_efficiency_percentage,
            score: sleep.score || sleep.score?.sleep_performance_percentage
        }))
    };
}

/**
 * Get recovery/readiness data
 */
async function getRecoveryData(userId, provider, params = {}) {
    const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate = new Date()
    } = params;

    const endpoints = {
        oura: {
            url: 'https://api.ouraring.com/v2/usercollection/daily_readiness',
            params: {
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            }
        },
        whoop: {
            url: 'https://api.prod.whoop.com/developer/v1/recovery',
            params: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            }
        }
    };

    const config = endpoints[provider.toLowerCase()];

    if (!config) {
        return {
            success: false,
            error: 'PROVIDER_NOT_SUPPORTED',
            message: `Recovery data queries not yet implemented for ${provider}`
        };
    }

    const url = config.url + '?' + new URLSearchParams(config.params);

    const result = await makeAuthenticatedCall(userId, provider, url, {
        method: 'GET'
    });

    if (!result.success) {
        return result;
    }

    return {
        success: true,
        provider,
        data: result.data,
        dateRange: { startDate, endDate }
    };
}

/**
 * Get aggregated metrics from database
 */
async function getStoredMetrics(userId, params = {}) {
    const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        metricTypes = null // e.g., ['steps', 'calories', 'sleep']
    } = params;

    const where = {
        userId,
        date: {
            [Op.between]: [startDate, endDate]
        }
    };

    const metrics = await DailyMetric.findAll({
        where,
        order: [['date', 'DESC']]
    });

    // Filter by metric types if specified
    let filtered = metrics;
    if (metricTypes && metricTypes.length > 0) {
        // This would need to be adapted based on your DailyMetric schema
        // Assuming metrics are stored as JSON or separate columns
    }

    // Calculate summaries
    const summary = {
        totalDays: metrics.length,
        averageSteps: 0,
        averageCalories: 0,
        totalDistance: 0,
        // Add more aggregations based on your data structure
    };

    return {
        success: true,
        count: filtered.length,
        dateRange: { startDate, endDate },
        metrics: filtered,
        summary
    };
}

/**
 * Parse natural language query and route to appropriate function
 */
async function queryFitnessData(userId, naturalQuery) {
    // Simple natural language parsing (could be enhanced with NLP library)
    const query = naturalQuery.toLowerCase();

    // Determine what type of data is being requested
    let dataType = 'activities';
    if (query.includes('sleep')) {
        dataType = 'sleep';
    } else if (query.includes('recovery') || query.includes('readiness')) {
        dataType = 'recovery';
    } else if (query.includes('heart') || query.includes('hrv')) {
        dataType = 'recovery';
    }

    // Determine date range
    let startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let endDate = new Date();

    if (query.includes('today')) {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
    } else if (query.includes('yesterday')) {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
    } else if (query.includes('week')) {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (query.includes('month')) {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Determine provider (default to first available)
    let provider = null;
    if (query.includes('strava')) provider = 'strava';
    else if (query.includes('oura')) provider = 'oura';
    else if (query.includes('garmin')) provider = 'garmin';
    else if (query.includes('whoop')) provider = 'whoop';

    if (!provider) {
        // Get first available provider for this user
        const { OAuthToken } = require('../../models');
        const token = await OAuthToken.findOne({
            where: { userId },
            attributes: ['provider']
        });
        provider = token?.provider || 'strava';
    }

    // Route to appropriate function
    const params = { startDate, endDate };

    switch (dataType) {
        case 'sleep':
            return getSleepData(userId, provider, params);
        case 'recovery':
            return getRecoveryData(userId, provider, params);
        case 'activities':
        default:
            return getActivities(userId, provider, params);
    }
}

module.exports = {
    getActivities,
    getSleepData,
    getRecoveryData,
    getStoredMetrics,
    queryFitnessData
};
