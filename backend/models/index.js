const sequelize = require('../utils/database');
const User = require('./User');
const MagicLink = require('./MagicLink');
const OAuthToken = require('./OAuthToken');
const CoachAthlete = require('./CoachAthlete');
const DailyMetric = require('./DailyMetric');
const Activity = require('./Activity');
const HeartRateZone = require('./HeartRateZone');
const TrainingSummary = require('./TrainingSummary');

// Define associations - temporarily commented to fix deployment
// TODO: Re-enable after fixing circular dependencies
/*
User.hasMany(MagicLink, { foreignKey: 'userId' });
MagicLink.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(OAuthToken, { foreignKey: 'userId' });
OAuthToken.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Activity, { foreignKey: 'userId' });
Activity.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(DailyMetric, { foreignKey: 'userId' });
DailyMetric.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(TrainingSummary, { foreignKey: 'userId' });
TrainingSummary.belongsTo(User, { foreignKey: 'userId' });

// Coach-Athlete relationships
User.hasMany(CoachAthlete, { as: 'CoachingRelationships', foreignKey: 'coachId' });
User.hasMany(CoachAthlete, { as: 'AthleteRelationships', foreignKey: 'athleteId' });
CoachAthlete.belongsTo(User, { as: 'coach', foreignKey: 'coachId' });
CoachAthlete.belongsTo(User, { as: 'athlete', foreignKey: 'athleteId' });
*/

// Initialize database and sync models
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful');

        // Sync models (create tables if they don't exist)
        // Use basic sync - don't alter in production
        await sequelize.sync();
        console.log('✅ Database models synchronized');

        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return false;
    }
}

module.exports = {
    sequelize,
    User,
    MagicLink,
    OAuthToken,
    CoachAthlete,
    DailyMetric,
    Activity,
    HeartRateZone,
    TrainingSummary,
    initializeDatabase
};
