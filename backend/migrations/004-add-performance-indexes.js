const { Sequelize } = require('sequelize');
const { logMigrationEvent } = require('../utils/logger');

/**
 * Migration 004: Add Performance Indexes
 *
 * Purpose: Optimize frequent queries
 * Adds indexes to coach_athletes table for:
 * - Permission checks (status + coach_id + athlete_id)
 * - Pending invite lookups (status + invite_token)
 */
async function addPerformanceIndexes(sequelize) {
    const queryInterface = sequelize.getQueryInterface();

    try {
        console.log('[*] [MIGRATION-004] Adding performance indexes to coach_athletes...');
        logMigrationEvent('START', { migration: '004-add-performance-indexes' });

        let indexesAdded = 0;

        // Index for permission checks (frequently used query)
        try {
            console.log('  [*] Creating idx_coach_athlete_status_lookup...');
            await queryInterface.addIndex('coach_athletes', ['status', 'coachId', 'athleteId'], {
                name: 'idx_coach_athlete_status_lookup'
            });
            indexesAdded++;
            console.log('  [✓] idx_coach_athlete_status_lookup created');
        } catch (error) {
            console.log('  [i]  idx_coach_athlete_status_lookup may already exist');
        }

        // Index for finding pending invites by token
        try {
            console.log('  [*] Creating idx_coach_athlete_pending...');
            await queryInterface.addIndex('coach_athletes', ['status', 'inviteToken'], {
                name: 'idx_coach_athlete_pending'
            });
            indexesAdded++;
            console.log('  [✓] idx_coach_athlete_pending created');
        } catch (error) {
            console.log('  [i]  idx_coach_athlete_pending may already exist');
        }

        // Index for coach's active relationships (dashboard queries)
        try {
            console.log('  [*] Creating idx_coach_active_athletes...');
            await queryInterface.addIndex('coach_athletes', ['coachId', 'status'], {
                name: 'idx_coach_active_athletes'
            });
            indexesAdded++;
            console.log('  [✓] idx_coach_active_athletes created');
        } catch (error) {
            console.log('  [i]  idx_coach_active_athletes may already exist');
        }

        console.log(`[✓] [MIGRATION-004] Complete (${indexesAdded} indexes attempted)`);
        logMigrationEvent('COMPLETE', {
            migration: '004-add-performance-indexes',
            indexesAttempted: 3,
            indexesCreated: indexesAdded
        });

    } catch (error) {
        console.error('[✗] [MIGRATION-004] Error:', error.message);
        logMigrationEvent('ERROR', {
            migration: '004-add-performance-indexes',
            error: error.message
        });
        // Don't throw - let the app continue
    }
}

module.exports = { addPerformanceIndexes };
