# Athlytx API & OAuth Specialist Agent

An AI-powered agent built with Anthropic's Claude that specializes in managing API integrations, OAuth authentication flows, and fitness data queries for the Athlytx platform.

## Features

### 1. OAuth Debugging & Management
- Validate OAuth tokens across all providers (Strava, Oura, Garmin, Whoop)
- Diagnose authentication issues with actionable solutions
- Auto-refresh expired tokens
- Test tokens with real API calls
- Monitor token health across all users

### 2. Intelligent API Calls
- Automatic retry with exponential backoff
- Built-in rate limiting to prevent quota exhaustion
- Error handling with meaningful feedback
- Batch request processing
- Performance tracking and metrics

### 3. Natural Language Queries
- Ask questions like "Show me my runs from last week"
- Automatically determines provider, data type, and date range
- Supports activities, sleep, recovery, and readiness data
- Multi-provider data aggregation

### 4. Proactive Monitoring
- Auto-refresh expiring tokens before they cause issues
- Track API performance and error rates
- Generate alerts for critical issues
- System health dashboards
- Comprehensive metrics and analytics

## Architecture

```
backend/agents/
├── api-oauth-specialist.js    # Main agent orchestrator
├── tools/                      # Tool functions the agent can call
│   ├── oauth-tools.js         # OAuth debugging & validation
│   ├── token-tools.js         # Token management & refresh
│   ├── api-call-tools.js      # Intelligent API calls with retry
│   ├── data-query-tools.js    # Natural language data queries
│   └── monitoring-tools.js    # System monitoring & alerts
├── prompts/
│   └── system-prompt.js       # Agent personality & capabilities
└── README.md                  # This file
```

## Setup

### 1. Install Dependencies
```bash
npm install @anthropic-ai/sdk
```

### 2. Configure Environment
Add to your `.env` file:
```bash
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

Get your API key from: https://console.anthropic.com/

### 3. Start Server
The agent routes are automatically loaded when you start the server:
```bash
npm start
```

## API Endpoints

### Conversational Interface

#### POST `/api/agent/chat`
Have a natural conversation with the agent.

**Request:**
```json
{
  "userId": "user-uuid",
  "message": "Check my Strava connection",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "success": true,
  "response": "I checked your Strava connection. Your token is valid and expires in 45 days...",
  "conversationHistory": [...],
  "toolsUsed": 2
}
```

### Quick Actions

#### POST `/api/agent/diagnose`
Quickly diagnose OAuth issues.

**Request:**
```json
{
  "userId": "user-uuid",
  "provider": "strava"
}
```

#### POST `/api/agent/query`
Natural language data query.

**Request:**
```json
{
  "userId": "user-uuid",
  "query": "Show me my runs from last week"
}
```

#### GET `/api/agent/health`
Get complete system health status.

#### GET `/api/agent/status/:userId`
Get OAuth connection status for a user.

#### POST `/api/agent/refresh/:userId/:provider`
Manually refresh a token.

#### POST `/api/agent/revoke/:userId/:provider`
Disconnect a provider.

### Monitoring & Metrics

#### GET `/api/agent/metrics`
Get system performance metrics.

#### GET `/api/agent/alerts`
Get current system alerts.

Query parameters:
- `severity`: CRITICAL, HIGH, MEDIUM, LOW
- `type`: Alert type
- `unacknowledged`: true/false

#### POST `/api/agent/alerts/:alertId/acknowledge`
Acknowledge an alert.

#### POST `/api/agent/monitor/tokens`
Run token health monitoring for all users.

#### POST `/api/agent/monitor/apis`
Run API health checks.

## Usage Examples

### Example 1: OAuth Debugging
```javascript
// User reports Garmin connection isn't working
const response = await fetch('/api/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '123',
    message: 'My Garmin connection stopped working'
  })
});

const result = await response.json();
console.log(result.response);
// "I found the issue: your Garmin token expired 2 days ago..."
```

### Example 2: Natural Language Query
```javascript
const response = await fetch('/api/agent/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: '123',
    query: 'How many miles did I run this month?'
  })
});

const result = await response.json();
console.log(result.response);
```

### Example 3: System Monitoring
```javascript
// Run in a cron job every hour
const response = await fetch('/api/agent/monitor/tokens', {
  method: 'POST'
});

const result = await response.json();
console.log(`Monitored ${result.totalUsers} users`);
console.log(`Auto-refreshed ${result.refreshedTokens} tokens`);
console.log(`Alerts: ${result.alerts.length}`);
```

### Example 4: Direct Tool Usage
```javascript
const ApiOAuthSpecialistAgent = require('./backend/agents/api-oauth-specialist');

const agent = new ApiOAuthSpecialistAgent();

// Use the agent conversationally
const result = await agent.processMessage(
  'user-123',
  'Check all my connected devices and tell me if there are any issues'
);

console.log(result.response);

