/**
 * Clear all dummy/test data from PRODUCTION database
 * This will delete ALL activities, heart rate zones, and daily metrics
 * to start fresh for real Garmin data
 */

const { Sequelize } = require('sequelize');

// Production database URL
const DATABASE_URL = 'postgresql://postgres:LrvTxjKbnQyIGUEaZdUAFdtGdMnVGtDW@junction.proxy.rlwy.net:44253/railway';

async function clearDummyData() {
    const sequelize = new Sequelize(DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: false
        }
    });

    try {
        // Test connection
        await sequelize.authenticate();
        console.log('✅ Connected to PRODUCTION database\n');

        console.log('🗑️  Starting database cleanup...\n');

        // Delete all data
        const tables = [
            { name: 'heart_rate_zones', display: 'Heart Rate Zones' },
            { name: 'activities', display: 'Activities' },
            { name: 'daily_metrics', display: 'Daily Metrics' },
            { name: 'training_summaries', display: 'Training Summaries' }
        ];

        for (const table of tables) {
            console.log(`📋 Clearing ${table.display}...`);

            const [beforeCount] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table.name}`);
            const before = beforeCount[0].count;

            await sequelize.query(`DELETE FROM ${table.name}`);

            const [afterCount] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table.name}`);
            const after = afterCount[0].count;

            console.log(`   ✅ Deleted ${before} records (${after} remaining)\n`);
        }

        console.log('━'.repeat(60));
        console.log('✅ Database cleanup complete!\n');
        console.log('The database is now clean and ready for real Garmin data.');
        console.log('When Activity API is approved, new activities will sync here.\n');

        await sequelize.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error clearing database:', error);
        await sequelize.close();
        process.exit(1);
    }
}

console.log('⚠️  WARNING: This will delete ALL activity data from PRODUCTION database!');
console.log('Database: railway (PostgreSQL)');
console.log('');
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
