const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
    // Production: PostgreSQL on Railway
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
    console.log('💾 Database: PostgreSQL (Production)');
} else {
    // Development: SQLite fallback for local testing
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './athlytx-dev.db',
        logging: false
    });
    console.log('💾 Database: SQLite (Development)');
    console.warn('⚠️  No DATABASE_URL found, using SQLite. Set DATABASE_URL for production.');
}

// Test connection
sequelize.authenticate()
    .then(() => console.log('✅ Database connection established'))
    .catch(err => console.error('❌ Database connection failed:', err));

module.exports = sequelize;
