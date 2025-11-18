/**
 * Migration: Add guest mode support fields to users table
 * - passwordHash (for optional signup)
 * - isGuest (to track guest vs authenticated users)
 */

const { sequelize } = require('../models');

async function migrate() {
    try {
        console.log('🔄 Running migration: add-guest-mode-fields...');

        // Add passwordHash column if it doesn't exist
        try {
            await sequelize.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255)
            `);
            console.log('✅ Added passwordHash column');
        } catch (error) {
            console.log('ℹ️  passwordHash column may already exist:', error.message);
        }

        // Add isGuest column if it doesn't exist
        try {
            await sequelize.query(`
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN DEFAULT true
            `);
            console.log('✅ Added isGuest column');
        } catch (error) {
            console.log('ℹ️  isGuest column may already exist:', error.message);
        }

        // Update existing users to be non-guest if they have an email
        try {
            await sequelize.query(`
                UPDATE users
                SET "isGuest" = false
                WHERE email IS NOT NULL AND "isGuest" IS NULL
            `);
            console.log('✅ Updated existing users to non-guest status');
        } catch (error) {
            console.log('ℹ️  Could not update existing users:', error.message);
        }

        console.log('✅ Migration complete: add-guest-mode-fields');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    migrate()
        .then(() => {
            console.log('Migration successful!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = migrate;
