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

        // Skip sync in production - tables already exist
        // This avoids index conflicts and migration issues
        if (process.env.NODE_ENV !== 'production') {
            try {
                await sequelize.sync({ force: false });
            } catch (syncError) {
                console.log('⚠️  Sync skipped:', syncError.message);
            }
        } else {
            console.log('⚠️  Sync skipped in production (tables exist)')
        }
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
