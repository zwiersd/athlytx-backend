const { Sequelize, DataTypes } = require('sequelize');
const { logMigrationEvent } = require('../utils/logger');

/**
 * Migration 003: Add Device Sharing Columns to oauth_tokens
 *
 * Purpose: Track which devices are shared with coaches
 * Adds:
 * - share_with_coaches: Boolean flag for quick filtering
 * - provider_user_id: ID from provider (for duplicate detection)
 * - scopes: JSON of OAuth scopes granted
 */
async function addDeviceSharingColumns(sequelize) {
    const queryInterface = sequelize.getQueryInterface();

    try {
        console.log('📝 [MIGRATION-003] Adding device sharing columns to oauth_tokens...');
        logMigrationEvent('START', { migration: '003-add-device-sharing-columns' });

        // Check if columns already exist
        const tableDescription = await queryInterface.describeTable('oauth_tokens');

        let columnsAdded = 0;

        // Add share_with_coaches column
        if (!tableDescription.share_with_coaches) {
            console.log('  📝 Adding share_with_coaches column...');
            await queryInterface.addColumn('oauth_tokens', 'share_with_coaches', {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            });
            columnsAdded++;
            console.log('  ✅ share_with_coaches column added');
        } else {
            console.log('  ✅ share_with_coaches column already exists');
        }

        // Add provider_user_id column
        if (!tableDescription.provider_user_id) {
            console.log('  📝 Adding provider_user_id column...');
            await queryInterface.addColumn('oauth_tokens', 'provider_user_id', {
                type: DataTypes.STRING(255),
                allowNull: true
            });
            columnsAdded++;
            console.log('  ✅ provider_user_id column added');
        } else {
            console.log('  ✅ provider_user_id column already exists');
        }

        // Add scopes column (JSONB for PostgreSQL, TEXT for SQLite)
        if (!tableDescription.scopes) {
            console.log('  📝 Adding scopes column...');
            await queryInterface.addColumn('oauth_tokens', 'scopes', {
                type: sequelize.getDialect() === 'postgres' ? DataTypes.JSONB : DataTypes.TEXT,
                allowNull: true
            });
            columnsAdded++;
            console.log('  ✅ scopes column added');
        } else {
            console.log('  ✅ scopes column already exists');
        }

        if (columnsAdded > 0) {
            // Create index for frequent queries
            console.log('  📝 Creating index on userId, provider, share_with_coaches...');

            try {
                await queryInterface.addIndex('oauth_tokens', ['userId', 'provider', 'share_with_coaches'], {
                    name: 'idx_oauth_user_provider_share'
                });
                console.log('  ✅ Index created');
            } catch (indexError) {
                // Index might already exist
                console.log('  ℹ️  Index may already exist:', indexError.message);
            }
        }

        console.log(`✅ [MIGRATION-003] Complete (${columnsAdded} columns added)`);
        logMigrationEvent('COMPLETE', {
            migration: '003-add-device-sharing-columns',
            columnsAdded,
            indexesCreated: columnsAdded > 0 ? 1 : 0
        });

    } catch (error) {
        console.error('❌ [MIGRATION-003] Error:', error.message);
        logMigrationEvent('ERROR', {
            migration: '003-add-device-sharing-columns',
            error: error.message
        });
        // Don't throw - let the app continue
    }
}

module.exports = { addDeviceSharingColumns };
