const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');
const User = require('./User');

const CoachAthlete = sequelize.define('CoachAthlete', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    coachId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    athleteId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    inviteToken: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    invitedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'coach_athletes',
    indexes: [
        {
            unique: true,
            fields: ['coachId', 'athleteId']
        }
    ]
});

// Define relationships
User.hasMany(CoachAthlete, { foreignKey: 'coachId', as: 'athletes' });
User.hasMany(CoachAthlete, { foreignKey: 'athleteId', as: 'coaches' });
CoachAthlete.belongsTo(User, { foreignKey: 'coachId', as: 'coach' });
CoachAthlete.belongsTo(User, { foreignKey: 'athleteId', as: 'athlete' });

module.exports = CoachAthlete;
