const { logMigrationEvent } = require('../utils/logger');

async function createAPILogsTable(queryInterface, Sequelize) {
    const tableName = 'api_logs';

    try {
        logMigrationEvent('007-create-api-logs-table', 'START', `Checking if ${tableName} table exists`);

        // Check if table already exists using information_schema query
        const [results] = await queryInterface.sequelize.query(
            `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}'`
        );

        if (results.length > 0) {
            logMigrationEvent('007-create-api-logs-table', 'SKIP', `Table ${tableName} already exists`);
            return;
        }

        logMigrationEvent('007-create-api-logs-table', 'CREATE', `Creating ${tableName} table`);

        await queryInterface.createTable(tableName, {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },

            // Request details
            method: {
                type: Sequelize.STRING(10),
                allowNull: false
            },
            endpoint: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            provider: {
                type: Sequelize.ENUM('strava', 'garmin', 'whoop', 'oura', 'internal', 'other'),
                allowNull: true
            },

            // Response details
            statusCode: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            durationMs: {
                type: Sequelize.INTEGER,
                allowNull: true
            },

            // Request/Response data
            requestBody: {
                type: Sequelize.JSON,
                allowNull: true
            },
            responseBody: {
                type: Sequelize.JSON,
                allowNull: true
            },

            // Error details
            errorMessage: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            errorStack: {
                type: Sequelize.TEXT,
                allowNull: true
            },

            // Client info
            ipAddress: {
                type: Sequelize.STRING(45),
                allowNull: true
            },
            userAgent: {
                type: Sequelize.STRING(500),
                allowNull: true
            },

            // Metadata
            isOAuthFlow: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            tags: {
                type: Sequelize.JSON,
                allowNull: true
            },

            // Timestamps
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false
            }
        });

        logMigrationEvent('007-create-api-logs-table', 'INDEX', 'Creating indexes');

        // Create indexes for fast queries
        await queryInterface.addIndex(tableName, ['userId', 'createdAt'], {
            name: 'api_logs_userId_createdAt_idx'
        });

        await queryInterface.addIndex(tableName, ['provider', 'createdAt'], {
            name: 'api_logs_provider_createdAt_idx'
        });

        await queryInterface.addIndex(tableName, ['statusCode', 'createdAt'], {
            name: 'api_logs_statusCode_createdAt_idx'
        });

        await queryInterface.addIndex(tableName, ['endpoint', 'createdAt'], {
            name: 'api_logs_endpoint_createdAt_idx'
        });

        await queryInterface.addIndex(tableName, ['isOAuthFlow', 'createdAt'], {
            name: 'api_logs_isOAuthFlow_createdAt_idx'
        });

        logMigrationEvent('007-create-api-logs-table', 'SUCCESS', `Table ${tableName} created successfully with indexes`);

    } catch (error) {
        logMigrationEvent('007-create-api-logs-table', 'ERROR', error.message);
        console.error('Migration error:', error);
        // Don't throw - allow app to continue
    }
}

module.exports = createAPILogsTable;
