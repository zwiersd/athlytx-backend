const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');
const User = require('./User');
const Activity = require('./Activity');

const HeartRateZone = sequelize.define('HeartRateZone', {
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
    activityId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: Activity,
            key: 'id'
        }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },

    // Time in each zone (seconds)
    zone1Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Recovery: 0-121 bpm'
    },
    zone2Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Endurance: 122-151 bpm'
    },
    zone3Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Tempo: 152-166 bpm'
    },
    zone4Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Threshold: 167-180 bpm'
    },
    zone5Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Anaerobic: 181+ bpm'
    },

    // HR metrics
    avgHr: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Average heart rate for activity'
    },
    maxHr: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maximum heart rate reached'
    },
    restingHr: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Resting heart rate'
    },

    // Activity context
    activityType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Type of activity (running, cycling, etc)'
    },
    durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total duration of activity'
    },

    // Data source
    provider: {
        type: DataTypes.ENUM('garmin', 'oura', 'whoop', 'strava'),
        allowNull: false,
        comment: 'Which API provided this data'
    }
}, {
    timestamps: true,
    tableName: 'heart_rate_zones',
    indexes: [
        {
            fields: ['userId', 'date']
        },
        {
            fields: ['activityId']
        }
    ]
});

// Define relationships
User.hasMany(HeartRateZone, { foreignKey: 'userId', as: 'heartRateZones' });
HeartRateZone.belongsTo(User, { foreignKey: 'userId' });

Activity.hasOne(HeartRateZone, { foreignKey: 'activityId', as: 'zoneData' });
HeartRateZone.belongsTo(Activity, { foreignKey: 'activityId' });

module.exports = HeartRateZone;
