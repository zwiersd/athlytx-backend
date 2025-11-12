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

        // Add missing columns to users table if they don't exist
        try {
            await sequelize.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS "sessionToken" VARCHAR(255),
                ADD COLUMN IF NOT EXISTS "sessionExpiry" TIMESTAMP WITH TIME ZONE;
            `);
            console.log('✅ User table columns checked/added');
        } catch (alterError) {
            console.warn('⚠️  User table alter warning (may already exist):', alterError.message);
        }

        // Create magic_links table if it doesn't exist
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS magic_links (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    "userId" UUID,
                    email VARCHAR(255) NOT NULL,
                    token VARCHAR(255) NOT NULL UNIQUE,
                    code VARCHAR(255),
                    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                    used BOOLEAN DEFAULT false,
                    "usedAt" TIMESTAMP WITH TIME ZONE,
                    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            `);
            console.log('✅ magic_links table checked/created');
        } catch (tableError) {
            console.warn('⚠️  magic_links table warning (may already exist):', tableError.message);
        }

        // Create coach_athletes table if it doesn't exist
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS coach_athletes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    "coachId" UUID NOT NULL,
                    "athleteId" UUID NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    "invitedAt" TIMESTAMP WITH TIME ZONE,
                    "acceptedAt" TIMESTAMP WITH TIME ZONE,
                    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    UNIQUE("coachId", "athleteId")
                );
            `);
            console.log('✅ coach_athletes table checked/created');
        } catch (tableError) {
            console.warn('⚠️  coach_athletes table warning (may already exist):', tableError.message);
        }

        // Sync models individually - create tables if they don't exist
        try {
            await User.sync();
            await MagicLink.sync();
            await OAuthToken.sync();
            await CoachAthlete.sync();
            await DailyMetric.sync();
            await Activity.sync();
            await HeartRateZone.sync();
            await TrainingSummary.sync();
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
