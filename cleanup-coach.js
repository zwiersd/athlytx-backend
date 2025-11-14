/**
 * Cleanup script to remove all data for a specific coach
 * Usage: node cleanup-coach.js
 */

require('dotenv').config();
const {
    sequelize,
    User,
    CoachAthlete,
    MagicLink,
    Activity,
    DailyMetric,
    TrainingSummary,
    OAuthToken
} = require('./backend/models');

const COACH_EMAIL = 'darren@zwiers.co.uk';

async function cleanupCoach() {
    try {
        console.log('🔍 Looking for coach:', COACH_EMAIL);

        // Find the coach
        const coach = await User.findOne({
            where: { email: COACH_EMAIL.toLowerCase().trim() }
        });

        if (!coach) {
            console.log('❌ Coach not found');
            return;
        }

        console.log('✅ Found coach:', coach.id, '-', coach.email, '- Role:', coach.role);

        // Start transaction
        await sequelize.transaction(async (transaction) => {
            // 1. Delete all coach-athlete relationships (both as coach and as athlete)
            const deletedAsCoach = await CoachAthlete.destroy({
                where: { coachId: coach.id },
                transaction
            });
            console.log(`  ✅ Deleted ${deletedAsCoach} relationships where user is coach`);

            const deletedAsAthlete = await CoachAthlete.destroy({
                where: { athleteId: coach.id },
                transaction
            });
            console.log(`  ✅ Deleted ${deletedAsAthlete} relationships where user is athlete`);

            // 2. Delete all OAuth tokens
            const deletedTokens = await OAuthToken.destroy({
                where: { userId: coach.id },
                transaction
            });
            console.log(`  ✅ Deleted ${deletedTokens} OAuth tokens`);

            // 3. Delete all activities
            const deletedActivities = await Activity.destroy({
                where: { userId: coach.id },
                transaction
            });
            console.log(`  ✅ Deleted ${deletedActivities} activities`);

            // 4. Delete all daily metrics
            const deletedMetrics = await DailyMetric.destroy({
                where: { userId: coach.id },
                transaction
            });
            console.log(`  ✅ Deleted ${deletedMetrics} daily metrics`);

            // 5. Delete all training summaries
            const deletedSummaries = await TrainingSummary.destroy({
                where: { userId: coach.id },
                transaction
            });
            console.log(`  ✅ Deleted ${deletedSummaries} training summaries`);

            // 6. Delete all magic links
            const deletedMagicLinks = await MagicLink.destroy({
                where: { userId: coach.id },
                transaction
            });
            console.log(`  ✅ Deleted ${deletedMagicLinks} magic links`);

            // 7. Delete the user account
            await coach.destroy({ transaction });
            console.log(`  ✅ Deleted user account: ${coach.email}`);
        });

        console.log('\n🎉 Cleanup completed successfully!');
        console.log('All data for', COACH_EMAIL, 'has been removed.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await sequelize.close();
        console.log('Database connection closed');
    }
}

// Run the cleanup
cleanupCoach();
