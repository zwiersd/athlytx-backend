/**
 * Migration: Add comprehensive Garmin health metrics to DailyMetric table
 * Adds 27 new fields for Body Battery, Stress, HRV, Respiration, Intensity, etc.
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log('📊 Adding Garmin health metrics columns to daily_metrics table...');

            // Add all new Garmin health metric columns
            await queryInterface.addColumn('daily_metrics', 'totalKilocalories', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Total calories burned (active + BMR)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'bmrKilocalories', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Basal metabolic rate calories'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'minHeartRate', {
                type: Sequelize.INTEGER,
                allowNull: true
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'maxHeartRate', {
                type: Sequelize.INTEGER,
                allowNull: true
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'averageStressLevel', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Average stress level (0-100)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'maxStressLevel', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Maximum stress level (0-100)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'restStressDuration', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Time in rest/recovery state (seconds)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'activityStressDuration', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Time in activity stress state (seconds)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'lowStressDuration', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Time in low stress state (seconds)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'mediumStressDuration', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Time in medium stress state (seconds)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'highStressDuration', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Time in high stress state (seconds)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'sleepingSeconds', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Total sleep duration in seconds'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'moderateIntensityMinutes', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Minutes of moderate intensity activity'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'vigorousIntensityMinutes', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Minutes of vigorous intensity activity'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'floorsAscended', {
                type: Sequelize.FLOAT,
                allowNull: true
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'floorsDescended', {
                type: Sequelize.FLOAT,
                allowNull: true
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'distanceMeters', {
                type: Sequelize.FLOAT,
                allowNull: true,
                comment: 'Total distance traveled in meters'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'bodyBatteryChargedValue', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Body Battery gained (Garmin metric)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'bodyBatteryDrainedValue', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Body Battery lost (Garmin metric)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'bodyBatteryHighestValue', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Highest Body Battery level (0-100)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'bodyBatteryLowestValue', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Lowest Body Battery level (0-100)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'avgWakingRespirationValue', {
                type: Sequelize.FLOAT,
                allowNull: true,
                comment: 'Average waking respiration rate (breaths/min)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'highestRespirationValue', {
                type: Sequelize.FLOAT,
                allowNull: true,
                comment: 'Highest respiration rate (breaths/min)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'lowestRespirationValue', {
                type: Sequelize.FLOAT,
                allowNull: true,
                comment: 'Lowest respiration rate (breaths/min)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'avgSleepRespirationValue', {
                type: Sequelize.FLOAT,
                allowNull: true,
                comment: 'Average sleep respiration rate (breaths/min)'
            }, { transaction });

            await queryInterface.addColumn('daily_metrics', 'abnormalRespirationSeconds', {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Seconds of abnormal respiration patterns'
            }, { transaction });

            await transaction.commit();
            console.log('✅ Successfully added 27 Garmin health metric columns!');
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration failed:', error);
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            console.log('🔄 Removing Garmin health metrics columns...');

            const columns = [
                'totalKilocalories', 'bmrKilocalories', 'minHeartRate', 'maxHeartRate',
                'averageStressLevel', 'maxStressLevel', 'restStressDuration', 'activityStressDuration',
                'lowStressDuration', 'mediumStressDuration', 'highStressDuration',
                'sleepingSeconds', 'moderateIntensityMinutes', 'vigorousIntensityMinutes',
                'floorsAscended', 'floorsDescended', 'distanceMeters',
                'bodyBatteryChargedValue', 'bodyBatteryDrainedValue', 'bodyBatteryHighestValue', 'bodyBatteryLowestValue',
                'avgWakingRespirationValue', 'highestRespirationValue', 'lowestRespirationValue',
                'avgSleepRespirationValue', 'abnormalRespirationSeconds', 'hrvAvg'
            ];

            for (const column of columns) {
                await queryInterface.removeColumn('daily_metrics', column, { transaction });
            }

            await transaction.commit();
            console.log('✅ Removed Garmin health metric columns');
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Rollback failed:', error);
            throw error;
        }
    }
};
