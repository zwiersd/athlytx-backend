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
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
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
    }
}, {
    timestamps: true,
    tableName: 'users'
});

module.exports = User;
