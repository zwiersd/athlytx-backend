const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true, // Allow null for guest users
        unique: true,
        validate: {
            isEmail: true
        }
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: true // Null for guest users
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isGuest: {
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Start as guest, become false when they sign up
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('athlete', 'coach'),
        defaultValue: 'athlete',
        allowNull: false
    },
    timezone: {
        type: DataTypes.STRING,
        defaultValue: 'UTC'
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
    },
    sessionToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sessionExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    onboarded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    sport: {
        type: DataTypes.STRING,
        allowNull: true
    },
    passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    passwordResetExpiry: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'users'
});

module.exports = User;
