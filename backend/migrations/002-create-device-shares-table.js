const { Sequelize, DataTypes } = require('sequelize');
const { logMigrationEvent } = require('../utils/logger');

/**
 * Migration 002: Create DeviceShares Table
 *
 * Purpose: Audit trail for device sharing consent
 * Records when athlete consents to share device data with coach
 * Tracks revocation timestamps for compliance
 */
async function createDeviceSharesTable(sequelize) {
    const queryInterface = sequelize.getQueryInterface();

    try {
        // Check if table already exists
        const tables = await queryInterface.showAllTables();

        if (tables.includes('device_shares')) {
            console.log('✅ [MIGRATION-002] DeviceShares table already exists');
            logMigrationEvent('SKIPPED', { migration: '002-create-device-shares-table', reason: 'Table exists' });
            return;
        }

        console.log('📝 [MIGRATION-002] Creating device_shares table...');
        logMigrationEvent('START', { migration: '002-create-device-shares-table' });

        // Create device_shares table
        await queryInterface.createTable('device_shares', {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },
            athlete_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onDelete: 'CASCADE'
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
            device_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'oauth_tokens',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },
            consent_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
                allowNull: false
            },
            expires_at: {
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

        console.log('✅ [MIGRATION-002] DeviceShares table created');

        // Create indexes for performance
        console.log('📝 [MIGRATION-002] Creating indexes...');

        // Critical index for permission checks (coach viewing athlete)
        await queryInterface.addIndex('device_shares', ['athlete_id', 'coach_id', 'revoked_at'], {
            name: 'idx_device_shares_active'
        });

        // Index for finding all shares for a device
        await queryInterface.addIndex('device_shares', ['device_id'], {
            name: 'idx_device_shares_device'
        });

        // Index for finding all shares by coach
        await queryInterface.addIndex('device_shares', ['coach_id', 'revoked_at'], {
            name: 'idx_device_shares_coach'
        });

        console.log('✅ [MIGRATION-002] Indexes created successfully');
        logMigrationEvent('COMPLETE', {
            migration: '002-create-device-shares-table',
            tablesCreated: ['device_shares'],
            indexesCreated: 3
        });

    } catch (error) {
        console.error('❌ [MIGRATION-002] Error:', error.message);
        logMigrationEvent('ERROR', {
            migration: '002-create-device-shares-table',
            error: error.message
        });
        // Don't throw - let the app continue
    }
}

module.exports = { createDeviceSharesTable };
