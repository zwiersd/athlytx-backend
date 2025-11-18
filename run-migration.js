/**
 * Run Garmin health metrics migration
 */

const sequelize = require('./backend/utils/database');
const migration = require('./backend/migrations/add-garmin-health-metrics');

async function runMigration() {
    try {
        console.log('🚀 Starting migration...');

        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);

        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
