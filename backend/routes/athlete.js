const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
    User,
    CoachAthlete,
    Activity,
    DailyMetric,
    HeartRateZone,
    TrainingSummary
} = require('../models');

/**
 * Athlete Dashboard Routes
 * Self-service athlete features and coach management
 */

/**
 * GET /api/athlete/dashboard
 * Get comprehensive dashboard data for an athlete
 * Query params: athleteId, sessionToken, days (default 30)
 */
router.get('/dashboard', async (req, res) => {
    try {
        const { athleteId, sessionToken, days = 30 } = req.query;
        console.log('[ATHLETE-DASHBOARD] Request for athlete:', athleteId);

        if (!athleteId || !sessionToken) {
            return res.status(400).json({ error: 'Athlete ID and session token required' });
        }

        // Verify athlete session
        const athlete = await User.findOne({
            where: {
                id: athleteId,
                sessionToken,
                sessionExpiry: { [Op.gt]: new Date() }
            }
        });

        if (!athlete) {
            console.log('[ATHLETE-DASHBOARD] Invalid session');
            return res.status(401).json({ error: 'Invalid session' });
        }

        // Calculate date range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Fetch activities with HR data
        const activities = await Activity.findAll({
            where: {
                userId: athleteId,
                startTime: { [Op.gte]: startDate }
            },
            order: [['startTime', 'DESC']],
            limit: 100
        });

        console.log('[ATHLETE-DASHBOARD] Found', activities.length, 'activities');

        // Fetch daily metrics
        const dailyMetrics = await DailyMetric.findAll({
            where: {
                userId: athleteId,
                date: { [Op.gte]: startDate }
            },
            order: [['date', 'DESC']]
        });

        console.log('[ATHLETE-DASHBOARD] Found', dailyMetrics.length, 'daily metrics');

        // Fetch training summaries
        const trainingSummaries = await TrainingSummary.findAll({
            where: {
                userId: athleteId,
                weekStartDate: { [Op.gte]: startDate }
            },
            order: [['weekStartDate', 'DESC']]
        });

        console.log('[ATHLETE-DASHBOARD] Found', trainingSummaries.length, 'training summaries');

        // Calculate HR zone distribution
        const hrZones = calculateHRZoneDistribution(activities);

        // Calculate aggregate stats
        const summaries = calculateDashboardSummaries(activities, dailyMetrics, trainingSummaries);

        res.json({
            success: true,
            activities: activities.map(formatActivity),
            metrics: dailyMetrics.map(formatDailyMetric),
            hrZones,
            summaries,
            trainingSummaries: trainingSummaries.map(formatTrainingSummary)
        });

    } catch (error) {
        console.error('[ATHLETE-DASHBOARD] Error:', error);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

/**
 * GET /api/athlete/coaches
 * Get all coaches connected to an athlete
 * Query params: athleteId, sessionToken
 */
router.get('/coaches', async (req, res) => {
    try {
        const { athleteId, sessionToken } = req.query;
        console.log('[ATHLETE-COACHES] Request for athlete:', athleteId);

        if (!athleteId || !sessionToken) {
            return res.status(400).json({ error: 'Athlete ID and session token required' });
        }

        // Verify athlete session
        const athlete = await User.findOne({
            where: {
                id: athleteId,
                sessionToken,
                sessionExpiry: { [Op.gt]: new Date() }
            }
        });

        if (!athlete) {
            console.log('[ATHLETE-COACHES] Invalid session');
            return res.status(401).json({ error: 'Invalid session' });
        }

        // Get all CoachAthlete relationships for athleteId
        const coachRelationships = await CoachAthlete.findAll({
            where: { athleteId },
            include: [{
                model: User,
                as: 'Coach',
                attributes: ['id', 'name', 'email']
            }],
            order: [['createdAt', 'DESC']]
        });

        console.log('[ATHLETE-COACHES] Found', coachRelationships.length, 'coach relationships');

        // Format response with coach details
        const coaches = coachRelationships.map(rel => ({
            id: rel.Coach.id,
            name: rel.Coach.name,
            email: rel.Coach.email,
            status: rel.status,
            connectedSince: rel.acceptedAt || rel.createdAt,
            invitedAt: rel.invitedAt,
            inviteMessage: rel.inviteMessage,
            revokedAt: rel.revokedAt,
            revokedBy: rel.revokedBy
        }));

        res.json({
            success: true,
            coaches
        });

    } catch (error) {
        console.error('[ATHLETE-COACHES] Error:', error);
        res.status(500).json({ error: 'Failed to fetch coaches' });
    }
});

/**
 * POST /api/athlete/revoke-coach
 * Revoke a coach's access to athlete data
 * Body: { athleteId, coachId, sessionToken }
 */
router.post('/revoke-coach', async (req, res) => {
    try {
        const { athleteId, coachId, sessionToken } = req.body;
        console.log('[ATHLETE-REVOKE] Athlete', athleteId, 'revoking coach', coachId);

        if (!athleteId || !coachId || !sessionToken) {
            return res.status(400).json({ error: 'Athlete ID, coach ID, and session token required' });
        }

        // Verify athlete session
        const athlete = await User.findOne({
            where: {
                id: athleteId,
                sessionToken,
                sessionExpiry: { [Op.gt]: new Date() }
            }
        });

        if (!athlete) {
            console.log('[ATHLETE-REVOKE] Invalid session');
            return res.status(401).json({ error: 'Invalid session' });
        }

        // Find CoachAthlete relationship
        const relationship = await CoachAthlete.findOne({
            where: {
                athleteId,
                coachId,
                status: { [Op.in]: ['pending', 'active'] }
            },
            include: [{
                model: User,
                as: 'Coach',
                attributes: ['id', 'name', 'email']
            }]
        });

        if (!relationship) {
            console.log('[ATHLETE-REVOKE] Relationship not found');
            return res.status(404).json({ error: 'Coach relationship not found' });
        }

        // Update status to 'revoked'
        relationship.status = 'revoked';
        relationship.revokedAt = new Date();
        relationship.revokedBy = 'athlete';
        await relationship.save();

        console.log('[ATHLETE-REVOKE] Successfully revoked access for coach:', relationship.Coach.email);

        // Optional: Send notification email to coach
        // This could be implemented later
        // await sendCoachRevocationEmail(relationship.Coach.email, athlete.name);

        res.json({
            success: true,
            message: `Access revoked for coach ${relationship.Coach.name}`,
            coach: {
                id: relationship.Coach.id,
                name: relationship.Coach.name,
                email: relationship.Coach.email
            }
        });

    } catch (error) {
        console.error('[ATHLETE-REVOKE] Error:', error);
        res.status(500).json({ error: 'Failed to revoke coach access' });
    }
});

// Helper Functions

/**
 * Calculate HR zone distribution from activities
 */
function calculateHRZoneDistribution(activities) {
    const zones = {
        zone1: 0,
        zone2: 0,
        zone3: 0,
        zone4: 0,
        zone5: 0
    };

    let totalTime = 0;

    activities.forEach(activity => {
        if (activity.rawData && activity.rawData.hrZones) {
            const hrZones = activity.rawData.hrZones;

            zones.zone1 += hrZones.zone1 || 0;
            zones.zone2 += hrZones.zone2 || 0;
            zones.zone3 += hrZones.zone3 || 0;
            zones.zone4 += hrZones.zone4 || 0;
            zones.zone5 += hrZones.zone5 || 0;

            totalTime += (hrZones.zone1 || 0) + (hrZones.zone2 || 0) +
                        (hrZones.zone3 || 0) + (hrZones.zone4 || 0) + (hrZones.zone5 || 0);
        }
    });

    // Calculate percentages
    if (totalTime > 0) {
        return {
            zone1: Math.round((zones.zone1 / totalTime) * 100),
            zone2: Math.round((zones.zone2 / totalTime) * 100),
            zone3: Math.round((zones.zone3 / totalTime) * 100),
            zone4: Math.round((zones.zone4 / totalTime) * 100),
            zone5: Math.round((zones.zone5 / totalTime) * 100),
            totalMinutes: Math.round(totalTime / 60)
        };
    }

    return {
        zone1: 0,
        zone2: 0,
        zone3: 0,
        zone4: 0,
        zone5: 0,
        totalMinutes: 0
    };
}

/**
 * Calculate dashboard summaries
 */
function calculateDashboardSummaries(activities, dailyMetrics, trainingSummaries) {
    // Weekly summary (last 7 days)
    const weeklyActivities = activities.filter(a => {
        const activityDate = new Date(a.startTime);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return activityDate >= weekAgo;
    });

    const weeklyMinutes = weeklyActivities.reduce((sum, a) => sum + (a.durationSeconds || 0), 0) / 60;
    const weeklyDistance = weeklyActivities.reduce((sum, a) => sum + (a.distanceMeters || 0), 0) / 1000; // km
    const weeklyCalories = weeklyActivities.reduce((sum, a) => sum + (a.calories || 0), 0);

    // Monthly summary (last 30 days)
    const monthlyActivities = activities;
    const monthlyMinutes = monthlyActivities.reduce((sum, a) => sum + (a.durationSeconds || 0), 0) / 60;
    const monthlyDistance = monthlyActivities.reduce((sum, a) => sum + (a.distanceMeters || 0), 0) / 1000; // km
    const monthlyCalories = monthlyActivities.reduce((sum, a) => sum + (a.calories || 0), 0);

    // Average heart rate
    const activitiesWithHR = activities.filter(a => a.avgHr > 0);
    const avgHeartRate = activitiesWithHR.length > 0
        ? Math.round(activitiesWithHR.reduce((sum, a) => sum + a.avgHr, 0) / activitiesWithHR.length)
        : null;

    // Latest training load metrics
    const latestSummary = trainingSummaries.length > 0 ? trainingSummaries[0] : null;

    // Latest daily metrics
    const latestMetric = dailyMetrics.length > 0 ? dailyMetrics[0] : null;

    return {
        weekly: {
            activities: weeklyActivities.length,
            minutes: Math.round(weeklyMinutes),
            distance: Math.round(weeklyDistance * 10) / 10,
            calories: Math.round(weeklyCalories)
        },
        monthly: {
            activities: monthlyActivities.length,
            minutes: Math.round(monthlyMinutes),
            distance: Math.round(monthlyDistance * 10) / 10,
            calories: Math.round(monthlyCalories)
        },
        averages: {
            heartRate: avgHeartRate
        },
        trainingLoad: latestSummary ? {
            ctl: latestSummary.ctl,
            atl: latestSummary.atl,
            tsb: latestSummary.tsb,
            weekStart: latestSummary.weekStartDate
        } : null,
        recovery: latestMetric ? {
            restingHr: latestMetric.restingHeartRate,
            hrv: latestMetric.hrv,
            sleep: latestMetric.sleepDuration,
            date: latestMetric.date
        } : null
    };
}

/**
 * Format activity for response
 */
function formatActivity(activity) {
    return {
        id: activity.id,
        externalId: activity.externalId,
        provider: activity.provider,
        type: activity.activityType,
        name: activity.activityName,
        startTime: activity.startTime,
        duration: activity.durationSeconds,
        distance: activity.distanceMeters,
        avgHr: activity.avgHr,
        maxHr: activity.maxHr,
        calories: activity.calories,
        trainingLoad: activity.trainingLoad,
        intensityScore: activity.intensityScore
    };
}

/**
 * Format daily metric for response
 */
function formatDailyMetric(metric) {
    return {
        date: metric.date,
        restingHr: metric.restingHeartRate,
        hrv: metric.hrv,
        sleep: metric.sleepDuration,
        sleepQuality: metric.sleepQuality,
        stress: metric.stressLevel,
        recovery: metric.recoveryScore,
        readiness: metric.readinessScore,
        steps: metric.steps,
        calories: metric.caloriesBurned
    };
}

/**
 * Format training summary for response
 */
function formatTrainingSummary(summary) {
    return {
        weekStart: summary.weekStartDate,
        activities: summary.activityCount,
        minutes: summary.weeklyMinutes,
        distance: summary.weeklyDistance,
        ctl: summary.ctl,
        atl: summary.atl,
        tsb: summary.tsb,
        rampRate: summary.rampRate
    };
}

module.exports = router;
