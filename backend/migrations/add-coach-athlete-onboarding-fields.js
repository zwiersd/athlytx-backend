const { Sequelize } = require('sequelize');

/**
 * Migration to add new fields for coach-athlete invitations and athlete onboarding
 * This will run automatically on server startup
 */
async function addCoachAthleteOnboardingFields(sequelize) {
    const queryInterface = sequelize.getQueryInterface();

    try {
        // Add fields to coach_athletes table
        console.log('📝 Checking coach_athletes table for new fields...');
        const coachAthleteTable = await queryInterface.describeTable('coach_athletes');

        if (!coachAthleteTable.status) {
            console.log('Adding status column to coach_athletes...');
            await queryInterface.addColumn('coach_athletes', 'status', {
                type: Sequelize.ENUM('pending', 'active', 'revoked', 'cancelled'),
                defaultValue: 'pending',
                allowNull: false
            });
        }

        if (!coachAthleteTable.inviteMessage) {
            console.log('Adding inviteMessage column to coach_athletes...');
            await queryInterface.addColumn('coach_athletes', 'inviteMessage', {
                type: Sequelize.TEXT,
                allowNull: true
            });
        }

        if (!coachAthleteTable.expiresAt) {
            console.log('Adding expiresAt column to coach_athletes...');
            await queryInterface.addColumn('coach_athletes', 'expiresAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!coachAthleteTable.revokedAt) {
            console.log('Adding revokedAt column to coach_athletes...');
            await queryInterface.addColumn('coach_athletes', 'revokedAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        if (!coachAthleteTable.revokedBy) {
            console.log('Adding revokedBy column to coach_athletes...');
            await queryInterface.addColumn('coach_athletes', 'revokedBy', {
                type: Sequelize.UUID,
                allowNull: true
            });
        }

        console.log('✅ coach_athletes table migration complete');

        // Add fields to users table
        console.log('📝 Checking users table for new fields...');
        const usersTable = await queryInterface.describeTable('users');

        if (!usersTable.onboarded) {
            console.log('Adding onboarded column to users...');
            await queryInterface.addColumn('users', 'onboarded', {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false
            });
        }

        if (!usersTable.dateOfBirth) {
            console.log('Adding dateOfBirth column to users...');
            await queryInterface.addColumn('users', 'dateOfBirth', {
                type: Sequelize.DATEONLY,
                allowNull: true
            });
        }

        if (!usersTable.sport) {
            console.log('Adding sport column to users...');
            await queryInterface.addColumn('users', 'sport', {
                type: Sequelize.STRING,
                allowNull: true
            });
        }

        console.log('✅ users table migration complete');

        // Add fields to oauth_tokens table
        console.log('📝 Checking oauth_tokens table for new fields...');
        const oauthTokensTable = await queryInterface.describeTable('oauth_tokens');

        if (!oauthTokensTable.connectedAt) {
            console.log('Adding connectedAt column to oauth_tokens...');
            await queryInterface.addColumn('oauth_tokens', 'connectedAt', {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                allowNull: false
            });
        }

        if (!oauthTokensTable.lastSyncAt) {
            console.log('Adding lastSyncAt column to oauth_tokens...');
            await queryInterface.addColumn('oauth_tokens', 'lastSyncAt', {
                type: Sequelize.DATE,
                allowNull: true
            });
        }

        console.log('✅ oauth_tokens table migration complete');

        // Update existing records with appropriate defaults
        console.log('📝 Updating existing records...');

        // Set status to 'active' for existing relationships that have been accepted
        await queryInterface.sequelize.query(`
            UPDATE coach_athletes
            SET status = 'active'
            WHERE "acceptedAt" IS NOT NULL AND status = 'pending'
        `);

        console.log('✅ All migrations completed successfully');

    } catch (error) {
        console.error('❌ Migration error:', error.message);
        // Don't throw - let the app continue even if migration fails
    }
}

module.exports = { addCoachAthleteOnboardingFields };
