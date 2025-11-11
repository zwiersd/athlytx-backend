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
