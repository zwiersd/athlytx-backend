const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT } = require('./prompts/system-prompt');

// Import all tools
const oauthTools = require('./tools/oauth-tools');
const tokenTools = require('./tools/token-tools');
const apiCallTools = require('./tools/api-call-tools');
const dataQueryTools = require('./tools/data-query-tools');
const monitoringTools = require('./tools/monitoring-tools');

/**
 * Athlytx API & OAuth Specialist Agent
 * Uses Claude with function calling to manage API integrations and OAuth flows
 */

class ApiOAuthSpecialistAgent {
    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }

        this.client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        this.model = 'claude-3-5-sonnet-20241022';

        // Register all available tools
        this.tools = this.registerTools();
    }

    /**
     * Register all tools with their schemas for Claude function calling
     */
    registerTools() {
        return [
            // OAuth Tools
            {
                name: 'validateOAuthToken',
                description: 'Validate an OAuth token for a user and provider. Returns validation status, expiry info, and suggestions.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string', description: 'The user ID' },
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'], description: 'The OAuth provider' }
                    },
                    required: ['userId', 'provider']
                }
            },
            {
                name: 'diagnoseOAuthIssue',
                description: 'Diagnose OAuth authentication issues for a provider. Checks credentials, analyzes errors, provides solutions.',
                input_schema: {
                    type: 'object',
                    properties: {
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'] },
                        errorDetails: { type: 'object', description: 'Optional error details from OAuth flow' }
                    },
                    required: ['provider']
                }
            },
            {
                name: 'getOAuthStatus',
                description: 'Get OAuth connection status for all providers for a user.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string', description: 'The user ID' }
                    },
                    required: ['userId']
                }
            },
            {
                name: 'testOAuthToken',
                description: 'Test an OAuth token by making a real API call to the provider.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'] }
                    },
                    required: ['userId', 'provider']
                }
            },

            // Token Management Tools
            {
                name: 'refreshOAuthToken',
                description: 'Refresh an expired OAuth token using the refresh token.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'] }
                    },
                    required: ['userId', 'provider']
                }
            },
            {
                name: 'autoRefreshIfNeeded',
                description: 'Automatically refresh a token if it is expired or about to expire.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'] },
                        bufferMinutes: { type: 'number', description: 'Refresh if expiring within this many minutes (default: 5)' }
                    },
                    required: ['userId', 'provider']
                }
            },
            {
                name: 'getTokenHealth',
                description: 'Get health status of all OAuth tokens for a user.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' }
                    },
                    required: ['userId']
                }
            },
            {
                name: 'revokeOAuthToken',
                description: 'Revoke an OAuth token and disconnect a provider.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'] }
                    },
                    required: ['userId', 'provider']
                }
            },

            // API Call Tools
            {
                name: 'makeAuthenticatedCall',
                description: 'Make an authenticated API call with automatic retry and rate limiting.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'] },
                        endpoint: { type: 'string', description: 'Full API endpoint URL' },
                        options: {
                            type: 'object',
                            properties: {
                                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
                                body: { type: 'object' },
                                headers: { type: 'object' }
                            }
                        }
                    },
                    required: ['userId', 'provider', 'endpoint']
                }
            },
            {
                name: 'getRateLimitStatus',
                description: 'Get current rate limit status for a provider.',
                input_schema: {
                    type: 'object',
                    properties: {
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'] }
                    },
                    required: ['provider']
                }
            },

            // Data Query Tools
            {
                name: 'getActivities',
                description: 'Get activity data (runs, rides, workouts) from a provider.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        provider: { type: 'string', enum: ['strava', 'oura', 'garmin', 'whoop'] },
                        params: {
                            type: 'object',
                            properties: {
                                startDate: { type: 'string', description: 'ISO date string' },
                                endDate: { type: 'string', description: 'ISO date string' },
                                activityType: { type: 'string', description: 'e.g., run, ride, swim' },
                                limit: { type: 'number' }
                            }
                        }
                    },
                    required: ['userId', 'provider']
                }
            },
            {
                name: 'getSleepData',
                description: 'Get sleep data from a provider.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        provider: { type: 'string', enum: ['oura', 'whoop'] },
                        params: {
                            type: 'object',
                            properties: {
                                startDate: { type: 'string' },
                                endDate: { type: 'string' }
                            }
                        }
                    },
                    required: ['userId', 'provider']
                }
            },
            {
                name: 'getRecoveryData',
                description: 'Get recovery/readiness data from a provider.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        provider: { type: 'string', enum: ['oura', 'whoop'] },
                        params: {
                            type: 'object',
                            properties: {
                                startDate: { type: 'string' },
                                endDate: { type: 'string' }
                            }
                        }
                    },
                    required: ['userId', 'provider']
                }
            },
            {
                name: 'queryFitnessData',
                description: 'Query fitness data using natural language. Automatically determines provider, data type, and date range.',
                input_schema: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string' },
                        query: { type: 'string', description: 'Natural language query like "show my runs from last week"' }
                    },
                    required: ['userId', 'query']
                }
            },

            // Monitoring Tools
            {
                name: 'monitorAllTokens',
                description: 'Monitor OAuth token health for all users. Auto-refreshes expired tokens.',
                input_schema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'healthCheckAPIs',
                description: 'Perform health check on all API integrations.',
                input_schema: {
                    type: 'object',
                    properties: {}
                }
            },
            {
                name: 'getAlerts',
                description: 'Get current system alerts.',
                input_schema: {
                    type: 'object',
                    properties: {
                        filters: {
                            type: 'object',
                            properties: {
                                severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
                                type: { type: 'string' },
                                unacknowledged: { type: 'boolean' }
                            }
                        }
                    }
                }
            },
            {
                name: 'getMetricsSummary',
                description: 'Get overall system metrics and performance summary.',
                input_schema: {
                    type: 'object',
                    properties: {}
                }
            }
        ];
    }

    /**
     * Execute a tool function
     */
    async executeTool(toolName, toolInput) {
        // Map tool names to actual functions
        const toolMap = {
            // OAuth tools
            validateOAuthToken: oauthTools.validateOAuthToken,
            diagnoseOAuthIssue: oauthTools.diagnoseOAuthIssue,
            getOAuthStatus: oauthTools.getOAuthStatus,
            testOAuthToken: oauthTools.testOAuthToken,

            // Token tools
            refreshOAuthToken: tokenTools.refreshOAuthToken,
            autoRefreshIfNeeded: tokenTools.autoRefreshIfNeeded,
            getTokenHealth: tokenTools.getTokenHealth,
            revokeOAuthToken: tokenTools.revokeOAuthToken,

            // API call tools
            makeAuthenticatedCall: apiCallTools.makeAuthenticatedCall,
            getRateLimitStatus: apiCallTools.getRateLimitStatus,

            // Data query tools
            getActivities: dataQueryTools.getActivities,
            getSleepData: dataQueryTools.getSleepData,
            getRecoveryData: dataQueryTools.getRecoveryData,
            queryFitnessData: dataQueryTools.queryFitnessData,

            // Monitoring tools
            monitorAllTokens: monitoringTools.monitorAllTokens,
            healthCheckAPIs: monitoringTools.healthCheckAPIs,
            getAlerts: monitoringTools.getAlerts,
            getMetricsSummary: monitoringTools.getMetricsSummary
        };

        const toolFunction = toolMap[toolName];

        if (!toolFunction) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        // Execute the tool with the provided input
        const args = Object.values(toolInput);
        return await toolFunction(...args);
    }

    /**
     * Process a user message with the agent
     */
    async processMessage(userId, message, conversationHistory = []) {
        const messages = [
            ...conversationHistory,
            {
                role: 'user',
                content: message
            }
        ];

        let continueProcessing = true;
        const maxIterations = 10; // Prevent infinite loops
        let iterations = 0;

        while (continueProcessing && iterations < maxIterations) {
            iterations++;

            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: 4096,
                system: SYSTEM_PROMPT,
                tools: this.tools,
                messages
            });

            // Add assistant response to messages
            messages.push({
                role: 'assistant',
                content: response.content
            });

            // Check if we need to execute tools
            const toolUse = response.content.find(block => block.type === 'tool_use');

            if (toolUse) {
                console.log(`🔧 Agent using tool: ${toolUse.name}`);

                // Execute the tool
                const toolResult = await this.executeTool(toolUse.name, toolUse.input);

                // Add tool result to messages
                messages.push({
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: toolUse.id,
                        content: JSON.stringify(toolResult)
                    }]
                });

                // Continue processing to let Claude respond to the tool result
                continueProcessing = response.stop_reason === 'tool_use';
            } else {
                // No more tools to execute
                continueProcessing = false;
            }

            // If the response is complete, extract the text
            if (!continueProcessing) {
                const textContent = response.content.find(block => block.type === 'text');
                return {
                    response: textContent?.text || 'I processed your request.',
                    conversationHistory: messages,
                    toolsUsed: iterations - 1
                };
            }
        }

        // If we hit max iterations
        return {
            response: 'I processed your request but reached the maximum number of steps.',
            conversationHistory: messages,
            toolsUsed: iterations
        };
    }

    /**
     * Quick helper: Diagnose OAuth issue for a user and provider
     */
    async diagnoseUserOAuthIssue(userId, provider) {
        return this.processMessage(
            userId,
            `Check the OAuth status for my ${provider} connection and diagnose any issues.`
        );
    }

    /**
     * Quick helper: Get fitness data with natural language
     */
    async queryUserData(userId, query) {
        return this.processMessage(userId, query);
    }

    /**
     * Quick helper: System health check
     */
    async performHealthCheck() {
        return this.processMessage(
            'system',
            'Perform a complete system health check including all OAuth providers and token status.'
        );
    }
}

module.exports = ApiOAuthSpecialistAgent;
