/**
 * Test script for Garmin backfill endpoint
 *
 * Usage:
 *   node test-backfill.js <userId> [days]
 *   node test-backfill.js <userId> <startDate> <endDate>
 *
 * Examples:
 *   node test-backfill.js abc-123-def 30
 *   node test-backfill.js abc-123-def 2025-01-01 2025-01-31
 */

const userId = process.argv[2];
const arg3 = process.argv[3];
const arg4 = process.argv[4];

if (!userId) {
    console.error('❌ Usage: node test-backfill.js <userId> [days|startDate] [endDate]');
    console.error('\nExamples:');
    console.error('  node test-backfill.js abc-123 30');
    console.error('  node test-backfill.js abc-123 2025-01-01 2025-01-31');
    process.exit(1);
}

let body;

if (arg4) {
    // Date range provided
    body = {
        userId: userId,
        startDate: arg3,
        endDate: arg4
    };
    console.log(`📅 Testing backfill with date range: ${arg3} to ${arg4}`);
} else if (arg3) {
    // Days back provided
    const daysBack = parseInt(arg3);
    if (isNaN(daysBack)) {
        console.error('❌ Invalid days value. Must be a number.');
        process.exit(1);
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    body = {
        userId: userId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
    console.log(`📅 Testing backfill for last ${daysBack} days`);
} else {
    // No date range, use default (90 days)
    body = {
        userId: userId
    };
    console.log('📅 Testing backfill with default (90 days)');
}

console.log('Request body:', JSON.stringify(body, null, 2));

fetch('http://localhost:3000/api/garmin/backfill', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
})
.then(async response => {
    const data = await response.json();

    if (response.ok) {
        console.log('\n✅ Backfill request accepted:');
        console.log(JSON.stringify(data, null, 2));
        console.log('\n⏳ Data is being synced in the background...');
        console.log('💡 Check server logs for progress');
        console.log('💡 Use GET /api/sync/status/:userId to check completion');
    } else {
        console.error('\n❌ Backfill request failed:');
        console.error(JSON.stringify(data, null, 2));
        process.exit(1);
    }
})
.catch(error => {
    console.error('\n❌ Connection error:', error.message);
    console.error('💡 Make sure the server is running on http://localhost:3000');
    process.exit(1);
});
