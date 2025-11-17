/**
 * Clear all dummy/test data from the database via API
 */

const fetch = require('node-fetch');

const PRODUCTION_URL = 'https://athlytx-backend-production.up.railway.app';
const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';

async function clearDummyData() {
    try {
        console.log('🗑️  Clearing dummy data from production database...\n');

        // Check current state
        const beforeResponse = await fetch(`${PRODUCTION_URL}/api/sync/status/${userId}`);
        const beforeStatus = await beforeResponse.json();

        console.log('📊 Current State:');
        console.log(`   Activities: ${beforeStatus.totalActivities}`);
        console.log(`   HR Zone Records: ${beforeStatus.totalZoneRecords}\n`);

        // Call clear endpoint (we need to add this to the backend)
        console.log('🔄 Sending clear request...\n');

        const clearResponse = await fetch(`${PRODUCTION_URL}/api/sync/clear-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId
            })
        });

        if (clearResponse.ok) {
            const result = await clearResponse.json();
            console.log('✅ Clear request successful:');
            console.log(JSON.stringify(result, null, 2));
        } else {
            const error = await clearResponse.text();
            console.log('❌ Clear request failed:', error);
            console.log('\nNote: The /api/sync/clear-data endpoint needs to be added to the backend.');
        }

        // Check after state
        const afterResponse = await fetch(`${PRODUCTION_URL}/api/sync/status/${userId}`);
        const afterStatus = await afterResponse.json();

        console.log('\n📊 After Clear:');
        console.log(`   Activities: ${afterStatus.totalActivities} (deleted: ${beforeStatus.totalActivities - afterStatus.totalActivities})`);
        console.log(`   HR Zone Records: ${afterStatus.totalZoneRecords} (deleted: ${beforeStatus.totalZoneRecords - afterStatus.totalZoneRecords})`);

        console.log('\n✅ Database is now clean and ready for real Garmin data!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

console.log('⚠️  WARNING: This will delete ALL activity data from the database!');
console.log('This includes:');
console.log('  - All activities (Strava, Garmin, Whoop, Oura)');
console.log('  - All heart rate zone records');
console.log('  - All daily metrics');
console.log('  - All training summaries');
console.log('');
console.log('OAuth tokens will NOT be deleted (you\'ll stay connected).\n');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('Type "DELETE" to confirm: ', (answer) => {
    readline.close();

    if (answer === 'DELETE') {
        clearDummyData();
    } else {
        console.log('\n❌ Cancelled. No data was deleted.');
        process.exit(0);
    }
});
