const { DataTypes } = require('sequelize');
const sequelize = require('../utils/database');

const APILog = sequelize.define('APILog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who made the request (null for unauthenticated)'
    },

    // Request details
    method: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'HTTP method (GET, POST, PUT, DELETE)'
    },
    endpoint: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'API endpoint path'
    },
    provider: {
        type: DataTypes.ENUM('strava', 'garmin', 'whoop', 'oura', 'internal', 'other'),
        allowNull: true,
        comment: 'OAuth provider if applicable'
    },

    // Response details
    statusCode: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'HTTP response status code'
    },
    durationMs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Request duration in milliseconds'
    },

    // Request/Response data (only for critical endpoints like OAuth)
    requestBody: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Request body (sensitive fields redacted)'
    },
    responseBody: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Response body (sensitive fields redacted)'
    },

    // Error details
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if request failed'
    },
    errorStack: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error stack trace (development only)'
    },

    // Client info
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Client IP address (IPv4 or IPv6)'
    },
    userAgent: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Client user agent'
    },

    // Metadata
    isOAuthFlow: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True if this is part of an OAuth flow'
    },
    tags: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional tags for categorization (e.g., ["oauth", "token_exchange"])'
    }
}, {
    timestamps: true,
    tableName: 'api_logs',
    indexes: [
        {
            fields: ['userId', 'createdAt']
        },
        {
            fields: ['provider', 'createdAt']
        },
        {
            fields: ['statusCode', 'createdAt']
        },
        {
            fields: ['endpoint', 'createdAt']
        },
        {
            fields: ['isOAuthFlow', 'createdAt']
        },
        {
            // For fast queries of recent errors
            fields: ['statusCode', 'createdAt'],
            where: {
                statusCode: { [sequelize.Sequelize.Op.gte]: 400 }
            }
        }
    ]
});

// Helper function to redact sensitive fields from request/response bodies
APILog.redactSensitiveData = function(data) {
    if (!data) return null;

    const redacted = JSON.parse(JSON.stringify(data)); // Deep clone

    const sensitiveFields = [
        'password', 'access_token', 'refresh_token', 'client_secret',
        'code_verifier', 'authorization', 'cookie', 'session',
        'accessToken', 'refreshToken', 'clientSecret', 'apiKey'
    ];

    const redactObject = (obj) => {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const lowerKey = key.toLowerCase();

            if (sensitiveFields.some(field => lowerKey.includes(field))) {
                obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
                redactObject(obj[key]);
            }
        }
    };

    redactObject(redacted);
    return redacted;
};

// Auto-cleanup old logs (keep last 30 days)
APILog.cleanupOldLogs = async function(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await APILog.destroy({
        where: {
            createdAt: {
                [sequelize.Sequelize.Op.lt]: cutoffDate
            }
        }
    });

    return deleted;
};

module.exports = APILog;
