const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');
const User = require('./User');

const DailyMetric = sequelize.define('DailyMetric', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },

    // Athlytx scores
    athlytxScore: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    recoveryComponent: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sleepComponent: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    strainComponent: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    // Key vitals
    hrvAvg: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    restingHr: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sleepHours: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    sleepQuality: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    // Activity summary
    trainingLoad: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    activeCalories: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    steps: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    // Garmin-specific health metrics
    totalKilocalories: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total calories burned (active + BMR)'
    },
    bmrKilocalories: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Basal metabolic rate calories'
    },
    minHeartRate: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    maxHeartRate: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    averageStressLevel: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Average stress level (0-100)'
    },
    maxStressLevel: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maximum stress level (0-100)'
    },
    restStressDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time in rest/recovery state (seconds)'
    },
    activityStressDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time in activity stress state (seconds)'
    },
    lowStressDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time in low stress state (seconds)'
    },
    mediumStressDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time in medium stress state (seconds)'
    },
    highStressDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Time in high stress state (seconds)'
    },
    sleepingSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total sleep duration in seconds'
    },
    moderateIntensityMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Minutes of moderate intensity activity'
    },
    vigorousIntensityMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Minutes of vigorous intensity activity'
    },
    floorsAscended: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    floorsDescended: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    distanceMeters: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Total distance traveled in meters'
    },
    bodyBatteryChargedValue: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Body Battery gained (Garmin metric)'
    },
    bodyBatteryDrainedValue: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Body Battery lost (Garmin metric)'
    },
    bodyBatteryHighestValue: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Highest Body Battery level (0-100)'
    },
    bodyBatteryLowestValue: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Lowest Body Battery level (0-100)'
    },
    avgWakingRespirationValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Average waking respiration rate (breaths/min)'
    },
    highestRespirationValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Highest respiration rate (breaths/min)'
    },
    lowestRespirationValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Lowest respiration rate (breaths/min)'
    },
    avgSleepRespirationValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Average sleep respiration rate (breaths/min)'
    },
    abnormalRespirationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Seconds of abnormal respiration patterns'
    },

    // Metadata
    dataSources: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Which providers contributed data: {strava: true, oura: true, ...}'
    },
    syncStatus: {
        type: DataTypes.ENUM('pending', 'synced', 'failed'),
        defaultValue: 'pending'
    },
    syncedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'daily_metrics',
    indexes: [
        {
            unique: true,
            fields: ['userId', 'date']
        },
        {
            fields: ['userId', 'date']
        }
    ]
});

// Define relationships
User.hasMany(DailyMetric, { foreignKey: 'userId', as: 'dailyMetrics' });
DailyMetric.belongsTo(User, { foreignKey: 'userId' });

module.exports = DailyMetric;
