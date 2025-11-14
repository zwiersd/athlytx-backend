const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');
const User = require('./User');
const Activity = require('./Activity');

const PowerZone = sequelize.define('PowerZone', {
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

    // FTP (Functional Threshold Power) - basis for zone calculations
    ftpWatts: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Functional Threshold Power in watts'
    },

    // Time in each power zone (seconds)
    zone1Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Active Recovery: <55% FTP'
    },
    zone2Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Endurance: 56-75% FTP'
    },
    zone3Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Tempo: 76-90% FTP'
    },
    zone4Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Lactate Threshold: 91-105% FTP'
    },
    zone5Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'VO2 Max: 106-120% FTP'
    },
    zone6Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Anaerobic Capacity: 121-150% FTP'
    },
    zone7Seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Neuromuscular Power: >150% FTP'
    },

    // Power metrics
    avgPower: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Average power output in watts'
    },
    normalizedPower: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Normalized power (weighted average)'
    },
    maxPower: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maximum power output in watts'
    },

    // Training metrics based on power
    intensityFactor: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Intensity Factor (NP/FTP)'
    },
    tss: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Training Stress Score'
    },
    variabilityIndex: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Variability Index (NP/AP)'
    },

    // Activity context
    activityType: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Type of activity (cycling, running, etc)'
    },
    durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total duration of activity'
    },
    distanceMeters: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Distance covered in meters'
    },
    elevationGainMeters: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Total elevation gain in meters'
    },

    // Energy system contribution (based on Matt Roberts' notes)
    atpPcSystem: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'ATP-PC system contribution percentage (zones 6-7)'
    },
    glycolyticSystem: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Glycolytic system contribution percentage (zones 4-5)'
    },
    aerobicSystem: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Aerobic system contribution percentage (zones 1-3)'
    },

    // Data source
    provider: {
        type: DataTypes.ENUM('garmin', 'strava', 'zwift', 'wahoo'),
        allowNull: false,
        comment: 'Which API provided this data'
    }
}, {
    timestamps: true,
    tableName: 'power_zones',
    indexes: [
        {
            fields: ['userId', 'date']
        },
        {
            fields: ['activityId']
        },
        {
            fields: ['userId', 'activityType']
        }
    ]
});

// Define relationships
User.hasMany(PowerZone, { foreignKey: 'userId', as: 'powerZones' });
PowerZone.belongsTo(User, { foreignKey: 'userId' });

Activity.hasOne(PowerZone, { foreignKey: 'activityId', as: 'powerData' });
PowerZone.belongsTo(Activity, { foreignKey: 'activityId' });

module.exports = PowerZone;