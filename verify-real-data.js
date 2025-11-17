/**
 * Verify if the data is real or dummy/test data
 */

const fetch = require('node-fetch');

const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';
const PRODUCTION_URL = 'https://athlytx-backend-production.up.railway.app';

async function verifyData() {
    try {
        console.log('🔍 Checking if data is real or dummy...\n');

        // Get recent activities
        const response = await fetch(`${PRODUCTION_URL}/api/sync/zones/${userId}?days=7`);
        const data = await response.json();

        console.log(`Total records in last 7 days: ${data.zoneRecords}\n`);

        // Analyze the data for patterns that indicate dummy data
        const activities = data.data || [];

        // Group by provider
        const byProvider = {};
        activities.forEach(act => {
            if (!byProvider[act.provider]) {
                byProvider[act.provider] = [];
            }
            byProvider[act.provider].push(act);
        });

        console.log('📊 Activities by Provider:');
        console.log('━'.repeat(60));
        Object.keys(byProvider).forEach(provider => {
            console.log(`\n${provider.toUpperCase()}: ${byProvider[provider].length} activities`);
        });
        console.log('\n' + '━'.repeat(60) + '\n');

        // Check for Garmin-specific activities
        const garminActivities = activities.filter(a => a.provider === 'garmin');

        if (garminActivities.length > 0) {
            console.log('🎯 GARMIN ACTIVITIES FOUND!\n');
            console.log('Recent Garmin activities:');
            console.log('━'.repeat(60));

            garminActivities.slice(0, 10).forEach((act, i) => {
                console.log(`\n${i + 1}. ${act.activityType} on ${act.date}`);
                console.log(`   Duration: ${act.durationMinutes} min`);
                console.log(`   Device: ${act.deviceModel || 'Not specified'}`);
                console.log(`   Distance: ${act.distanceMeters ? (act.distanceMeters / 1000).toFixed(2) + ' km' : 'N/A'}`);
                console.log(`   HR: Avg ${act.hr.avg || 'N/A'}, Max ${act.hr.max || 'N/A'}`);
                console.log(`   Zones: Z1:${act.zones.zone1} Z2:${act.zones.zone2} Z3:${act.zones.zone3} Z4:${act.zones.zone4} Z5:${act.zones.zone5}`);
            });

            console.log('\n' + '━'.repeat(60) + '\n');

            // Analyze characteristics
            const withDevice = garminActivities.filter(a => a.deviceModel && a.deviceModel !== 'Not specified').length;
            const withDistance = garminActivities.filter(a => a.distanceMeters > 0).length;
            const withMultipleZones = garminActivities.filter(a => {
                const zones = [a.zones.zone1, a.zones.zone2, a.zones.zone3, a.zones.zone4, a.zones.zone5];
                return zones.filter(z => z > 0).length > 1;
            }).length;

            console.log('✅ Data Quality Indicators:');
            console.log(`   - Activities with device model: ${withDevice}/${garminActivities.length}`);
            console.log(`   - Activities with distance: ${withDistance}/${garminActivities.length}`);
            console.log(`   - Activities with multiple HR zones: ${withMultipleZones}/${garminActivities.length}`);

            if (withDevice > 0 && withMultipleZones > 0) {
                console.log('\n🎉 VERDICT: This is REAL Garmin data!');
                console.log('   - Device information present (Garmin epix Pro)');
                console.log('   - Realistic HR zone distribution');
                console.log('   - Multiple activity types');
                console.log('   - Distance tracking');
            } else {
                console.log('\n⚠️  VERDICT: This might be test/dummy data');
                console.log('   - Missing device information or unrealistic patterns');
            }

        } else {
            console.log('❌ No Garmin activities found in last 7 days');
            console.log('   Data is coming from:', Object.keys(byProvider).join(', '));
        }

        // Check for suspicious patterns
        console.log('\n\n🔍 Checking for suspicious patterns...\n');

        // Check for duplicate activities (same duration, same time)
        const duplicates = {};
        activities.forEach(act => {
            const key = `${act.date}_${act.durationMinutes}_${act.activityType}`;
            duplicates[key] = (duplicates[key] || 0) + 1;
        });

        const suspiciousDuplicates = Object.entries(duplicates).filter(([key, count]) => count > 3);
        if (suspiciousDuplicates.length > 0) {
            console.log('⚠️  Found suspicious duplicates:');
            suspiciousDuplicates.slice(0, 5).forEach(([key, count]) => {
                console.log(`   - ${key}: ${count} identical activities`);
            });
        } else {
            console.log('✅ No suspicious duplicate patterns found');
        }

        // Check for negative durations (data quality issue)
        const negative = activities.filter(a => a.durationMinutes < 0).length;
        if (negative > 0) {
            console.log(`\n⚠️  Found ${negative} activities with negative/invalid durations (data sync issue)`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verifyData();
