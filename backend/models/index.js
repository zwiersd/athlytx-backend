const sequelize = require('../utils/database');
const User = require('./User');
const MagicLink = require('./MagicLink');
const OAuthToken = require('./OAuthToken');
const CoachAthlete = require('./CoachAthlete');
const DailyMetric = require('./DailyMetric');
const Activity = require('./Activity');
const HeartRateZone = require('./HeartRateZone');
const PowerZone = require('./PowerZone');
const TrainingSummary = require('./TrainingSummary');
// New models for invite system
const Invite = require('./Invite');
const DeviceShare = require('./DeviceShare');
// API logging model
const APILog = require('./APILog');

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

// Invite relationships
User.hasMany(Invite, { as: 'SentInvites', foreignKey: 'coachId' });
Invite.belongsTo(User, { as: 'Coach', foreignKey: 'coachId' });

// DeviceShare relationships
User.hasMany(DeviceShare, { as: 'SharedDevicesAsAthlete', foreignKey: 'athleteId' });
User.hasMany(DeviceShare, { as: 'SharedDevicesAsCoach', foreignKey: 'coachId' });
OAuthToken.hasMany(DeviceShare, { as: 'Shares', foreignKey: 'deviceId' });
DeviceShare.belongsTo(User, { as: 'Athlete', foreignKey: 'athleteId' });
DeviceShare.belongsTo(User, { as: 'Coach', foreignKey: 'coachId' });
DeviceShare.belongsTo(OAuthToken, { as: 'Device', foreignKey: 'deviceId' });

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

        // Add missing columns to magic_links table (separate statements for PostgreSQL)
        try {
            await sequelize.query(`ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS "userId" UUID;`);
            console.log('✅ Added userId column');
        } catch (e) { console.warn('userId column:', e.message); }

        try {
            await sequelize.query(`ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS code VARCHAR(255);`);
            console.log('✅ Added code column');
        } catch (e) { console.warn('code column:', e.message); }

        try {
            await sequelize.query(`ALTER TABLE magic_links ADD COLUMN IF NOT EXISTS used BOOLEAN DEFAULT false;`);
            console.log('✅ Added used column');
        } catch (e) { console.warn('used column:', e.message); }

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
            await PowerZone.sync();
            await TrainingSummary.sync();
            // New models for invite system
            await Invite.sync();
            await DeviceShare.sync();
            // API logging model
            await APILog.sync();
            console.log('✅ Database models synchronized');
        } catch (syncError) {
            console.warn('⚠️  Some sync issues, continuing anyway:', syncError.message);
        }

        // Run migrations (existing)
        try {
            const { addDeviceModelColumn } = require('../migrations/add-device-model');
            await addDeviceModelColumn(sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration warning:', migrationError.message);
        }

        try {
            const { addCoachAthleteOnboardingFields } = require('../migrations/add-coach-athlete-onboarding-fields');
            await addCoachAthleteOnboardingFields(sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration warning:', migrationError.message);
        }

        // Run new migrations for invite system
        console.log('🔄 Running new invite system migrations...');

        try {
            const { createInvitesTable } = require('../migrations/001-create-invites-table');
            await createInvitesTable(sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration 001 warning:', migrationError.message);
        }

        try {
            const { createDeviceSharesTable } = require('../migrations/002-create-device-shares-table');
            await createDeviceSharesTable(sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration 002 warning:', migrationError.message);
        }

        try {
            const { addDeviceSharingColumns } = require('../migrations/003-add-device-sharing-columns');
            await addDeviceSharingColumns(sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration 003 warning:', migrationError.message);
        }

        try {
            const { addPerformanceIndexes } = require('../migrations/004-add-performance-indexes');
            await addPerformanceIndexes(sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration 004 warning:', migrationError.message);
        }

        try {
            const { backfillDeviceShares } = require('../migrations/005-backfill-device-shares');
            await backfillDeviceShares(sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration 005 warning:', migrationError.message);
        }

        try {
            const { migratePendingInvites } = require('../migrations/006-migrate-pending-invites');
            await migratePendingInvites(sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration 006 warning:', migrationError.message);
        }

        try {
            const createAPILogsTable = require('../migrations/007-create-api-logs-table');
            await createAPILogsTable(sequelize.getQueryInterface(), sequelize.Sequelize);
        } catch (migrationError) {
            console.warn('⚠️  Migration 007 warning:', migrationError.message);
        }

        console.log('✅ All migrations complete!');

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
    PowerZone,
    TrainingSummary,
    // New models for invite system
    Invite,
    DeviceShare,
    // API logging model
    APILog,
    initializeDatabase
};
