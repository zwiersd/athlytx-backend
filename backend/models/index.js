const sequelize = require('../utils/database');
const User = require('./User');
const MagicLink = require('./MagicLink');
const OAuthToken = require('./OAuthToken');
const CoachAthlete = require('./CoachAthlete');
const DailyMetric = require('./DailyMetric');
const Activity = require('./Activity');
const HeartRateZone = require('./HeartRateZone');
const TrainingSummary = require('./TrainingSummary');

// Initialize database and sync models
async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection successful');

        // Sync models (create tables if they don't exist)
        // Force sync on first deployment to create all tables
        await sequelize.sync({ force: false, alter: true });
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
