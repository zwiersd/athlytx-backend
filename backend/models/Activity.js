const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');
const User = require('./User');

const Activity = sequelize.define('Activity', {
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
    externalId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Provider\'s activity ID'
    },
    provider: {
        type: DataTypes.ENUM('strava', 'garmin', 'whoop', 'oura'),
        allowNull: false
    },

    // Activity details
    activityType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    activityName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    distanceMeters: {
        type: DataTypes.FLOAT,
        allowNull: true
    },

    // Intensity metrics
    calories: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    avgHr: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    maxHr: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    trainingLoad: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    intensityScore: {
        type: DataTypes.FLOAT,
        allowNull: true
    },

    // Device information
    deviceModel: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Device model name (e.g., "Garmin Forerunner 945", "Garmin Fenix 7")'
    },

    // Full data
    rawData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Full API response for detailed analysis'
    }
}, {
    timestamps: true,
    tableName: 'activities',
    indexes: [
        {
            unique: true,
            fields: ['userId', 'provider', 'externalId']
        },
        {
            fields: ['userId', 'startTime']
        }
    ]
});

// Define relationships
User.hasMany(Activity, { foreignKey: 'userId', as: 'activities' });
Activity.belongsTo(User, { foreignKey: 'userId' });

module.exports = Activity;
