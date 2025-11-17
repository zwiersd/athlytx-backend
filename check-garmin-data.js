/**
 * Check if Garmin data (activities, zones, daily metrics) has been received
 */

const fetch = require('node-fetch');

const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';
const PRODUCTION_URL = 'https://athlytx-backend-production.up.railway.app';

async function checkData() {
    try {
        console.log('🔍 Checking for Garmin data in production database...\n');

        // Check sync status
        console.log('1️⃣  Checking sync status...');
        const statusResponse = await fetch(`${PRODUCTION_URL}/api/sync/status/${userId}`);
        const status = await statusResponse.json();

        console.log('📊 Sync Status:');
        console.log('  - Last Sync:', status.lastSync || 'Never');
        console.log('  - Total Activities:', status.totalActivities || 0);
        console.log('  - Total HR Zone Records:', status.totalZoneRecords || 0);
        console.log('');

        // Check recent HR zones
        console.log('2️⃣  Checking HR zone data (last 30 days)...');
        const zonesResponse = await fetch(`${PRODUCTION_URL}/api/sync/zones/${userId}?days=30`);
        const zones = await zonesResponse.json();

        console.log('📈 HR Zone Data:');
        console.log('  - Records found:', zones.zoneRecords || 0);

        if (zones.data && zones.data.length > 0) {
            console.log('\n  Latest 5 activities with HR zones:');
            zones.data.slice(0, 5).forEach((record, i) => {
                console.log(`\n  ${i + 1}. ${record.activityType || 'Unknown'} on ${record.date}`);
                console.log(`     Duration: ${record.durationMinutes} min`);
                console.log(`     Device: ${record.deviceModel || 'Unknown'}`);
                console.log(`     HR Zones: Z1=${record.zones.zone1}m, Z2=${record.zones.zone2}m, Z3=${record.zones.zone3}m, Z4=${record.zones.zone4}m, Z5=${record.zones.zone5}m`);
                console.log(`     HR: Avg=${record.hr.avg || 'N/A'}, Max=${record.hr.max || 'N/A'}`);
            });
        } else {
            console.log('  ⚠️  No HR zone data found yet');
        }

        console.log('\n');

        // Summary
        if (status.totalActivities > 0 || status.totalZoneRecords > 0) {
            console.log('✅ SUCCESS! Garmin data is flowing into the database!');
            console.log(`   - ${status.totalActivities} activities stored`);
            console.log(`   - ${status.totalZoneRecords} HR zone records`);
        } else {
            console.log('⏳ No data received yet. This could mean:');
            console.log('   1. Garmin hasn\'t sent push notifications yet (can take 15-30 min after sync)');
            console.log('   2. Webhook endpoint hasn\'t received any POST requests from Garmin');
            console.log('   3. No recent activities on your Garmin device');
            console.log('\n💡 Next steps:');
            console.log('   - Make sure you\'ve synced your Garmin device recently');
            console.log('   - Check Garmin Developer Console webhook status');
            console.log('   - Wait 15-30 minutes for Garmin to send push notifications');
        }

    } catch (error) {
        console.error('❌ Error checking data:', error.message);
    }
}

checkData();
