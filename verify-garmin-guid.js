/**
 * Direct database query to verify Garmin GUID is saved
 */

const fetch = require('node-fetch');
const PRODUCTION_URL = 'https://athlytx-backend-production.up.railway.app';

async function verify() {
    try {
        console.log('🔍 Verifying Garmin User ID in production database...\n');

        // Use the raw SQL query to check the actual database column
        const response = await fetch(`${PRODUCTION_URL}/api/sync/check-token?provider=garmin&userId=3c37dd1f-25f8-4212-afcf-52a7d37f0903`);

        if (!response.ok) {
            console.error('❌ Request failed:', response.status);
            const error = await response.text();
            console.error(error);
            return;
        }

        const data = await response.json();

        if (data.tokens && data.tokens.length > 0) {
            const token = data.tokens[0];

            console.log('📊 Full Token Response:');
            console.log(JSON.stringify(token, null, 2));
            console.log('\n');

            // Check all possible field names
            const guidValue = token.providerUserId || token.provider_user_id || token.garminUserId || token.garmin_user_id;

            if (guidValue) {
                console.log('✅ SUCCESS! Garmin User ID is saved:');
                console.log(`   ${guidValue}`);
                console.log('\n💡 This means Health API push notifications will work!');
                console.log('   When Garmin sends webhook data with userId="${guidValue}",');
                console.log(`   it will map to internal user ${token.userId}`);
            } else {
                console.log('❌ Garmin User ID not found in response');
                console.log('Available fields:', Object.keys(token));
            }
        } else {
            console.log('❌ No token found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verify();
