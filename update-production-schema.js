/**
 * Update PostgreSQL schema to add authentication columns
 * Run with: railway run node update-production-schema.js
 */

const { Sequelize } = require('sequelize');

async function updateSchema() {
    // Get DATABASE_URL from environment (set by Railway)
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not set. Run with: railway run node update-production-schema.js');
        process.exit(1);
    }

    console.log('🔗 Connecting to PostgreSQL database...');

    const sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    });

    try {
        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Add columns using raw SQL
        console.log('\n📝 Adding authentication columns to users table...');

        const queries = [
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS "isGuest" BOOLEAN DEFAULT true;',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetToken" VARCHAR(255);',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP;'
        ];

        for (const query of queries) {
            try {
                await sequelize.query(query);
                console.log(`  ✓ ${query.split(' ')[5]}`); // Log column name
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log(`  ℹ ${query.split(' ')[5]} (already exists)`);
                } else {
                    console.error(`  ✗ Error: ${error.message}`);
                }
            }
        }

        // Verify columns
        console.log('\n🔍 Verifying users table schema...');
        const [results] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('passwordHash', 'isGuest', 'passwordResetToken', 'passwordResetExpiry')
            ORDER BY column_name;
        `);

        if (results.length > 0) {
            console.log('\n✅ Authentication columns verified:');
            results.forEach(col => {
                console.log(`   - ${col.column_name} (${col.data_type})`);
            });
        } else {
            console.log('\n⚠️  Warning: No authentication columns found');
        }

        console.log('\n✨ Schema update complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

updateSchema();
