/**
 * Simple test to verify Activity API access with test credentials
 *
 * This will:
 * 1. Use test app credentials (Activity API enabled)
 * 2. Attempt to fetch activities via Activity API
 * 3. Display results for screenshots
 *
 * Run: GARMIN_CONSUMER_KEY=ee6809d5-abc0-4a33-b38a-d433e5045987 GARMIN_CONSUMER_SECRET=0Xjs//vs29LPby1XbvGUBcVM1gzn7/idbavTyTVnl3M node test-activity-api-simple.js
 */

require('dotenv').config({ path: '.env.test' });
const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://athlytx-backend-production.up.railway.app';
const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';

async function testActivityAPI() {
    try {
        console.log('🧪 Testing Garmin Activity API with Test App Credentials\n');
        console.log('━'.repeat(60));
        console.log(`Consumer Key: ${process.env.GARMIN_CONSUMER_KEY}`);
        console.log('Activity API Status: ✅ Enabled and Approved');
        console.log('━'.repeat(60) + '\n');

        // First, check if we have a token with Activity API access
        console.log('1️⃣  Checking OAuth token...\n');

        const tokenCheck = await fetch(`${PRODUCTION_URL}/api/sync/check-token?provider=garmin&userId=${userId}`);
        const tokenData = await tokenCheck.json();

        if (tokenData.tokens && tokenData.tokens.length > 0) {
            console.log(`   ✅ Found ${tokenData.tokens.length} Garmin token(s)`);
            console.log(`   Garmin User ID: ${tokenData.tokens[0].providerUserId || 'Not set'}\n`);
        } else {
            console.log('   ⚠️  No Garmin OAuth token found.');
            console.log('   You need to reconnect Garmin using the test app credentials.\n');
            console.log('   Steps:');
            console.log('   1. Update Railway env vars to use test credentials');
            console.log('   2. Disconnect and reconnect Garmin on the website');
            console.log('   3. Run this script again\n');
            return;
        }

        // Try to sync activities using Activity API
        console.log('2️⃣  Attempting to fetch activities via Activity API...\n');

        const syncResponse = await fetch(`${PRODUCTION_URL}/api/sync/manual`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                daysBack: 14
            })
        });

        const syncData = await syncResponse.json();

        console.log('   Response Status:', syncResponse.status);
        console.log('   Response:', JSON.stringify(syncData, null, 2));

        if (syncData.success && syncData.results && syncData.results.garmin) {
            const garminData = syncData.results.garmin;

            if (garminData.error) {
                console.log('\n   ❌ Error from Garmin API:', garminData.error);

                if (garminData.error.includes('InvalidPullTokenException')) {
                    console.log('\n   💡 This means the current OAuth token does NOT have Activity API access.');
                    console.log('   The token was created with Health API only credentials.\n');
                    console.log('   Next steps:');
                    console.log('   1. Update GARMIN_CONSUMER_KEY in Railway to: ee6809d5-abc0-4a33-b38a-d433e5045987');
                    console.log('   2. Update GARMIN_CONSUMER_SECRET in Railway');
                    console.log('   3. Disconnect Garmin on the website');
                    console.log('   4. Reconnect Garmin (this will create a new token with Activity API access)');
                    console.log('   5. Run this test again\n');
                }
            } else if (garminData.activities && garminData.activities.length > 0) {
                console.log(`\n   🎉 SUCCESS! Fetched ${garminData.activities.length} activities!\n`);
                console.log('   Recent activities:');
                console.log('   ━'.repeat(60));

                garminData.activities.slice(0, 5).forEach((activity, i) => {
                    console.log(`\n   ${i + 1}. ${activity.activityType || 'Activity'}`);
                    console.log(`      Date: ${activity.date || activity.startTime}`);
                    console.log(`      Duration: ${activity.durationMinutes || Math.round((activity.durationSeconds || 0) / 60)} min`);
                    if (activity.distanceMeters) {
                        console.log(`      Distance: ${(activity.distanceMeters / 1000).toFixed(2)} km`);
                    }
                    if (activity.avgHr) {
                        console.log(`      Avg HR: ${activity.avgHr} bpm`);
                    }
                });

                console.log('\n   ━'.repeat(60));
                console.log('\n   ✅ Activity API is working! Take screenshots of this for Garmin.\n');
            } else {
                console.log('\n   ⚠️  Sync succeeded but no activities returned.');
                console.log('   This could mean:');
                console.log('   - No activities in the last 14 days');
                console.log('   - Token has Activity API access but no data available\n');
            }
        } else {
            console.log('\n   ⚠️  Unexpected response format');
        }

        // Check what's in the database now
        console.log('\n3️⃣  Checking database for activity data...\n');

        const dbResponse = await fetch(`${PRODUCTION_URL}/api/sync/zones/${userId}?days=14`);
        const dbData = await dbResponse.json();

        if (dbData.data && dbData.data.length > 0) {
            const garminActivities = dbData.data.filter(a => a.provider === 'garmin');
            console.log(`   Found ${garminActivities.length} Garmin activities in database`);

            if (garminActivities.length > 0) {
                console.log('\n   Recent Garmin activities with HR zones:');
                console.log('   ━'.repeat(60));

                garminActivities.slice(0, 3).forEach((act, i) => {
                    console.log(`\n   ${i + 1}. ${act.activityType}`);
                    console.log(`      Date: ${act.date}`);
                    console.log(`      Duration: ${act.durationMinutes} min`);
                    console.log(`      HR Zones: Z1:${act.zones.zone1} Z2:${act.zones.zone2} Z3:${act.zones.zone3} Z4:${act.zones.zone4} Z5:${act.zones.zone5}`);
                });

                console.log('\n   ━'.repeat(60));
            }
        } else {
            console.log('   No activities in database yet.');
        }

        console.log('\n━'.repeat(60));
        console.log('📸 NEXT STEPS FOR GARMIN APPROVAL:');
        console.log('━'.repeat(60));
        console.log('1. Update Railway environment variables to test credentials');
        console.log('2. Reconnect Garmin on the website to get Activity API token');
        console.log('3. Run this test again to fetch activities');
        console.log('4. Open test-activity-api.html in browser to see visual UI');
        console.log('5. Take screenshots showing activities with HR zones');
        console.log('6. Email screenshots to Garmin with test/prod keys\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

testActivityAPI();
