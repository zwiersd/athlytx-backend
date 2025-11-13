/**
 * Script to add dummy Garmin data to production database
 * This is for demo purposes to show Garmin how the dashboard will look
 */

const fetch = require('node-fetch');

const API_BASE = 'https://athlytx-backend-production.up.railway.app';
const USER_ID = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';

// Realistic Garmin activity data - All from Garmin Epix Pro (Gen 2)
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
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
        deviceModel: 'epix Pro (Gen 2) - 51mm',
        zones: { zone1: 20, zone2: 60, zone3: 10, zone4: 0, zone5: 0 }
    }
];

async function insertDummyData() {
    console.log('🔄 Inserting dummy Garmin data for demo purposes...');
    console.log(`User ID: ${USER_ID}\n`);

    for (let i = 0; i < dummyGarminActivities.length; i++) {
        const activity = dummyGarminActivities[i];

        try {
            // Insert activity
            const activityData = {
                userId: USER_ID,
                provider: 'garmin',
                externalId: `demo-garmin-${Date.now()}-${i}`,
                activityType: activity.activityType,
                activityName: activity.activityName,
                startTime: new Date(`${activity.date}T10:00:00Z`).toISOString(),
                durationSeconds: activity.durationMinutes * 60,
                distanceMeters: activity.distanceMeters,
                calories: activity.calories,
                avgHr: activity.avgHr,
                maxHr: activity.maxHr,
                deviceModel: activity.deviceModel
            };

            console.log(`📊 Inserting: ${activity.activityName} (${activity.date})`);

            // We'll need to use a backend endpoint to insert this data
            // Since we don't have direct database access from this script
            // Let's create the SQL insert statements instead

            console.log(`   - Duration: ${activity.durationMinutes} min`);
            console.log(`   - Avg HR: ${activity.avgHr} bpm`);
            console.log(`   - Device: ${activity.deviceModel}`);
            console.log(`   - Zones: Z1=${activity.zones.zone1}m Z2=${activity.zones.zone2}m Z3=${activity.zones.zone3}m Z4=${activity.zones.zone4}m Z5=${activity.zones.zone5}m\n`);

        } catch (error) {
            console.error(`❌ Failed to insert ${activity.activityName}:`, error.message);
        }
    }

    console.log('\n✅ Dummy data insertion complete!');
    console.log('\nNOTE: This script generates the data structure.');
    console.log('To actually insert into production database, we need to use SQL commands or create an API endpoint.');
}

// Generate SQL insert statements instead
function generateSQLInserts() {
    console.log('-- SQL INSERT statements for dummy Garmin data\n');
    console.log('-- Activities table inserts:');

    dummyGarminActivities.forEach((activity, i) => {
        const activityId = `demo-garmin-${Date.now()}-${i}`;
        const startTime = new Date(`${activity.date}T10:00:00Z`).toISOString();
        const durationSeconds = activity.durationMinutes * 60;

        console.log(`INSERT INTO activities (id, "userId", provider, "externalId", "activityType", "activityName", "startTime", "durationSeconds", "distanceMeters", calories, "avgHr", "maxHr", "deviceModel", "createdAt", "updatedAt") VALUES (`);
        console.log(`  gen_random_uuid(),`);
        console.log(`  '${USER_ID}',`);
        console.log(`  'garmin',`);
        console.log(`  '${activityId}',`);
        console.log(`  '${activity.activityType}',`);
        console.log(`  '${activity.activityName}',`);
        console.log(`  '${startTime}',`);
        console.log(`  ${durationSeconds},`);
        console.log(`  ${activity.distanceMeters},`);
        console.log(`  ${activity.calories},`);
        console.log(`  ${activity.avgHr},`);
        console.log(`  ${activity.maxHr},`);
        console.log(`  '${activity.deviceModel}',`);
        console.log(`  NOW(),`);
        console.log(`  NOW()`);
        console.log(`);\n`);
    });
}

// Run the function
generateSQLInserts();

console.log('\n\n-- Heart Rate Zones table inserts:');
dummyGarminActivities.forEach((activity, i) => {
    const activityId = `demo-garmin-${Date.now()}-${i}`;
    const durationSeconds = activity.durationMinutes * 60;

    console.log(`-- For activity: ${activity.activityName}`);
    console.log(`-- Note: You'll need to get the actual activity ID from the database after inserting activities`);
    console.log(`INSERT INTO heart_rate_zones ("userId", "activityId", date, "activityType", "durationSeconds", provider, "zone1Seconds", "zone2Seconds", "zone3Seconds", "zone4Seconds", "zone5Seconds", "avgHr", "maxHr", "createdAt", "updatedAt") VALUES (`);
    console.log(`  '${USER_ID}',`);
    console.log(`  (SELECT id FROM activities WHERE "externalId" = '${activityId}' LIMIT 1),`);
    console.log(`  '${activity.date}',`);
    console.log(`  '${activity.activityType}',`);
    console.log(`  ${durationSeconds},`);
    console.log(`  'garmin',`);
    console.log(`  ${activity.zones.zone1 * 60},`);
    console.log(`  ${activity.zones.zone2 * 60},`);
    console.log(`  ${activity.zones.zone3 * 60},`);
    console.log(`  ${activity.zones.zone4 * 60},`);
    console.log(`  ${activity.zones.zone5 * 60},`);
    console.log(`  ${activity.avgHr},`);
    console.log(`  ${activity.maxHr},`);
    console.log(`  NOW(),`);
    console.log(`  NOW()`);
    console.log(`);\n`);
});
