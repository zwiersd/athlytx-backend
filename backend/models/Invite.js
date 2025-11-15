const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

/**
 * Invite Model
 *
 * Purpose: Track pending invitations from coaches to athletes
 * Separate from CoachAthlete (which tracks active relationships)
 *
 * Lifecycle:
 * 1. Coach sends invite → Invite record created (status: pending)
 * 2. Athlete accepts → Invite.acceptedAt set, CoachAthlete.status = 'active'
 * 3. Coach revokes → Invite.revokedAt set
 * 4. Invite expires → expiresAt < NOW()
 */
const Invite = sequelize.define('Invite', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
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
    athleteEmail: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'athlete_email',
        validate: {
            isEmail: true
        }
    },
    inviteToken: {
        type: DataTypes.UUID,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        field: 'invite_token'
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    roleRequested: {
        type: DataTypes.ENUM('primary', 'assistant', 'viewer'),
        defaultValue: 'primary',
        allowNull: false,
        field: 'role_requested'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
    },
    acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'accepted_at'
    },
    revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'revoked_at'
    }
}, {
    tableName: 'invites',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['invite_token']
        },
        {
            fields: ['athlete_email', 'accepted_at']
        },
        {
            fields: ['coach_id']
        }
    ]
});

// Instance methods
Invite.prototype.isExpired = function() {
    return new Date() > this.expiresAt;
};

Invite.prototype.isPending = function() {
    return !this.acceptedAt && !this.revokedAt && !this.isExpired();
};

Invite.prototype.isAccepted = function() {
    return !!this.acceptedAt;
};

Invite.prototype.isRevoked = function() {
    return !!this.revokedAt;
};

module.exports = Invite;
