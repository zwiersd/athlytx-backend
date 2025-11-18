/**
 * Manual PUSH registration for Garmin OAuth 2.0 users
 * Run this to re-register your PUSH webhook with Garmin
 */

const fetch = require('node-fetch');
require('dotenv').config();
const { OAuthToken } = require('./backend/models');
const { decrypt } = require('./backend/utils/encryption');

async function registerPushNotifications() {
    console.log('\n📝 === MANUALLY REGISTERING GARMIN PUSH NOTIFICATIONS ===\n');

    try {
        // Get Garmin tokens for user
        const userId = '3c37dd1f-25f8-4212-afcf-52a7d37f0903';

        const token = await OAuthToken.findOne({
            where: {
                userId: userId,
                provider: 'garmin'
            }
        });

        if (!token) {
            console.error('❌ No Garmin token found for user');
            process.exit(1);
        }

        console.log(`✅ Found Garmin token for user ${userId}`);

        // Decrypt access token
        const accessToken = decrypt(token.accessTokenEncrypted);

        // Register for PUSH notifications using OAuth 2.0 Bearer token
        const pushRegUrl = 'https://apis.garmin.com/wellness-api/rest/user/registration';

        console.log('📡 Calling Garmin PUSH registration endpoint...');
        console.log('   URL:', pushRegUrl);
        console.log('   Using: OAuth 2.0 Bearer token');

        const response = await fetch(pushRegUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const responseText = await response.text();

        console.log('\n📊 Response:');
        console.log('   Status:', response.status);
        console.log('   Body:', responseText);

        if (response.ok || response.status === 409) {
            console.log('\n✅ SUCCESS: User registered for PUSH notifications');
            if (response.status === 409) {
                console.log('   (User was already registered - this is normal)');
            }
            console.log('\n📱 Next steps:');
            console.log('   1. Send an activity from your Garmin device');
            console.log('   2. Wait 1-2 minutes for Garmin to send PUSH notification');
            console.log('   3. Check the database for new activities and dailies');
        } else {
            console.log('\n❌ PUSH registration failed');
            console.log('   This means activities will NOT auto-sync from Garmin');
            console.log('\n   Possible causes:');
            console.log('   - Invalid or expired OAuth token');
            console.log('   - Garmin API credentials issue');
            console.log('   - Network/connectivity problem');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
        process.exit(1);
    }

    process.exit(0);
}

registerPushNotifications();
