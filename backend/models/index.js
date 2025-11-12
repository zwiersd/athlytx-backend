const sequelize = require('../utils/database');
const User = require('./User');
const MagicLink = require('./MagicLink');
const OAuthToken = require('./OAuthToken');
const CoachAthlete = require('./CoachAthlete');
const DailyMetric = require('./DailyMetric');
const Activity = require('./Activity');
const HeartRateZone = require('./HeartRateZone');
const TrainingSummary = require('./TrainingSummary');

// Define associations
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

// Coach-Athlete relationships - Fixed: using unique aliases
User.hasMany(CoachAthlete, { as: 'CoachingRelationships', foreignKey: 'coachId' });
User.hasMany(CoachAthlete, { as: 'AthleteRelationships', foreignKey: 'athleteId' });
CoachAthlete.belongsTo(User, { as: 'Coach', foreignKey: 'coachId' }); // Changed from 'coach' to 'Coach'
CoachAthlete.belongsTo(User, { as: 'Athlete', foreignKey: 'athleteId' }); // Changed from 'athlete' to 'Athlete'

// Initialize database and sync models
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful');

        // Sync models individually
        try {
            // User table needs alter to add sessionToken/sessionExpiry columns
            await User.sync({ alter: true });
            console.log('✅ User table synced with schema updates');

            // Other tables - create if not exists, don't alter
            await MagicLink.sync({ alter: false });
            await OAuthToken.sync({ alter: false });
            await CoachAthlete.sync({ alter: false });
            await DailyMetric.sync({ alter: false });
            await Activity.sync({ alter: false });
            await HeartRateZone.sync({ alter: false });
            await TrainingSummary.sync({ alter: false });
            console.log('✅ Database models synchronized');
        } catch (syncError) {
            console.warn('⚠️  Some sync issues, continuing anyway:', syncError.message);
        }

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
