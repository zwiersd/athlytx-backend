/**
 * Fix Garmin providerUserId in database
 *
 * The PUSH webhook is receiving data for userId: 0a2bd543599ed7457c076f3314f54be3
 * but the database has the wrong providerUserId. This script fixes it.
 */

const { OAuthToken } = require('./backend/models');

const CORRECT_GARMIN_USER_ID = '0a2bd543599ed7457c076f3314f54be3';

async function fixProviderUserId() {
    console.log('🔧 Fixing Garmin providerUserId in database...\n');

    try {
        // Find the most recent Garmin token
        const token = await OAuthToken.findOne({
            where: {
                provider: 'garmin'
            },
            order: [['createdAt', 'DESC']]
        });

        if (!token) {
            console.log('❌ No Garmin token found in database');
            return;
        }

        console.log('📝 Current token:');
        console.log(`   userId: ${token.userId}`);
        console.log(`   provider: ${token.provider}`);
        console.log(`   providerUserId: ${token.providerUserId}`);
        console.log(`   createdAt: ${token.createdAt}`);

        console.log(`\n🔄 Updating providerUserId to: ${CORRECT_GARMIN_USER_ID}`);

        await token.update({
            providerUserId: CORRECT_GARMIN_USER_ID
        });

        console.log('✅ Updated successfully!');

        // Verify
        const updated = await OAuthToken.findOne({
            where: {
                provider: 'garmin',
                userId: token.userId
            }
        });

        console.log('\n✅ Verified updated token:');
        console.log(`   userId: ${updated.userId}`);
        console.log(`   providerUserId: ${updated.providerUserId}`);

        console.log('\n🎯 PUSH webhooks should now match this user correctly!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    }
}

fixProviderUserId()
    .then(() => {
        console.log('\n✅ Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Failed:', err);
        process.exit(1);
    });
