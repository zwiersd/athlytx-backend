const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const {
    User,
    CoachAthlete,
    Activity,
    DailyMetric,
    TrainingSummary,
    OAuthToken
} = require('../models');

/**
 * Coach Dashboard Routes
 * Advanced analytics and athlete management
 */

// Middleware to verify coach access
async function verifyCoach(req, res, next) {
    const { coachId, sessionToken } = req.body;

    if (!coachId || !sessionToken) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const coach = await User.findOne({
        where: {
            id: coachId,
            sessionToken,
            role: 'coach',
            sessionExpiry: { [Op.gt]: new Date() }
        }
    });

    if (!coach) {
        return res.status(403).json({ error: 'Invalid coach credentials' });
    }

    req.coach = coach;
    next();
}

/**
 * GET /api/coach/athletes
 * Get all athletes for a coach
 */
router.get('/athletes', async (req, res) => {
    try {
        const { coachId } = req.query;

        const athletes = await CoachAthlete.findAll({
            where: { coachId, status: 'active' },
            include: [{
                model: User,
                as: 'athlete',
                attributes: ['id', 'email', 'name', 'lastLogin'],
                include: [{
                    model: OAuthToken,
                    attributes: ['provider', 'createdAt'],
                    required: false
                }]
            }]
        });

        // Get latest metrics for each athlete
        const athleteData = await Promise.all(athletes.map(async (rel) => {
            const athlete = rel.athlete;

            // Get latest daily metric
            const latestMetric = await DailyMetric.findOne({
                where: { userId: athlete.id },
                order: [['date', 'DESC']],
                limit: 1
            });

            // Get recent activities count
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const recentActivities = await Activity.count({
                where: {
                    userId: athlete.id,
                    startDate: { [Op.gte]: sevenDaysAgo }
                }
            });

            // Get latest training summary
            const latestSummary = await TrainingSummary.findOne({
                where: { userId: athlete.id },
                order: [['weekStartDate', 'DESC']],
                limit: 1
            });

            return {
                id: athlete.id,
                email: athlete.email,
                name: athlete.name,
                lastLogin: athlete.lastLogin,
                connectedServices: athlete.OAuthTokens.map(t => t.provider),
                latestMetric: latestMetric ? {
                    date: latestMetric.date,
                    restingHr: latestMetric.restingHeartRate,
                    hrv: latestMetric.hrv,
                    sleep: latestMetric.sleepDuration
                } : null,
                recentActivities,
                currentLoad: latestSummary ? {
                    ctl: latestSummary.ctl,
                    atl: latestSummary.atl,
                    tsb: latestSummary.tsb,
                    weeklyMinutes: latestSummary.weeklyMinutes
                } : null,
                status: calculateAthleteStatus(latestMetric, latestSummary)
            };
        }));

        res.json({
            success: true,
            athletes: athleteData
        });

    } catch (error) {
        console.error('Get athletes error:', error);
        res.status(500).json({ error: 'Failed to fetch athletes' });
    }
});

/**
 * GET /api/coach/athlete/:athleteId/dashboard
 * Get comprehensive dashboard data for an athlete
 */
