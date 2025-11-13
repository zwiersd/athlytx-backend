const express = require('express');
const router = express.Router();
const { Activity, HeartRateZone } = require('../models');

/**
 * Insert dummy Garmin data for production demo
 * POST /api/insert-dummy-garmin
 * Body: { userId: 'uuid' }
 */
router.post('/', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        console.log(`📊 Inserting dummy Garmin data for user ${userId}...`);

        // Realistic Garmin activity data - All from epix Pro (Gen 2) - 51mm
        const dummyGarminActivities = [
            {
                date: '2025-11-13',
                activityType: 'Running',
                activityName: 'Morning Run',
                durationMinutes: 45,
                distanceMeters: 7200,
                calories: 420,
                avgHr: 152,
                maxHr: 178,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 5, zone2: 15, zone3: 20, zone4: 5, zone5: 0 }
            },
            {
                date: '2025-11-13',
                activityType: 'Cycling',
                activityName: 'Afternoon Ride',
                durationMinutes: 60,
                distanceMeters: 18000,
                calories: 540,
                avgHr: 138,
                maxHr: 165,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 10, zone2: 40, zone3: 10, zone4: 0, zone5: 0 }
            },
            {
                date: '2025-11-12',
                activityType: 'Running',
                activityName: 'Interval Training',
                durationMinutes: 35,
                distanceMeters: 5500,
                calories: 380,
                avgHr: 165,
                maxHr: 186,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 3, zone2: 8, zone3: 12, zone4: 10, zone5: 2 }
            },
            {
                date: '2025-11-12',
                activityType: 'Swimming',
                activityName: 'Pool Swim',
                durationMinutes: 30,
                distanceMeters: 1500,
                calories: 280,
                avgHr: 135,
                maxHr: 155,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 5, zone2: 20, zone3: 5, zone4: 0, zone5: 0 }
            },
            {
                date: '2025-11-11',
                activityType: 'Running',
                activityName: 'Easy Recovery Run',
                durationMinutes: 30,
                distanceMeters: 4200,
                calories: 240,
                avgHr: 128,
                maxHr: 142,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 10, zone2: 20, zone3: 0, zone4: 0, zone5: 0 }
            },
            {
                date: '2025-11-10',
                activityType: 'Strength Training',
                activityName: 'Upper Body Workout',
                durationMinutes: 50,
                distanceMeters: 0,
                calories: 320,
                avgHr: 115,
                maxHr: 145,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 35, zone2: 15, zone3: 0, zone4: 0, zone5: 0 }
            },
            {
                date: '2025-11-10',
                activityType: 'Cycling',
                activityName: 'Hill Repeats',
                durationMinutes: 75,
                distanceMeters: 25000,
                calories: 680,
                avgHr: 148,
                maxHr: 172,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 10, zone2: 35, zone3: 25, zone4: 5, zone5: 0 }
            },
            {
                date: '2025-11-09',
                activityType: 'Running',
                activityName: 'Long Run',
                durationMinutes: 90,
                distanceMeters: 15000,
                calories: 820,
                avgHr: 142,
                maxHr: 168,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 15, zone2: 55, zone3: 20, zone4: 0, zone5: 0 }
            },
            {
                date: '2025-11-08',
                activityType: 'Yoga',
                activityName: 'Yoga Flow',
                durationMinutes: 45,
                distanceMeters: 0,
                calories: 150,
                avgHr: 95,
                maxHr: 118,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 45, zone2: 0, zone3: 0, zone4: 0, zone5: 0 }
            },
            {
                date: '2025-11-08',
                activityType: 'Running',
                activityName: 'Tempo Run',
                durationMinutes: 40,
                distanceMeters: 6800,
                calories: 420,
                avgHr: 158,
                maxHr: 175,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 5, zone2: 10, zone3: 22, zone4: 3, zone5: 0 }
            },
            {
                date: '2025-11-07',
                activityType: 'Cycling',
                activityName: 'Recovery Ride',
                durationMinutes: 45,
                distanceMeters: 12000,
                calories: 320,
                avgHr: 125,
                maxHr: 142,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 15, zone2: 30, zone3: 0, zone4: 0, zone5: 0 }
            },
            {
                date: '2025-11-07',
                activityType: 'Hiking',
                activityName: 'Mountain Hike',
                durationMinutes: 120,
                distanceMeters: 8500,
                calories: 580,
                avgHr: 118,
                maxHr: 155,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 80, zone2: 35, zone3: 5, zone4: 0, zone5: 0 }
            },
            {
                date: '2025-11-06',
                activityType: 'Running',
                activityName: 'Track Workout',
                durationMinutes: 50,
                distanceMeters: 8000,
                calories: 485,
                avgHr: 162,
                maxHr: 182,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 5, zone2: 12, zone3: 18, zone4: 12, zone5: 3 }
            },
            {
                date: '2025-11-05',
                activityType: 'Trail Running',
                activityName: 'Trail Run',
                durationMinutes: 65,
                distanceMeters: 9200,
                calories: 595,
                avgHr: 145,
                maxHr: 172,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 12, zone2: 35, zone3: 15, zone4: 3, zone5: 0 }
            },
            {
                date: '2025-11-04',
                activityType: 'Cycling',
                activityName: 'Endurance Ride',
                durationMinutes: 90,
                distanceMeters: 32000,
                calories: 780,
                avgHr: 135,
                maxHr: 158,
                deviceModel: 'Garmin epix Pro (Gen 2) 51mm',
                zones: { zone1: 20, zone2: 60, zone3: 10, zone4: 0, zone5: 0 }
            }
        ];

        let inserted = 0;
        let zonesInserted = 0;

        for (const activity of dummyGarminActivities) {
            const externalId = `demo-garmin-${Date.now()}-${Math.random()}`;

            // Insert activity
            const [activityRecord, created] = await Activity.findOrCreate({
                where: {
                    userId,
                    provider: 'garmin',
                    externalId
                },
                defaults: {
                    userId,
                    provider: 'garmin',
                    externalId,
                    activityType: activity.activityType,
                    activityName: activity.activityName,
                    startTime: new Date(`${activity.date}T10:00:00Z`),
                    durationSeconds: activity.durationMinutes * 60,
                    distanceMeters: activity.distanceMeters,
                    calories: activity.calories,
                    avgHr: activity.avgHr,
                    maxHr: activity.maxHr,
                    deviceModel: activity.deviceModel,
                    rawData: { demo: true }
                }
            });

            if (created) {
                inserted++;
                console.log(`  ✅ Inserted: ${activity.activityName}`);

                // Insert heart rate zones
                await HeartRateZone.create({
                    userId,
                    activityId: activityRecord.id,
                    date: activity.date,
                    activityType: activity.activityType,
                    durationSeconds: activity.durationMinutes * 60,
                    provider: 'garmin',
                    zone1Seconds: activity.zones.zone1 * 60,
                    zone2Seconds: activity.zones.zone2 * 60,
                    zone3Seconds: activity.zones.zone3 * 60,
                    zone4Seconds: activity.zones.zone4 * 60,
                    zone5Seconds: activity.zones.zone5 * 60,
                    avgHr: activity.avgHr,
                    maxHr: activity.maxHr
                });

                zonesInserted++;
            }
        }

        console.log(`\n✅ Inserted ${inserted} dummy Garmin activities`);
        console.log(`✅ Inserted ${zonesInserted} heart rate zone records`);

        res.json({
            success: true,
            message: `Inserted ${inserted} dummy Garmin activities for demo`,
            activitiesInserted: inserted,
            zonesInserted
        });

    } catch (error) {
        console.error('❌ Error inserting dummy data:', error);
        res.status(500).json({
            error: 'Failed to insert dummy data',
            message: error.message
        });
    }
});

module.exports = router;
