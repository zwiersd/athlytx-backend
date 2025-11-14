const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');
const User = require('./User');

const OAuthToken = sequelize.define('OAuthToken', {
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
    provider: {
        type: DataTypes.ENUM('strava', 'oura', 'garmin', 'whoop'),
        allowNull: false
    },
    accessTokenEncrypted: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    refreshTokenEncrypted: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    scope: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    connectedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    lastSyncAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'oauth_tokens',
    indexes: [
        {
            unique: true,
            fields: ['userId', 'provider']
        }
    ]
});

// Define relationships
User.hasMany(OAuthToken, { foreignKey: 'userId', as: 'tokens' });
OAuthToken.belongsTo(User, { foreignKey: 'userId' });

module.exports = OAuthToken;
