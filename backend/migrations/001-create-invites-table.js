const { Sequelize, DataTypes } = require('sequelize');
const { logMigrationEvent } = require('../utils/logger');

/**
 * Migration 001: Create Invites Table
 *
 * Purpose: Separate invitation tracking from CoachAthlete relationships
 * Allows pending invites to exist before relationships are created
 */
async function createInvitesTable(sequelize) {
    const queryInterface = sequelize.getQueryInterface();

    try {
        // Check if table already exists
        const tables = await queryInterface.showAllTables();

        if (tables.includes('invites')) {
            console.log('[✓] [MIGRATION-001] Invites table already exists');
            logMigrationEvent('SKIPPED', { migration: '001-create-invites-table', reason: 'Table exists' });
            return;
        }

        console.log('[*] [MIGRATION-001] Creating invites table...');
        logMigrationEvent('START', { migration: '001-create-invites-table' });

        // Create invites table
        await queryInterface.createTable('invites', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            coach_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            athlete_email: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            invite_token: {
                type: DataTypes.UUID,
                unique: true,
                defaultValue: DataTypes.UUIDV4,
                allowNull: false
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            role_requested: {
                type: DataTypes.ENUM('primary', 'assistant', 'viewer'),
                defaultValue: 'primary',
                allowNull: false
            },
            expires_at: {
                type: DataTypes.DATE,
                allowNull: false
            },
            accepted_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            revoked_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                allowNull: false
            },
            updated_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                allowNull: false
            }
        });

        console.log('[✓] [MIGRATION-001] Invites table created');

        // Create indexes for performance
        console.log('[*] [MIGRATION-001] Creating indexes...');

        await queryInterface.addIndex('invites', ['invite_token'], {
            name: 'idx_invite_token',
            unique: true
        });

        await queryInterface.addIndex('invites', ['athlete_email', 'accepted_at'], {
            name: 'idx_invite_email_status'
        });

        await queryInterface.addIndex('invites', ['coach_id'], {
            name: 'idx_invite_coach'
        });

        console.log('[✓] [MIGRATION-001] Indexes created successfully');
        logMigrationEvent('COMPLETE', {
            migration: '001-create-invites-table',
            tablesCreated: ['invites'],
            indexesCreated: 3
        });

    } catch (error) {
        console.error('[✗] [MIGRATION-001] Error:', error.message);
        logMigrationEvent('ERROR', {
            migration: '001-create-invites-table',
            error: error.message
        });
        // Don't throw - let the app continue
    }
}

module.exports = { createInvitesTable };
