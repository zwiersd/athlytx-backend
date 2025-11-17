/**
 * Test script to verify real Garmin data sync
 *
 * Usage:
 *   node test-real-sync.js
 */

const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://athlytx-backend-production.up.railway.app';
const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';

async function testSync() {
    try {
        console.log('🏃 Starting Garmin Sync Test...\n');
        console.log('━'.repeat(60));

        // Step 1: Check current state
        console.log('\n📊 STEP 1: Checking current data...\n');

        const beforeResponse = await fetch(`${PRODUCTION_URL}/api/sync/status/${userId}`);
        const beforeStatus = await beforeResponse.json();

        console.log('Current Status:');
        console.log(`  - Total Activities: ${beforeStatus.totalActivities}`);
        console.log(`  - Total HR Zones: ${beforeStatus.totalZoneRecords}`);
        console.log(`  - Last Sync: ${beforeStatus.lastSync || 'Never'}`);

        // Get newest activity date
        const zonesBeforeResponse = await fetch(`${PRODUCTION_URL}/api/sync/zones/${userId}?days=1`);
        const zonesBefore = await zonesBeforeResponse.json();

        const garminActivitiesBefore = zonesBefore.data?.filter(a => a.provider === 'garmin') || [];
        console.log(`  - Garmin activities in last 24h: ${garminActivitiesBefore.length}`);

        // Step 2: Trigger manual sync
        console.log('\n━'.repeat(60));
        console.log('\n🔄 STEP 2: Triggering manual sync (7 days)...\n');

        const syncResponse = await fetch(`${PRODUCTION_URL}/api/sync/manual`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                daysBack: 7
            })
        });

        const syncResult = await syncResponse.json();

        if (syncResponse.ok) {
            console.log('✅ Sync request accepted:');
            console.log(JSON.stringify(syncResult, null, 2));
        } else {
            console.log('❌ Sync request failed:');
            console.log(JSON.stringify(syncResult, null, 2));
            console.log('\nThis is expected because we only have Health API access (not Wellness API).');
            console.log('The Pull API endpoints return InvalidPullTokenException.');
            console.log('\n💡 However, Health API push notifications should still work!');
            return;
        }

        // Wait a few seconds for sync to complete
        console.log('\n⏳ Waiting 10 seconds for sync to complete...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Step 3: Check if new data appeared
        console.log('\n━'.repeat(60));
        console.log('\n📊 STEP 3: Checking for new data...\n');

        const afterResponse = await fetch(`${PRODUCTION_URL}/api/sync/status/${userId}`);
        const afterStatus = await afterResponse.json();

        console.log('Updated Status:');
        console.log(`  - Total Activities: ${afterStatus.totalActivities} (${afterStatus.totalActivities > beforeStatus.totalActivities ? '+' + (afterStatus.totalActivities - beforeStatus.totalActivities) : 'no change'})`);
        console.log(`  - Total HR Zones: ${afterStatus.totalZoneRecords} (${afterStatus.totalZoneRecords > beforeStatus.totalZoneRecords ? '+' + (afterStatus.totalZoneRecords - beforeStatus.totalZoneRecords) : 'no change'})`);
        console.log(`  - Last Sync: ${afterStatus.lastSync || 'Never'}`);

        // Check for new Garmin activities in last 24h
        const zonesAfterResponse = await fetch(`${PRODUCTION_URL}/api/sync/zones/${userId}?days=1`);
        const zonesAfter = await zonesAfterResponse.json();

        const garminActivitiesAfter = zonesAfter.data?.filter(a => a.provider === 'garmin') || [];
        console.log(`  - Garmin activities in last 24h: ${garminActivitiesAfter.length} (${garminActivitiesAfter.length > garminActivitiesBefore.length ? '+' + (garminActivitiesAfter.length - garminActivitiesBefore.length) : 'no change'})`);

        if (garminActivitiesAfter.length > garminActivitiesBefore.length) {
            console.log('\n🎉 NEW GARMIN ACTIVITIES FOUND!\n');

            const newActivities = garminActivitiesAfter.slice(0, garminActivitiesAfter.length - garminActivitiesBefore.length);
            newActivities.forEach((act, i) => {
                console.log(`${i + 1}. ${act.activityType} on ${act.date}`);
                console.log(`   Duration: ${act.durationMinutes} min`);
                console.log(`   Device: ${act.deviceModel}`);
                console.log(`   Distance: ${act.distanceMeters ? (act.distanceMeters / 1000).toFixed(2) + ' km' : 'N/A'}`);
                console.log(`   HR: Avg ${act.hr.avg}, Max ${act.hr.max}`);
                console.log(`   Zones: Z1:${act.zones.zone1} Z2:${act.zones.zone2} Z3:${act.zones.zone3} Z4:${act.zones.zone4} Z5:${act.zones.zone5}`);
                console.log('');
            });
        } else {
            console.log('\n⚠️  No new Garmin activities detected.');
            console.log('\nPossible reasons:');
            console.log('  1. Activity not yet synced to Garmin Connect');
            console.log('  2. Pull API not working (InvalidPullTokenException)');
            console.log('  3. Activity was recorded but not uploaded yet');
            console.log('  4. Health API push notifications not yet sent by Garmin');
            console.log('\n💡 Next steps:');
            console.log('  - Make sure your Garmin device is synced to Garmin Connect app');
            console.log('  - Wait 15-30 minutes for Health API push notifications');
            console.log('  - Check Railway logs for incoming webhook data');
        }

        console.log('\n━'.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

// Run the test
console.log('='.repeat(60));
console.log('  GARMIN REAL DATA SYNC TEST');
console.log('='.repeat(60));
console.log('\nThis will:');
console.log('  1. Check current data in database');
console.log('  2. Trigger a manual sync from Garmin API');
console.log('  3. Verify if new data was received\n');
console.log('Make sure you have:');
console.log('  ✓ Recorded an activity on your Garmin device');
console.log('  ✓ Synced your device to Garmin Connect app');
console.log('  ✓ Waited a few minutes for the sync to complete\n');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('Press ENTER to start the test (or Ctrl+C to cancel)...', () => {
    readline.close();
    testSync();
});
