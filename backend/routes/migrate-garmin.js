const { Activity } = require('../models');

async function migrateGarminActivities() {
    const result = await Activity.update(
        { userId: '82b58332-34e2-41c2-9599-c8a3b5511175' },
        {
            where: {
                userId: '3c37dd1f-25f8-4212-afcf-52a7d37f0903',
                provider: 'garmin'
            }
        }
    );
    console.log(`Migrated ${result[0]} activities`);
    process.exit(0);
}

migrateGarminActivities();
