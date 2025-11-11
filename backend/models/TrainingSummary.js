const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');
const User = require('./User');

const TrainingSummary = sequelize.define('TrainingSummary', {
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
    periodType: {
        type: DataTypes.ENUM('weekly', 'monthly'),
        allowNull: false,
        comment: 'Type of summary period'
    },
    periodStart: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Start date of summary period'
    },
    periodEnd: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'End date of summary period'
    },

    // Total time in zones (minutes)
    totalZone1Minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Recovery zone total'
    },
    totalZone2Minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Endurance zone total'
    },
    totalZone3Minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Tempo zone total'
    },
    totalZone4Minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Threshold zone total'
    },
    totalZone5Minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Anaerobic zone total'
    },

    // Summary metrics
    totalTrainingMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Total training time across all activities'
    },
    avgRestingHr: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Average resting HR for period'
    },
    totalActivities: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of activities in period'
    },

    // Training load
    trainingLoad: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Total training load/stress'
    },

    // Intensity distribution percentages
    zone1Percent: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    zone2Percent: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    zone3Percent: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    zone4Percent: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    zone5Percent: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'training_summaries',
    indexes: [
        {
            unique: true,
            fields: ['userId', 'periodType', 'periodStart']
        },
        {
            fields: ['userId', 'periodStart']
        }
    ]
});

// Define relationships
User.hasMany(TrainingSummary, { foreignKey: 'userId', as: 'trainingSummaries' });
TrainingSummary.belongsTo(User, { foreignKey: 'userId' });

module.exports = TrainingSummary;
