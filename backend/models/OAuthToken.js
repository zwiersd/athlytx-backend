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
    },
    // New columns for device sharing
    shareWithCoaches: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        field: 'share_with_coaches'
    },
    providerUserId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'provider_user_id'
    },
    scopes: {
        type: sequelize.getDialect() === 'postgres' ? DataTypes.JSONB : DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'oauth_tokens',
    indexes: [
        {
            unique: true,
            fields: ['userId', 'provider']
        },
        {
            fields: ['userId', 'provider', 'share_with_coaches']
        }
    ]
});

// Define relationships
User.hasMany(OAuthToken, { foreignKey: 'userId', as: 'tokens' });
OAuthToken.belongsTo(User, { foreignKey: 'userId' });

module.exports = OAuthToken;
