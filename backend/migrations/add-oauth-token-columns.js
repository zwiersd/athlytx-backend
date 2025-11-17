/**
 * Migration: Add missing columns to oauth_tokens table
 *
 * Adds:
 * - connectedAt: When the OAuth connection was established
 * - lastSyncAt: Last time data was synced from this provider
 * - scope: OAuth scopes granted
 * - share_with_coaches: Whether to share this device data with coaches
 * - provider_user_id: User ID from the provider
 * - scopes: JSON field for detailed scope information
 */

const { Sequelize } = require('sequelize');

async function migrate() {
    const sequelize = require('../utils/database');

    try {
        console.log('Starting oauth_tokens table migration...');

        // Check if columns already exist before adding
        const [columns] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'oauth_tokens'
        `);

        const existingColumns = columns.map(c => c.column_name);
        console.log('Existing columns:', existingColumns);

        // Add connectedAt if it doesn't exist
        if (!existingColumns.includes('connectedAt')) {
            await sequelize.query(`
                ALTER TABLE oauth_tokens
                ADD COLUMN "connectedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            `);
            console.log('✅ Added connectedAt column');
        } else {
            console.log('⏭️  connectedAt column already exists');
        }

        // Add lastSyncAt if it doesn't exist
        if (!existingColumns.includes('lastSyncAt')) {
            await sequelize.query(`
                ALTER TABLE oauth_tokens
                ADD COLUMN "lastSyncAt" TIMESTAMP WITH TIME ZONE
            `);
            console.log('✅ Added lastSyncAt column');
        } else {
            console.log('⏭️  lastSyncAt column already exists');
        }

        // Add scope if it doesn't exist
        if (!existingColumns.includes('scope')) {
            await sequelize.query(`
                ALTER TABLE oauth_tokens
                ADD COLUMN scope TEXT
            `);
            console.log('✅ Added scope column');
        } else {
            console.log('⏭️  scope column already exists');
        }

        // Add share_with_coaches if it doesn't exist
        if (!existingColumns.includes('share_with_coaches')) {
            await sequelize.query(`
                ALTER TABLE oauth_tokens
                ADD COLUMN share_with_coaches BOOLEAN DEFAULT false NOT NULL
            `);
            console.log('✅ Added share_with_coaches column');
        } else {
            console.log('⏭️  share_with_coaches column already exists');
        }

        // Add provider_user_id if it doesn't exist
        if (!existingColumns.includes('provider_user_id')) {
            await sequelize.query(`
                ALTER TABLE oauth_tokens
                ADD COLUMN provider_user_id VARCHAR(255)
            `);
            console.log('✅ Added provider_user_id column');
        } else {
            console.log('⏭️  provider_user_id column already exists');
        }

        // Add scopes (JSONB) if it doesn't exist
        if (!existingColumns.includes('scopes')) {
            await sequelize.query(`
                ALTER TABLE oauth_tokens
                ADD COLUMN scopes JSONB
            `);
            console.log('✅ Added scopes column');
        } else {
            console.log('⏭️  scopes column already exists');
        }

        console.log('✅ Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    migrate();
}

module.exports = migrate;
