/**
 * Cleanup corrupted Whoop data in production database
 *
 * This script:
 * 1. Finds activities with negative durations (caused by cycle.end = null)
 * 2. Deletes these corrupted records
 * 3. Reports what was deleted
 *
 * Run with: node scripts/cleanup-whoop-data.js
 * Or via Railway: railway run node scripts/cleanup-whoop-data.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Use Railway database URL if available
const databaseUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('❌ No database URL found. Set DATABASE_URL or RAILWAY_DATABASE_URL');
    process.exit(1);
}

// Override DATABASE_URL with Railway URL for production cleanup
process.env.DATABASE_URL = databaseUrl;

const sequelize = require('../backend/utils/database');
const { Activity } = require('../backend/models');

async function cleanupCorruptedWhoopData() {
    try {
        console.log('🔍 Searching for corrupted Whoop activities...\n');

        // Find activities with negative durations
        const corruptedActivities = await Activity.findAll({
            where: {
                provider: 'whoop',
                durationSeconds: {
                    [sequelize.Sequelize.Op.lt]: 0
                }
            },
            order: [['startTime', 'DESC']]
        });

        console.log(`📊 Found ${corruptedActivities.length} corrupted Whoop activities:\n`);

        if (corruptedActivities.length === 0) {
            console.log('✅ No corrupted Whoop data found. Database is clean!\n');
            return;
        }

        // Display corrupted records
        for (const activity of corruptedActivities) {
            console.log(`🔴 ID: ${activity.id}`);
            console.log(`   External ID: ${activity.externalId}`);
            console.log(`   Activity: ${activity.activityName}`);
            console.log(`   Start Time: ${activity.startTime}`);
            console.log(`   Duration: ${activity.durationSeconds} seconds (${(activity.durationSeconds / 86400).toFixed(0)} days)`);
            console.log(`   User ID: ${activity.userId}`);
            console.log('');
        }

        // Delete corrupted records
        console.log(`🗑️  Deleting ${corruptedActivities.length} corrupted records...\n`);

        const deletedCount = await Activity.destroy({
            where: {
                provider: 'whoop',
                durationSeconds: {
                    [sequelize.Sequelize.Op.lt]: 0
                }
            }
        });

        console.log(`✅ Successfully deleted ${deletedCount} corrupted Whoop activities\n`);

        // Verify cleanup
        const remainingCorrupted = await Activity.count({
            where: {
                provider: 'whoop',
                durationSeconds: {
                    [sequelize.Sequelize.Op.lt]: 0
                }
            }
        });

        if (remainingCorrupted === 0) {
            console.log('✅ Cleanup verified - no corrupted records remain\n');
        } else {
            console.log(`⚠️  Warning: ${remainingCorrupted} corrupted records still exist\n`);
        }

        // Show summary of remaining Whoop data
        const totalWhoopActivities = await Activity.count({
            where: { provider: 'whoop' }
        });

        console.log(`📊 Summary after cleanup:`);
        console.log(`   Total Whoop activities: ${totalWhoopActivities}`);
        console.log(`   Corrupted activities: ${remainingCorrupted}`);
        console.log(`   Clean activities: ${totalWhoopActivities - remainingCorrupted}`);

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Run cleanup
cleanupCorruptedWhoopData();
