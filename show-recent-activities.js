/**
 * Show recent Garmin activities with full details
 */

const fetch = require('node-fetch');

const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';
const PRODUCTION_URL = 'https://athlytx-backend-production.up.railway.app';

async function showActivities() {
    try {
        console.log('📊 Fetching recent Garmin activities...\n');

        // Get last 14 days of data
        const response = await fetch(`${PRODUCTION_URL}/api/sync/zones/${userId}?days=14`);
        const data = await response.json();

        console.log(`✅ Found ${data.zoneRecords} activities with HR zone data\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        if (data.data && data.data.length > 0) {
            // Group by date
            const byDate = {};
            data.data.forEach(activity => {
                if (!byDate[activity.date]) {
                    byDate[activity.date] = [];
                }
                byDate[activity.date].push(activity);
            });

            // Show activities by date (most recent first)
            const dates = Object.keys(byDate).sort().reverse();

            dates.slice(0, 7).forEach(date => {
                const activities = byDate[date];
                console.log(`📅 ${date} (${activities.length} activities)`);
                console.log('─'.repeat(62));

                activities.forEach((act, i) => {
                    const totalMinutes = act.durationMinutes;
                    const totalZones = act.zones.zone1 + act.zones.zone2 + act.zones.zone3 + act.zones.zone4 + act.zones.zone5;

                    console.log(`\n${i + 1}. ${act.activityType || 'Unknown'}`);
                    console.log(`   Duration: ${totalMinutes} minutes (${totalZones} min in HR zones)`);
                    if (act.distanceMeters) {
                        console.log(`   Distance: ${(act.distanceMeters / 1000).toFixed(2)} km`);
                    }
                    console.log(`   Device: ${act.deviceModel || 'Not specified'}`);
                    console.log(`   Provider: ${act.provider}`);

                    // HR info
                    if (act.hr.avg || act.hr.max) {
                        console.log(`   Heart Rate: Avg ${act.hr.avg || 'N/A'} bpm, Max ${act.hr.max || 'N/A'} bpm`);
                    }

                    // Zone breakdown
                    console.log(`   HR Zones:`);
                    console.log(`     Zone 1: ${act.zones.zone1} min ${act.zones.zone1 > 0 ? '🟢' : ''}`);
                    console.log(`     Zone 2: ${act.zones.zone2} min ${act.zones.zone2 > 0 ? '🔵' : ''}`);
                    console.log(`     Zone 3: ${act.zones.zone3} min ${act.zones.zone3 > 0 ? '🟡' : ''}`);
                    console.log(`     Zone 4: ${act.zones.zone4} min ${act.zones.zone4 > 0 ? '🟠' : ''}`);
                    console.log(`     Zone 5: ${act.zones.zone5} min ${act.zones.zone5 > 0 ? '🔴' : ''}`);
                });

                console.log('\n' + '━'.repeat(62) + '\n');
            });

            // Summary stats
            const totalActivities = data.data.length;
            const totalMinutes = data.data.reduce((sum, a) => sum + a.durationMinutes, 0);
            const totalZ1 = data.data.reduce((sum, a) => sum + a.zones.zone1, 0);
            const totalZ2 = data.data.reduce((sum, a) => sum + a.zones.zone2, 0);
            const totalZ3 = data.data.reduce((sum, a) => sum + a.zones.zone3, 0);
            const totalZ4 = data.data.reduce((sum, a) => sum + a.zones.zone4, 0);
            const totalZ5 = data.data.reduce((sum, a) => sum + a.zones.zone5, 0);

            console.log('📈 SUMMARY (Last 14 Days)');
            console.log('━'.repeat(62));
            console.log(`Total Activities: ${totalActivities}`);
            console.log(`Total Training Time: ${totalMinutes} minutes (${(totalMinutes / 60).toFixed(1)} hours)`);
            console.log(`\nZone Distribution:`);
            console.log(`  Zone 1: ${totalZ1} min (${((totalZ1 / (totalZ1 + totalZ2 + totalZ3 + totalZ4 + totalZ5)) * 100).toFixed(1)}%)`);
            console.log(`  Zone 2: ${totalZ2} min (${((totalZ2 / (totalZ1 + totalZ2 + totalZ3 + totalZ4 + totalZ5)) * 100).toFixed(1)}%)`);
            console.log(`  Zone 3: ${totalZ3} min (${((totalZ3 / (totalZ1 + totalZ2 + totalZ3 + totalZ4 + totalZ5)) * 100).toFixed(1)}%)`);
            console.log(`  Zone 4: ${totalZ4} min (${((totalZ4 / (totalZ1 + totalZ2 + totalZ3 + totalZ4 + totalZ5)) * 100).toFixed(1)}%)`);
            console.log(`  Zone 5: ${totalZ5} min (${((totalZ5 / (totalZ1 + totalZ2 + totalZ3 + totalZ4 + totalZ5)) * 100).toFixed(1)}%)`);

        } else {
            console.log('⚠️  No activities found in the last 14 days');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

showActivities();