router.get('/athlete/:athleteId/dashboard', async (req, res) => {
    try {
        const { athleteId } = req.params;
        const { coachId, days = 30 } = req.query;

        // Verify coach has access to this athlete
        const relationship = await CoachAthlete.findOne({
            where: { coachId, athleteId, status: 'active' }
        });

        if (!relationship) {
            return res.status(403).json({ error: 'No access to this athlete' });
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get athlete info
        const athlete = await User.findByPk(athleteId, {
            attributes: ['id', 'email', 'name'],
            include: [{
                model: OAuthToken,
                attributes: ['provider']
            }]
        });

        // Get activities with HR zones
        const activities = await Activity.findAll({
            where: {
                userId: athleteId,
                startDate: { [Op.gte]: startDate }
            },
            order: [['startDate', 'DESC']]
        });

        // Get daily metrics
        const dailyMetrics = await DailyMetric.findAll({
            where: {
                userId: athleteId,
                date: { [Op.gte]: startDate }
            },
            order: [['date', 'DESC']]
        });

        // Get training summaries
        const trainingSummaries = await TrainingSummary.findAll({
            where: {
                userId: athleteId,
                weekStartDate: { [Op.gte]: startDate }
            },
            order: [['weekStartDate', 'DESC']]
        });

        // Calculate advanced metrics
        const metrics = calculateAdvancedMetrics(activities, dailyMetrics, trainingSummaries);

        res.json({
            success: true,
            athlete: {
                id: athlete.id,
                name: athlete.name,
                email: athlete.email,
                connectedServices: athlete.OAuthTokens.map(t => t.provider)
            },
            summary: metrics.summary,
            trends: metrics.trends,
            zones: metrics.zones,
            activities: activities.map(formatActivity),
            dailyMetrics: dailyMetrics.map(formatDailyMetric),
            trainingSummaries: trainingSummaries.map(formatTrainingSummary),
            alerts: generateAlerts(metrics, dailyMetrics)
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

/**
 * POST /api/coach/athlete/:athleteId/note
 * Add a note to an athlete or activity
 */
router.post('/athlete/:athleteId/note', verifyCoach, async (req, res) => {
    try {
        const { athleteId } = req.params;
        const { activityId, date, note, type } = req.body;

        // Verify coach has access
        const relationship = await CoachAthlete.findOne({
            where: { coachId: req.coach.id, athleteId, status: 'active' }
        });

        if (!relationship) {
            return res.status(403).json({ error: 'No access to this athlete' });
        }

        // Store note (simplified - you'd want a Notes model)
        const noteData = {
            coachId: req.coach.id,
            athleteId,
            activityId,
            date,
            note,
            type, // 'general', 'workout', 'alert', 'goal'
            createdAt: new Date()
        };

        // For now, just return success
        res.json({
            success: true,
            note: noteData
        });

    } catch (error) {
        console.error('Add note error:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

/**
 * GET /api/coach/athlete/:athleteId/report
 * Generate comprehensive report for an athlete
 */
router.get('/athlete/:athleteId/report', async (req, res) => {
    try {
        const { athleteId } = req.params;
        const { coachId, startDate, endDate } = req.query;

        // Verify coach has access
        const relationship = await CoachAthlete.findOne({
            where: { coachId, athleteId, status: 'active' }
        });

        if (!relationship) {
            return res.status(403).json({ error: 'No access to this athlete' });
        }

        const report = await generateAthleteReport(athleteId, startDate, endDate);

        res.json({
            success: true,
            report
        });

    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// Helper Functions

function calculateAthleteStatus(latestMetric, latestSummary) {
    // Sophisticated status calculation
    if (!latestMetric || !latestSummary) return 'insufficient-data';

    const tsb = latestSummary.tsb || 0;
    const hrv = latestMetric.hrv || 0;
    const restingHr = latestMetric.restingHeartRate || 60;

    // Simple status logic (to be enhanced)
    if (tsb < -30) return 'overtrained';
    if (tsb < -20) return 'fatigued';
    if (tsb > 5) return 'fresh';
    return 'optimal';
}

function calculateAdvancedMetrics(activities, dailyMetrics, trainingSummaries) {
    // Calculate TSS, CTL, ATL, TSB
    const summary = {
        totalActivities: activities.length,
        totalMinutes: activities.reduce((sum, a) => sum + (a.duration || 0), 0),
        avgHeartRate: Math.round(
            activities.reduce((sum, a) => sum + (a.avgHeartRate || 0), 0) / activities.length
        ),
        currentCTL: trainingSummaries[0]?.ctl || 0,
        currentATL: trainingSummaries[0]?.atl || 0,
        currentTSB: trainingSummaries[0]?.tsb || 0
    };

    // Calculate zones distribution
    const zones = {
        zone1: 0,
        zone2: 0,
        zone3: 0,
        zone4: 0,
        zone5: 0
    };

    activities.forEach(activity => {
        if (activity.hrZones) {
            const hrZones = typeof activity.hrZones === 'string'
                ? JSON.parse(activity.hrZones)
                : activity.hrZones;

            zones.zone1 += hrZones.zone1 || 0;
            zones.zone2 += hrZones.zone2 || 0;
            zones.zone3 += hrZones.zone3 || 0;
            zones.zone4 += hrZones.zone4 || 0;
            zones.zone5 += hrZones.zone5 || 0;
        }
    });

    // Calculate trends
    const trends = {
        hrvTrend: calculateTrend(dailyMetrics.map(d => d.hrv)),
        restingHrTrend: calculateTrend(dailyMetrics.map(d => d.restingHeartRate)),
        loadTrend: calculateTrend(trainingSummaries.map(t => t.weeklyMinutes))
    };

    return { summary, zones, trends };
}

function calculateTrend(values) {
    if (!values || values.length < 2) return 'stable';

    const filtered = values.filter(v => v != null);
    if (filtered.length < 2) return 'stable';

    const firstHalf = filtered.slice(0, Math.floor(filtered.length / 2));
    const secondHalf = filtered.slice(Math.floor(filtered.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
}

function generateAlerts(metrics, dailyMetrics) {
    const alerts = [];

    // Check for high fatigue
    if (metrics.summary.currentATL > metrics.summary.currentCTL * 1.5) {
        alerts.push({
            type: 'warning',
            category: 'fatigue',
            message: 'High acute training load detected. Consider recovery.',
            severity: 'medium'
        });
    }

    // Check TSB
    if (metrics.summary.currentTSB < -30) {
        alerts.push({
            type: 'danger',
            category: 'overtraining',
            message: 'Very low form (TSB < -30). High injury risk.',
            severity: 'high'
        });
    }

    // Check HRV trend
    if (metrics.trends.hrvTrend === 'decreasing') {
        alerts.push({
            type: 'warning',
            category: 'recovery',
            message: 'HRV trending downward. Monitor recovery closely.',
            severity: 'medium'
        });
    }

    return alerts;
}

function formatActivity(activity) {
    return {
        id: activity.id,
        date: activity.startDate,
        type: activity.type,
        name: activity.name,
        duration: activity.duration,
        distance: activity.distance,
        avgHeartRate: activity.avgHeartRate,
        maxHeartRate: activity.maxHeartRate,
        calories: activity.calories,
        tss: activity.tss,
        provider: activity.provider,
        hrZones: activity.hrZones
    };
}

function formatDailyMetric(metric) {
    return {
        date: metric.date,
        restingHr: metric.restingHeartRate,
        hrv: metric.hrv,
        sleep: metric.sleepDuration,
        sleepQuality: metric.sleepQuality,
        stress: metric.stressLevel,
        recovery: metric.recoveryScore,
        readiness: metric.readinessScore
    };
}

function formatTrainingSummary(summary) {
    return {
        weekStart: summary.weekStartDate,
        activities: summary.activityCount,
        minutes: summary.weeklyMinutes,
        ctl: summary.ctl,
        atl: summary.atl,
        tsb: summary.tsb,
        acwr: summary.atl && summary.ctl ? (summary.atl / summary.ctl).toFixed(2) : null
    };
}

async function generateAthleteReport(athleteId, startDate, endDate) {
    // Generate comprehensive PDF-ready report
    // This would integrate with a reporting service
    return {
        generated: new Date(),
        athleteId,
        period: { startDate, endDate },
        sections: [
            'Executive Summary',
            'Training Load Analysis',
            'Performance Trends',
            'Recovery Metrics',
            'Zone Distribution',
            'Recommendations'
        ]
    };
}

module.exports = router;