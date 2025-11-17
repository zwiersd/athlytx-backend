/**
 * Check if Garmin GUID (providerUserId) was saved to database
 */

const fetch = require('node-fetch');

const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';

async function checkToken() {
    try {
        console.log('🔍 Checking Garmin token in database...\n');

        const response = await fetch(`http://localhost:3000/api/sync/check-token?userId=${userId}&provider=garmin`);

        if (!response.ok) {
            console.error('❌ Request failed:', response.status, response.statusText);
            const error = await response.text();
            console.error(error);
            return;
        }

        const data = await response.json();

        console.log('✅ Response:');
        console.log(JSON.stringify(data, null, 2));

        if (data.tokens && data.tokens.length > 0) {
            const token = data.tokens[0];
            console.log('\n📊 Token Details:');
            console.log('- User ID:', token.userId);
            console.log('- Provider:', token.provider);
            console.log('- Provider User ID (Garmin GUID):', token.provider_user_id || '❌ NOT SET');
            console.log('- Expires At:', token.expiresAt);
            console.log('- Created At:', token.createdAt);
            console.log('- Updated At:', token.updatedAt);

            if (!token.provider_user_id) {
                console.log('\n⚠️  WARNING: providerUserId (Garmin GUID) is not set!');
                console.log('This means Health API push notifications won\'t be mapped to this user.');
                console.log('\n💡 Next steps:');
                console.log('1. Check if JWT token contains garmin_guid claim');
                console.log('2. Verify frontend is extracting and sending it to saveTokenToDatabase()');
                console.log('3. Reconnect Garmin to trigger token save with GUID');
            } else {
                console.log('\n✅ Garmin GUID is set! Health API push notifications will work.');
            }
        } else {
            console.log('\n❌ No Garmin token found for this user');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkToken();
