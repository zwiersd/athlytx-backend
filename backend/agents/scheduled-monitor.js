/**
 * Scheduled Monitoring Service
 * Automatically monitors OAuth tokens and API health
 *
 * Usage in server.js:
 * const scheduledMonitor = require('./backend/agents/scheduled-monitor');
 * scheduledMonitor.start();
 */

const cron = require('node-cron');
const monitoringTools = require('./tools/monitoring-tools');

class ScheduledMonitor {
    constructor() {
        this.tasks = [];
        this.isRunning = false;
    }

    /**
     * Start all scheduled monitoring tasks
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️  Scheduled monitoring already running');
            return;
        }

        console.log('🔄 Starting scheduled monitoring...');

        // Monitor tokens every hour
        const tokenMonitorTask = cron.schedule('0 * * * *', async () => {
            console.log('⏰ Running scheduled token health check...');
            try {
                const result = await monitoringTools.monitorAllTokens();
                console.log(`✅ Token monitoring complete:`, {
                    users: result.usersWithTokens,
                    tokens: result.totalTokens,
                    healthy: result.healthyTokens,
                    refreshed: result.refreshedTokens,
                    alerts: result.alerts.length
                });

                // Log any critical alerts
                const criticalAlerts = result.alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
                if (criticalAlerts.length > 0) {
                    console.warn(`🚨 ${criticalAlerts.length} critical alerts detected`);
                    criticalAlerts.forEach(alert => {
                        console.warn(`   - [${alert.severity}] ${alert.type}: ${alert.message}`);
                    });
                }
            } catch (error) {
                console.error('❌ Token monitoring failed:', error);
            }
        });

        this.tasks.push({ name: 'Token Monitoring', task: tokenMonitorTask });

        // API health check every 6 hours
        const apiHealthTask = cron.schedule('0 */6 * * *', async () => {
            console.log('⏰ Running scheduled API health check...');
            try {
                const result = await monitoringTools.healthCheckAPIs();
                console.log('✅ API health check complete:', {
                    overall: result.overall,
                    providers: Object.keys(result.providers).length
                });

                // Log any unhealthy APIs
                const unhealthy = Object.entries(result.providers)
                    .filter(([_, status]) => status.status !== 'healthy');

                if (unhealthy.length > 0) {
                    console.warn(`⚠️  ${unhealthy.length} APIs not healthy`);
                    unhealthy.forEach(([provider, status]) => {
                        console.warn(`   - ${provider}: ${status.status} - ${status.message}`);
                    });
                }
            } catch (error) {
                console.error('❌ API health check failed:', error);
            }
        });

        this.tasks.push({ name: 'API Health Check', task: apiHealthTask });

        // Metrics summary daily at midnight
        const metricsTask = cron.schedule('0 0 * * *', () => {
            console.log('⏰ Generating daily metrics summary...');
            try {
                const metrics = monitoringTools.getMetricsSummary();
                console.log('📊 Daily Metrics Summary:');
                console.log(`   API Calls: ${metrics.apiCalls.total} (${metrics.apiCalls.successRate} success rate)`);
                console.log(`   Errors: ${metrics.errors.total} (${metrics.errors.uniqueTypes} unique types)`);
                console.log(`   Token Refreshes: ${metrics.tokenRefreshes}`);
                console.log(`   Alerts: ${metrics.alerts.total} (${metrics.alerts.unacknowledged} unacknowledged)`);

                // Reset metrics after reporting
                monitoringTools.resetMetrics();
                console.log('✅ Metrics reset for new day');
            } catch (error) {
                console.error('❌ Metrics summary failed:', error);
            }
        });

        this.tasks.push({ name: 'Daily Metrics', task: metricsTask });

        this.isRunning = true;
        console.log(`✅ Started ${this.tasks.length} scheduled monitoring tasks:`);
        this.tasks.forEach(({ name }) => {
            console.log(`   - ${name}`);
        });
    }

    /**
     * Stop all scheduled monitoring tasks
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️  Scheduled monitoring not running');
            return;
        }

        console.log('🛑 Stopping scheduled monitoring...');

        this.tasks.forEach(({ name, task }) => {
            task.stop();
            console.log(`   Stopped: ${name}`);
        });

        this.tasks = [];
        this.isRunning = false;
        console.log('✅ Scheduled monitoring stopped');
    }

    /**
     * Get status of scheduled tasks
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            taskCount: this.tasks.length,
            tasks: this.tasks.map(({ name }) => name)
        };
    }

    /**
     * Run token monitoring immediately (useful for testing)
     */
    async runTokenMonitoringNow() {
        console.log('🔄 Running token monitoring immediately...');
        return await monitoringTools.monitorAllTokens();
    }

    /**
     * Run API health check immediately
     */
    async runHealthCheckNow() {
        console.log('🔄 Running API health check immediately...');
        return await monitoringTools.healthCheckAPIs();
    }
}

// Export singleton instance
const scheduledMonitor = new ScheduledMonitor();

module.exports = scheduledMonitor;