// Or use helper methods
const diagnosis = await agent.diagnoseUserOAuthIssue('user-123', 'strava');
const data = await agent.queryUserData('user-123', 'show my sleep from last week');
const health = await agent.performHealthCheck();
```

## Tool Reference

### OAuth Tools
- `validateOAuthToken(userId, provider)` - Check token validity
- `diagnoseOAuthIssue(provider, errorDetails)` - Diagnose OAuth errors
- `getOAuthStatus(userId)` - Get all provider connection status
- `testOAuthToken(userId, provider)` - Test with real API call

### Token Tools
- `refreshOAuthToken(userId, provider)` - Refresh expired token
- `autoRefreshIfNeeded(userId, provider, bufferMinutes)` - Auto-refresh if needed
- `revokeOAuthToken(userId, provider)` - Disconnect provider
- `getTokenHealth(userId)` - Get health status of all tokens
- `bulkRefreshTokens(userId)` - Refresh all expired tokens

### API Call Tools
- `makeAuthenticatedCall(userId, provider, endpoint, options)` - Make API call with retry
- `batchApiCalls(calls, options)` - Execute multiple calls efficiently
- `checkRateLimit(provider, endpoint)` - Check rate limit status
- `getRateLimitStatus(provider)` - Get detailed rate limit info
- `clearRateLimits(provider)` - Clear rate limits (testing)

### Data Query Tools
- `getActivities(userId, provider, params)` - Get activity data
- `getSleepData(userId, provider, params)` - Get sleep data
- `getRecoveryData(userId, provider, params)` - Get recovery data
- `getStoredMetrics(userId, params)` - Get data from database
- `queryFitnessData(userId, query)` - Natural language query

### Monitoring Tools
- `monitorAllTokens()` - Monitor all users' tokens
- `healthCheckAPIs()` - Check all API integrations
- `trackApiCall(provider, endpoint, success, duration, statusCode)` - Log metrics
- `trackError(provider, endpoint, error, context)` - Log errors
- `createAlert(alert)` - Create system alert
- `getAlerts(filters)` - Get current alerts
- `acknowledgeAlert(alertId)` - Acknowledge alert
- `getMetricsSummary()` - Get overall metrics
- `resetMetrics()` - Reset metrics counters

## Monitoring & Alerts

The agent automatically monitors:
- Token expiration (alerts 24 hours before)
- Failed token refreshes
- High API error rates (>50% over 10 calls)
- Repeated errors (5+ of same type)
- Missing environment variables

Alert severities:
- **CRITICAL**: Missing credentials, security issues
- **HIGH**: Token refresh failures, authentication errors
- **MEDIUM**: Tokens expiring soon, repeated errors
- **LOW**: Informational notices

## Best Practices

1. **Set up scheduled monitoring**: Run `POST /api/agent/monitor/tokens` hourly via cron
2. **Monitor alerts**: Check `GET /api/agent/alerts?unacknowledged=true` regularly
3. **Use natural language**: Let the agent parse complex queries
4. **Let it auto-fix**: The agent will automatically refresh expired tokens
5. **Review metrics**: Check `GET /api/agent/metrics` for performance insights

## Rate Limits

Built-in rate limits per provider (per minute):
- Strava: 100 requests per 15 minutes
- Oura: 5000 requests per day
- Garmin: 500 requests per minute (conservative)
- Whoop: 100 requests per minute (conservative)

The agent automatically queues requests to stay within limits.

## Error Handling

The agent handles:
- Expired tokens → Auto-refresh or prompt reconnection
- Rate limit exceeded → Queue and retry after window
- Network errors → Exponential backoff retry (3 attempts)
- Invalid credentials → Alert and diagnostic report
- API errors → Parse and provide actionable solutions

## Production Considerations

1. **Use Redis for rate limits**: The current implementation uses in-memory storage
2. **Add authentication**: Protect agent endpoints with proper auth
3. **Set up logging**: Pipe agent logs to monitoring service
4. **Monitor costs**: Track Claude API usage via Anthropic console
5. **Configure webhooks**: For real-time alerts to Slack/email
6. **Schedule monitoring**: Use cron jobs or background workers

## Troubleshooting

**Agent not initializing?**
- Check `ANTHROPIC_API_KEY` is set in environment
- Verify API key is valid at https://console.anthropic.com/

**Tools not working?**
- Check database connection
- Verify OAuth credentials are set
- Review server logs for errors

**Rate limits too restrictive?**
- Adjust limits in `backend/agents/tools/api-call-tools.js`
- Consider provider-specific limits

**High API costs?**
- Agent caches results where possible
- Consider using smaller model for simple queries
- Review conversation history length

## Contributing

To add new tools:

1. Create tool function in appropriate file under `tools/`
2. Add tool schema to `api-oauth-specialist.js` `registerTools()`
3. Map tool name to function in `executeTool()`
4. Update system prompt with tool description
5. Add documentation to this README

## License

Part of the Athlytx platform.
