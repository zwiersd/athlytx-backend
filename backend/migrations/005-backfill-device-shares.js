const { Sequelize } = require('sequelize');
const { logMigrationEvent } = require('../utils/logger');

/**
 * Migration 005: Backfill DeviceShares for Existing Relationships
 *
 * [!] CRITICAL MIGRATION [!]
 *
 * Purpose: Ensure existing coach-athlete relationships work with new system
 * For each ACTIVE CoachAthlete relationship:
 * - Find all athlete's devices (oauth_tokens)
 * - Create DeviceShare record for each device
 * - Set oauth_tokens.share_with_coaches = true
 *
 * This prevents existing coaches from losing access when feature flag is enabled
 */
async function backfillDeviceShares(sequelize) {
    try {
        console.log('[*] [MIGRATION-005] Starting DeviceShares backfill...');
        logMigrationEvent('START', { migration: '005-backfill-device-shares' });

        // Check if we should skip (detect if already run)
        const [existingShares] = await sequelize.query(`
            SELECT COUNT(*) as count FROM device_shares
        `);

        if (existingShares[0].count > 0) {
            console.log(`[✓] [MIGRATION-005] DeviceShares already backfilled (${existingShares[0].count} records exist)`);
            logMigrationEvent('SKIPPED', {
                migration: '005-backfill-device-shares',
                reason: 'DeviceShares already exist',
                existingCount: existingShares[0].count
            });
            return;
        }

        // Find all ACTIVE coach-athlete relationships
        const [relationships] = await sequelize.query(`
            SELECT id, "coachId", "athleteId", "acceptedAt", "createdAt"
            FROM coach_athletes
            WHERE status = 'active'
        `);

        console.log(`📊 [MIGRATION-005] Found ${relationships.length} active relationships to backfill`);

        let totalDeviceSharesCreated = 0;
        let athletesProcessed = 0;
        let errors = 0;

        for (const rel of relationships) {
            try {
                console.log(`  [*] Processing relationship: Coach ${rel.coachId.substring(0, 8)}... → Athlete ${rel.athleteId.substring(0, 8)}...`);

                // Find all devices for this athlete
                const [devices] = await sequelize.query(`
                    SELECT id FROM oauth_tokens WHERE "userId" = :athleteId
                `, {
                    replacements: { athleteId: rel.athleteId }
                });

                if (devices.length === 0) {
                    console.log(`    [i]  Athlete has no devices - skipping`);
                    athletesProcessed++;
                    continue;
                }

                console.log(`    📊 Found ${devices.length} devices for athlete`);

                // Create DeviceShare for each device
                for (const device of devices) {
                    const consentDate = rel.acceptedAt || rel.createdAt;

                    // Use raw SQL to avoid model dependency
                    await sequelize.query(`
                        INSERT INTO device_shares (id, athlete_id, coach_id, device_id, consent_at, created_at, updated_at)
                        VALUES (gen_random_uuid(), :athleteId, :coachId, :deviceId, :consentAt, NOW(), NOW())
                        ON CONFLICT DO NOTHING
                    `, {
                        replacements: {
                            athleteId: rel.athleteId,
                            coachId: rel.coachId,
                            deviceId: device.id,
                            consentAt: consentDate
                        }
                    });

                    totalDeviceSharesCreated++;
                }

                // Set share_with_coaches = true for all athlete's devices
                await sequelize.query(`
                    UPDATE oauth_tokens
                    SET share_with_coaches = true
                    WHERE "userId" = :athleteId
                `, {
                    replacements: { athleteId: rel.athleteId }
                });

                athletesProcessed++;
                console.log(`    [✓] Created ${devices.length} device shares`);

            } catch (relError) {
                errors++;
                console.error(`    [✗] Error processing relationship:`, relError.message);
                logMigrationEvent('BACKFILL_ERROR', {
                    migration: '005-backfill-device-shares',
                    relationshipId: rel.id,
                    error: relError.message
                });
                // Continue with next relationship
            }
        }

        console.log('[✓] [MIGRATION-005] Backfill complete!');
        console.log(`📊 Statistics:`);
        console.log(`   - Relationships processed: ${athletesProcessed}/${relationships.length}`);
        console.log(`   - DeviceShares created: ${totalDeviceSharesCreated}`);
        console.log(`   - Errors: ${errors}`);

        logMigrationEvent('COMPLETE', {
            migration: '005-backfill-device-shares',
            relationshipsProcessed: athletesProcessed,
            relationshipsTotal: relationships.length,
            deviceSharesCreated: totalDeviceSharesCreated,
            errors
        });

    } catch (error) {
        console.error('[✗] [MIGRATION-005] Critical error:', error.message);
        console.error(error.stack);
        logMigrationEvent('ERROR', {
            migration: '005-backfill-device-shares',
            error: error.message,
            stack: error.stack
        });
        // Don't throw - let the app continue (but log prominently)
        console.error('[!]  [MIGRATION-005] Backfill failed - existing relationships may not work with new system!');
    }
}

module.exports = { backfillDeviceShares };
