const { Sequelize } = require('sequelize');
const { logMigrationEvent } = require('../utils/logger');

/**
 * Migration 006: Migrate Pending Invites
 *
 * Purpose: Move pending invitations from coach_athletes to invites table
 * For each PENDING CoachAthlete relationship:
 * - Get athlete email from users table
 * - Create Invite record
 * - Keep CoachAthlete record (will be activated on acceptance)
 */
async function migratePendingInvites(sequelize) {
    try {
        console.log('📝 [MIGRATION-006] Starting pending invites migration...');
        logMigrationEvent('START', { migration: '006-migrate-pending-invites' });

        // Check if we should skip (detect if already run)
        const [existingInvites] = await sequelize.query(`
            SELECT COUNT(*) as count FROM invites
        `);

        if (existingInvites[0].count > 0) {
            console.log(`✅ [MIGRATION-006] Invites already migrated (${existingInvites[0].count} records exist)`);
            logMigrationEvent('SKIPPED', {
                migration: '006-migrate-pending-invites',
                reason: 'Invites already exist',
                existingCount: existingInvites[0].count
            });
            return;
        }

        // Find all PENDING coach-athlete relationships
        const [pending] = await sequelize.query(`
            SELECT
                ca.id,
                ca."coachId",
                ca."athleteId",
                ca."inviteToken",
                ca."expiresAt",
                ca."inviteMessage",
                ca."invitedAt",
                ca."createdAt",
                u.email as athlete_email
            FROM coach_athletes ca
            JOIN users u ON ca."athleteId" = u.id
            WHERE ca.status = 'pending'
        `);

        console.log(`📊 [MIGRATION-006] Found ${pending.length} pending invites to migrate`);

        let invitesCreated = 0;
        let errors = 0;

        for (const inv of pending) {
            try {
                if (!inv.athlete_email) {
                    console.log(`    ⚠️  Skipping orphaned invite: athlete ${inv.athleteId} not found`);
                    continue;
                }

                // Ensure expiry date exists (default 24 hours from now if missing)
                const expiresAt = inv.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
                const createdAt = inv.invitedAt || inv.createdAt || new Date();

                console.log(`  📝 Migrating invite: ${inv.athlete_email}`);

                // Create Invite record
                await sequelize.query(`
                    INSERT INTO invites (
                        id,
                        coach_id,
                        athlete_email,
                        invite_token,
                        message,
                        role_requested,
                        expires_at,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        gen_random_uuid(),
                        :coachId,
                        :email,
                        :token,
                        :message,
                        'primary',
                        :expiresAt,
                        :createdAt,
                        NOW()
                    )
                    ON CONFLICT (invite_token) DO NOTHING
                `, {
                    replacements: {
                        coachId: inv.coachId,
                        email: inv.athlete_email.toLowerCase().trim(),
                        token: inv.inviteToken,
                        message: inv.inviteMessage,
                        expiresAt,
                        createdAt
                    }
                });

                invitesCreated++;
                console.log(`    ✅ Invite migrated`);

            } catch (invError) {
                errors++;
                console.error(`    ❌ Error migrating invite:`, invError.message);
                logMigrationEvent('MIGRATE_ERROR', {
                    migration: '006-migrate-pending-invites',
                    inviteId: inv.id,
                    athleteEmail: inv.athlete_email,
                    error: invError.message
                });
                // Continue with next invite
            }
        }

        console.log('✅ [MIGRATION-006] Migration complete!');
        console.log(`📊 Statistics:`);
        console.log(`   - Invites migrated: ${invitesCreated}/${pending.length}`);
        console.log(`   - Errors: ${errors}`);

        logMigrationEvent('COMPLETE', {
            migration: '006-migrate-pending-invites',
            invitesFound: pending.length,
            invitesCreated,
            errors
        });

    } catch (error) {
        console.error('❌ [MIGRATION-006] Critical error:', error.message);
        console.error(error.stack);
        logMigrationEvent('ERROR', {
            migration: '006-migrate-pending-invites',
            error: error.message,
            stack: error.stack
        });
        // Don't throw - let the app continue
        console.error('⚠️  [MIGRATION-006] Migration failed - pending invites may need manual migration!');
    }
}

module.exports = { migratePendingInvites };
