const fetch = require('node-fetch');

// API Pull Token (temporary, expires 2025-11-14)
const pullToken = 'CPT1763156921.G3e90TSvDwM';

async function testPullToken() {
    try {
        // Test 1: Try with summaryStartTimeInSeconds (last 7 days)
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (7 * 24 * 60 * 60);

        console.log('🔍 Testing Garmin API Pull Token...');
        console.log(`Time range: ${new Date(startDate * 1000).toISOString()} to ${new Date(endDate * 1000).toISOString()}\n`);

        // Try the wellness API endpoint with token as query parameter
        const url = `https://apis.garmin.com/wellness-api/rest/activities?summaryStartTimeInSeconds=${startDate}&summaryEndTimeInSeconds=${endDate}&access_token=${pullToken}`;

        console.log('URL:', url.replace(pullToken, 'CPT...'));
        console.log('Token:', pullToken);

        const response = await fetch(url);

        console.log('\n📊 Response Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Error:', errorText);
            return;
        }

        const activities = await response.json();
        console.log(`\n✅ Success! Found ${activities.length} activities`);

        if (activities.length > 0) {
            console.log('\n📱 First Activity:');
            const first = activities[0];
            console.log(JSON.stringify(first, null, 2));

            console.log('\n🔍 Device Fields:');
            console.log('deviceModel:', first.deviceModel);
            console.log('deviceName:', first.deviceName);
            console.log('manufacturerName:', first.manufacturerName);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testPullToken();
