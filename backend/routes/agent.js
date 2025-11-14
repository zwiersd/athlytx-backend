const express = require('express');
const router = express.Router();
const ApiOAuthSpecialistAgent = require('../agents/api-oauth-specialist');

// Import tools directly for non-conversational endpoints
const oauthTools = require('../agents/tools/oauth-tools');
const tokenTools = require('../agents/tools/token-tools');
const monitoringTools = require('../agents/tools/monitoring-tools');
const dataQueryTools = require('../agents/tools/data-query-tools');

// Initialize the agent (singleton)
let agent = null;

function getAgent() {
    if (!agent) {
        try {
            agent = new ApiOAuthSpecialistAgent();
        } catch (error) {
            console.error('Failed to initialize agent:', error.message);
            return null;
        }
    }
    return agent;
}

/**
 * POST /api/agent/chat
 * Have a conversation with the agent
 */
router.post('/chat', async (req, res) => {
    try {
        const { userId, message, conversationHistory = [] } = req.body;

        if (!userId || !message) {
            return res.status(400).json({
                error: 'userId and message are required'
            });
        }

        const agentInstance = getAgent();
        if (!agentInstance) {
            return res.status(500).json({
                error: 'Agent not initialized. Check ANTHROPIC_API_KEY environment variable.'
            });
        }

        const result = await agentInstance.processMessage(userId, message, conversationHistory);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Agent chat error:', error);
        res.status(500).json({
            error: 'Failed to process message',
            details: error.message
        });
    }
});

/**
 * POST /api/agent/diagnose
 * Quick OAuth diagnosis for a user and provider
 */
router.post('/diagnose', async (req, res) => {
    try {
        const { userId, provider } = req.body;

        if (!userId || !provider) {
            return res.status(400).json({
                error: 'userId and provider are required'
            });
        }

        const agentInstance = getAgent();
        if (!agentInstance) {
            // Fallback to direct tool call if agent not available
            const validation = await oauthTools.validateOAuthToken(userId, provider);
            const diagnosis = await oauthTools.diagnoseOAuthIssue(provider);

            return res.json({
                success: true,
                validation,
                diagnosis,
                fallbackMode: true
            });
        }

        const result = await agentInstance.diagnoseUserOAuthIssue(userId, provider);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Diagnose error:', error);
        res.status(500).json({
            error: 'Failed to diagnose OAuth issue',
            details: error.message
        });
    }
});

/**
 * POST /api/agent/query
 * Natural language fitness data query
 */
router.post('/query', async (req, res) => {
    try {
        const { userId, query } = req.body;

        if (!userId || !query) {
            return res.status(400).json({
                error: 'userId and query are required'
            });
        }

        const agentInstance = getAgent();
        if (!agentInstance) {
            // Fallback to direct tool
            const result = await dataQueryTools.queryFitnessData(userId, query);
            return res.json({
                success: true,
                result,
                fallbackMode: true
            });
        }

        const result = await agentInstance.queryUserData(userId, query);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({
            error: 'Failed to process query',
            details: error.message
        });
    }
});

/**
 * GET /api/agent/health
 * Get system health status
 */
router.get('/health', async (req, res) => {
    try {
        const agentInstance = getAgent();

        if (!agentInstance) {
            // Fallback mode - run health checks without agent
            const tokenHealth = await monitoringTools.monitorAllTokens();
            const apiHealth = await monitoringTools.healthCheckAPIs();
            const metrics = monitoringTools.getMetricsSummary();
            const alerts = monitoringTools.getAlerts({ unacknowledged: true });

            return res.json({
                success: true,
                agentAvailable: false,
                tokenHealth,
                apiHealth,
                metrics,
                alerts
            });
        }

        const result = await agentInstance.performHealthCheck();

        res.json({
            success: true,
            agentAvailable: true,
            ...result
        });

    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            error: 'Failed to perform health check',
            details: error.message
        });
    }
});

/**
 * GET /api/agent/status/:userId
 * Get OAuth connection status for a user
 */
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const status = await oauthTools.getOAuthStatus(userId);
        const tokenHealth = await tokenTools.getTokenHealth(userId);

        res.json({
            success: true,
            status,
            health: tokenHealth
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to get status',
            details: error.message
        });
    }
});

/**
 * POST /api/agent/refresh/:userId/:provider
 * Manually refresh a token
 */
router.post('/refresh/:userId/:provider', async (req, res) => {
    try {
        const { userId, provider } = req.params;

        const result = await tokenTools.refreshOAuthToken(userId, provider);

        res.json({
            success: result.success,
            ...result
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Failed to refresh token',
            details: error.message
        });
    }
});

/**
 * POST /api/agent/revoke/:userId/:provider
 * Revoke/disconnect a provider
 */
router.post('/revoke/:userId/:provider', async (req, res) => {
    try {
        const { userId, provider } = req.params;

        const result = await tokenTools.revokeOAuthToken(userId, provider);

        res.json({
            success: result.success,
            ...result
        });

    } catch (error) {
        console.error('Token revoke error:', error);
        res.status(500).json({
            error: 'Failed to revoke token',
            details: error.message
        });
    }
});

/**
 * GET /api/agent/metrics
 * Get monitoring metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        const metrics = monitoringTools.getMetricsSummary();

        res.json({
            success: true,
            ...metrics
        });

    } catch (error) {
        console.error('Metrics error:', error);
        res.status(500).json({
            error: 'Failed to get metrics',
            details: error.message
        });
    }
});

/**
 * GET /api/agent/alerts
 * Get current alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const { severity, type, unacknowledged } = req.query;

        const filters = {};
        if (severity) filters.severity = severity;
        if (type) filters.type = type;
        if (unacknowledged === 'true') filters.unacknowledged = true;

        const alerts = monitoringTools.getAlerts(filters);

        res.json({
            success: true,
            ...alerts
        });

    } catch (error) {
        console.error('Alerts error:', error);
        res.status(500).json({
            error: 'Failed to get alerts',
            details: error.message
        });
    }
});

/**
 * POST /api/agent/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
    try {
        const { alertId } = req.params;

        const result = monitoringTools.acknowledgeAlert(alertId);

        res.json(result);

    } catch (error) {
        console.error('Alert acknowledge error:', error);
        res.status(500).json({
            error: 'Failed to acknowledge alert',
            details: error.message
        });
    }
});

/**
 * POST /api/agent/monitor/tokens
 * Run token monitoring (admin endpoint)
 */
router.post('/monitor/tokens', async (req, res) => {
    try {
        const result = await monitoringTools.monitorAllTokens();

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Token monitoring error:', error);
        res.status(500).json({
            error: 'Failed to monitor tokens',
            details: error.message
        });
    }
});

/**
 * POST /api/agent/monitor/apis
 * Run API health check (admin endpoint)
 */
router.post('/monitor/apis', async (req, res) => {
    try {
        const result = await monitoringTools.healthCheckAPIs();

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('API monitoring error:', error);
        res.status(500).json({
            error: 'Failed to monitor APIs',
            details: error.message
        });
    }
});

module.exports = router;
