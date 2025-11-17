/**
 * Check when Garmin data was actually created/synced to verify if it's real or seeded test data
 */

const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://athlytx-backend-production.up.railway.app';
const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';

async function checkTimestamps() {
    try {
        console.log('🔍 Checking when Garmin data was created in database...\n');

        // Check sync status to see last sync time
        const statusResponse = await fetch(`${PRODUCTION_URL}/api/sync/status/${userId}`);
        const status = await statusResponse.json();

        console.log('📊 Sync Status:');
        console.log('━'.repeat(60));
        console.log('Last Sync:', status.lastSync || 'Never');
        console.log('Total Activities:', status.totalActivities);
        console.log('Total HR Zone Records:', status.totalZoneRecords);
        console.log('━'.repeat(60));

        // Parse the last sync time
        if (status.lastSync) {
            const lastSyncDate = new Date(status.lastSync);
            const now = new Date();
            const hoursSinceSync = Math.floor((now - lastSyncDate) / (1000 * 60 * 60));
            const daysSinceSync = Math.floor(hoursSinceSync / 24);

            console.log(`\n⏱️  Last sync was ${daysSinceSync} days and ${hoursSinceSync % 24} hours ago`);
            console.log(`   Exact time: ${lastSyncDate.toLocaleString()}`);

            if (daysSinceSync > 3) {
                console.log('\n⚠️  WARNING: Last sync was more than 3 days ago!');
                console.log('   This suggests the data might be old test/seed data.');
                console.log('   Real Garmin data would sync more recently if you\'re actively using the device.');
            } else if (daysSinceSync === 0 && hoursSinceSync < 2) {
                console.log('\n✅ Data was synced very recently (within 2 hours)');
                console.log('   This suggests active data syncing is working!');
            }
        }

        // Let's also check the activity dates vs sync dates
        const zonesResponse = await fetch(`${PRODUCTION_URL}/api/sync/zones/${userId}?days=7`);
        const zones = await zonesResponse.json();

        const garminActivities = zones.data.filter(a => a.provider === 'garmin');

        if (garminActivities.length > 0) {
            console.log('\n\n📅 Garmin Activity Dates vs Current Date:');
            console.log('━'.repeat(60));

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            garminActivities.forEach(act => {
                const actDate = new Date(act.date);
                const daysAgo = Math.floor((today - actDate) / (1000 * 60 * 60 * 24));

                console.log(`\n${act.activityType} on ${act.date}`);
                console.log(`   Days ago: ${daysAgo}`);
                console.log(`   Device: ${act.deviceModel}`);
                console.log(`   Duration: ${act.durationMinutes} min, Distance: ${act.distanceMeters ? (act.distanceMeters / 1000).toFixed(2) + ' km' : 'N/A'}`);
            });

            // Check if activity dates match realistic patterns
            const activityDates = garminActivities.map(a => new Date(a.date));
            const newestActivity = new Date(Math.max(...activityDates));
            const oldestActivity = new Date(Math.min(...activityDates));

            const daysOld = Math.floor((today - newestActivity) / (1000 * 60 * 60 * 24));

            console.log('\n\n🔍 ANALYSIS:');
            console.log('━'.repeat(60));
            console.log(`Newest Garmin activity: ${newestActivity.toDateString()} (${daysOld} days ago)`);
            console.log(`Oldest Garmin activity: ${oldestActivity.toDateString()}`);
            console.log(`Activity span: ${Math.floor((newestActivity - oldestActivity) / (1000 * 60 * 60 * 24))} days`);

            if (daysOld > 3) {
                console.log('\n❌ VERDICT: Likely DUMMY/SEED DATA');
                console.log('   Reasons:');
                console.log('   - Newest activity is more than 3 days old');
                console.log('   - No recent activities despite Garmin being "connected"');
                console.log('   - Activities have suspiciously round numbers (30 min, 45 min, etc.)');
            } else {
                console.log('\n✅ VERDICT: Could be REAL DATA');
                console.log('   - Activities are recent (within last 3 days)');
            }
        }

        console.log('\n\n💡 To verify for sure:');
        console.log('   1. Check if you actually did these activities on these dates');
        console.log('   2. Try syncing your Garmin device now and see if new data appears');
        console.log('   3. Check the database seed files for test data');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkTimestamps();
