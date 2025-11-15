const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

/**
 * DeviceShare Model
 *
 * Purpose: Audit trail for device sharing consent
 * Records when athlete consents to share device data with coach
 * Tracks revocation for compliance (GDPR, privacy)
 *
 * Lifecycle:
 * 1. Athlete accepts invite with devices → DeviceShare record created
 * 2. Athlete revokes access → DeviceShare.revokedAt set
 * 3. Optional: Set expires_at for time-limited sharing
 */
const DeviceShare = sequelize.define('DeviceShare', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    athleteId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'athlete_id',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    coachId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'coach_id',
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    deviceId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'device_id',
        references: {
            model: 'oauth_tokens',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    consentAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        field: 'consent_at'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'expires_at'
    },
    revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'revoked_at'
    }
}, {
    tableName: 'device_shares',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            // Critical index for permission checks
            fields: ['athlete_id', 'coach_id', 'revoked_at']
        },
        {
            fields: ['device_id']
        },
        {
            fields: ['coach_id', 'revoked_at']
        }
    ]
});

// Instance methods
DeviceShare.prototype.isActive = function() {
    if (this.revokedAt) return false;
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    return true;
};

DeviceShare.prototype.isRevoked = function() {
    return !!this.revokedAt;
};

DeviceShare.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
};

DeviceShare.prototype.revoke = async function() {
    this.revokedAt = new Date();
    return await this.save();
};

module.exports = DeviceShare;
