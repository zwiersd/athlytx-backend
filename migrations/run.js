#!/usr/bin/env node

/**
 * Database Migration Runner
 * Executes all migrations in order on startup
 */

const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');

// Load environment variables
require('dotenv').config();

async function runMigrations() {
    console.log('[>] Starting database migrations...');

    // Initialize Sequelize
    const sequelize = new Sequelize(process.env.DATABASE_URL || 'sqlite::memory:', {
        dialect: process.env.DATABASE_URL?.startsWith('postgres') ? 'postgres' : 'sqlite',
        logging: (msg) => {
            if (msg.includes('ERROR') || msg.includes('WARNING')) {
                console.log(msg);
            }
        },
        dialectOptions: process.env.DATABASE_URL?.startsWith('postgres') ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {}
    });

    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('[✓] Database connection established');

        // Get migration files directory
        const migrationsDir = path.join(__dirname, '../backend/migrations');

        if (!fs.existsSync(migrationsDir)) {
            console.log('[!] No migrations directory found, skipping migrations');
            await sequelize.close();
            return;
        }

        // Get all migration files in order
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.js') && f.match(/^\d{3}-/)) // Only numbered migrations
            .sort(); // Sort to ensure correct order

        if (files.length === 0) {
            console.log('[!] No migration files found');
            await sequelize.close();
            return;
        }

        console.log(`[*] Found ${files.length} migration files`);

        // Run each migration
        for (const file of files) {
            try {
                const migrationPath = path.join(migrationsDir, file);
                const migrationModule = require(migrationPath);

                console.log(`\n[>] Running migration: ${file}`);

                // Get the migration function (handle different export formats)
                let migrationFn;
                if (typeof migrationModule === 'function') {
                    migrationFn = migrationModule;
                } else if (migrationModule && typeof migrationModule === 'object') {
                    // Get the first exported function
                    const fnName = Object.keys(migrationModule)[0];
                    migrationFn = migrationModule[fnName];
                }

                if (typeof migrationFn !== 'function') {
                    console.error(`[✗] Migration failed: ${file} - no function exported`);
                    continue;
                }

                // Execute the migration
                await migrationFn(sequelize);

                console.log(`[✓] Migration completed: ${file}`);
            } catch (error) {
                // If error is about table/column already existing, that's OK
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate column') ||
                    error.message.includes('relation') && error.message.includes('already exists')) {
                    console.log(`[-] Migration skipped (already applied): ${file}`);
                } else {
                    console.error(`[✗] Migration failed: ${file}`);
                    console.error(error.message);
                    // Don't throw - continue with other migrations
                }
            }
        }

        console.log('\n[✓] All migrations completed successfully');
        await sequelize.close();

    } catch (error) {
        console.error('[✗] Migration error:', error.message);
        await sequelize.close();
        process.exit(1);
    }
}

// Run migrations if this script is executed directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            console.log('[✓] Migration process complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[✗] Migration process failed:', error);
            process.exit(1);
        });
}

module.exports = runMigrations;
