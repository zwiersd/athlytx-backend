const { Sequelize } = require('sequelize');

/**
 * Migration to add deviceModel column to activities table
 * This will run automatically on server startup
 */
async function addDeviceModelColumn(sequelize) {
    const queryInterface = sequelize.getQueryInterface();

    try {
        // Check if column exists
        const tableDescription = await queryInterface.describeTable('activities');

        if (!tableDescription.deviceModel) {
            console.log('📝 Adding deviceModel column to activities table...');

            await queryInterface.addColumn('activities', 'deviceModel', {
                type: Sequelize.STRING,
                allowNull: true
            });

            console.log('✅ deviceModel column added successfully');
        } else {
            console.log('✅ deviceModel column already exists');
        }
    } catch (error) {
        console.error('❌ Migration error:', error.message);
        // Don't throw - let the app continue even if migration fails
    }
}

module.exports = { addDeviceModelColumn };
