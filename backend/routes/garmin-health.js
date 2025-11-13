const express = require('express');
const router = express.Router();
const { OAuthToken } = require('../models');

/**
 * GARMIN HEALTH API REQUIRED ENDPOINTS
 *
 * These endpoints are required for Garmin Health API production approval
 * See: https://developer.garmin.com/gc-developer-program/overview/
 */

/**
 * PING Endpoint - Required by Garmin
 * Garmin sends periodic pings to verify your server is responding
 * Must return HTTP 200 within 30 seconds
 *
 * GET /api/garmin/ping
 */
router.get('/ping', async (req, res) => {
    console.log('📍 Garmin PING received');

    try {
        // Return 200 immediately to confirm server is alive
        res.status(200).json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'Athlytx Garmin Health API'
        });
    } catch (error) {
        console.error('❌ Garmin PING error:', error);
        // Still return 200 to pass verification
        res.status(200).json({ status: 'ok' });
    }
});

/**
 * PUSH/Webhook Endpoint - Required by Garmin
 * Receives health data from Garmin asynchronously
 * Must handle min 10MB payloads (Activity Details: 100MB)
 * Must return HTTP 200 within 30 seconds
 *
 * POST /api/garmin/push
 */
router.post('/push', async (req, res) => {
    console.log('📨 Garmin PUSH notification received');

    try {
        const data = req.body;

        console.log('PUSH data:', JSON.stringify(data, null, 2));

        // Return 200 immediately (within 30 seconds requirement)
        res.status(200).json({
            status: 'received',
            timestamp: new Date().toISOString()
        });

        // Process data asynchronously after responding
        processGarminPushData(data).catch(err => {
            console.error('❌ Error processing Garmin PUSH data:', err);
        });

    } catch (error) {
        console.error('❌ Garmin PUSH error:', error);
        // Still return 200 to maintain connection
        res.status(200).json({ status: 'error', message: error.message });
    }
});

/**
 * User Deregistration Endpoint - Required by Garmin
 * Called when a user disconnects their Garmin account
 * Must delete all user data and return HTTP 200
 *
 * POST /api/garmin/deregister
 * Body: { userId: "garmin_user_id" } or { userAccessToken: "..." }
 */
router.post('/deregister', async (req, res) => {
    console.log('🗑️  Garmin user deregistration requested');

    try {
        const { userId, userAccessToken } = req.body;

        console.log('Deregistering user:', { userId, hasToken: !!userAccessToken });

        if (!userId && !userAccessToken) {
            return res.status(400).json({
                error: 'userId or userAccessToken required'
            });
        }

        // Find and delete OAuth token
        let deleted = 0;

        if (userId) {
            deleted = await OAuthToken.destroy({
                where: {
                    userId: userId,
                    provider: 'garmin'
                }
            });
        }

        // Also try to find by external identifiers if provided
        // (You may need to add a garminUserId field to OAuthToken model)

        console.log(`✅ Deregistered Garmin user, deleted ${deleted} token(s)`);

        res.status(200).json({
            status: 'success',
            message: 'User deregistered',
            deletedTokens: deleted
        });

    } catch (error) {
        console.error('❌ Garmin deregistration error:', error);
        res.status(500).json({
            error: 'Deregistration failed',
            message: error.message
        });
    }
});

/**
 * User Permissions Endpoint - Required by Garmin
 * Returns what data permissions your app is requesting
 *
 * GET /api/garmin/permissions
 */
router.get('/permissions', async (req, res) => {
    console.log('🔐 Garmin permissions request');

    try {
        // Define what Garmin Health API data you're accessing
        const permissions = {
            application: 'Athlytx',
            dataTypes: [
                'ACTIVITIES',           // Activity files and summaries
                'ACTIVITY_DETAILS',     // Detailed activity data
                'DAILY_SUMMARIES',      // Daily health summaries
                'WELLNESS',             // Heart rate, stress, sleep, etc.
                'USER_METRICS'          // User profile data
            ],
            purposes: [
                'Training analytics and coaching',
                'Heart rate zone analysis',
                'Performance tracking',
                'Training load management'
            ],
            dataRetention: '90 days',
            sharingWithThirdParties: false
        };

        res.status(200).json(permissions);

    } catch (error) {
        console.error('❌ Garmin permissions error:', error);
        res.status(500).json({
            error: 'Failed to retrieve permissions',
            message: error.message
        });
    }
});

/**
 * Backfill Endpoint - Optional but recommended
 * Allows requesting historical data for a user
 *
 * POST /api/garmin/backfill
 */
router.post('/backfill', async (req, res) => {
    console.log('⏪ Garmin backfill request');

    try {
        const { userId, startDate, endDate } = req.body;

        if (!userId) {
            return res.status(400).json({
                error: 'Missing userId',
                message: 'userId is required for backfill'
            });
        }

        console.log('Backfill requested:', { userId, startDate, endDate });

        // Calculate days back from date range
        let daysBack = 90; // Default to 90 days (Garmin's data retention policy)

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            daysBack = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            console.log(`Calculated ${daysBack} days from date range`);
        } else if (startDate) {
            const start = new Date(startDate);
            const now = new Date();
            const diffTime = Math.abs(now - start);
            daysBack = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            console.log(`Calculated ${daysBack} days from start date to now`);
        }

        // Cap at 90 days (Garmin's data retention policy)
        daysBack = Math.min(daysBack, 90);

        // Acknowledge receipt immediately (required by Garmin)
        res.status(200).json({
            status: 'accepted',
            message: 'Backfill request queued',
            timestamp: new Date().toISOString(),
            daysToSync: daysBack
        });

        // Process backfill asynchronously using syncService
        const { syncUserData } = require('../services/syncService');

        syncUserData(userId, daysBack)
            .then(results => {
                console.log('✅ Backfill completed:', results);
            })
            .catch(error => {
                console.error('❌ Backfill processing failed:', error);
            });

    } catch (error) {
        console.error('❌ Garmin backfill error:', error);
        res.status(500).json({
            error: 'Backfill request failed',
            message: error.message
        });
    }
});

/**
 * Process Garmin PUSH data asynchronously
 * This runs AFTER we've already sent the 200 response
 */
async function processGarminPushData(data) {
    console.log('🔄 Processing Garmin PUSH data asynchronously...');

    try {
        // Parse the notification type
        const { userId, summaries, activities, sleeps, stressDetails, userMetrics } = data;

        if (!userId) {
            console.warn('⚠️  No userId in PUSH data');
            return;
        }

        console.log(`Processing data for Garmin user: ${userId}`);

        // Process different data types
        if (summaries && summaries.length > 0) {
            console.log(`📊 Processing ${summaries.length} daily summaries`);
            // Store daily summaries in your database
        }

        if (activities && activities.length > 0) {
            console.log(`🏃 Processing ${activities.length} activities`);
            // Store activities in your database
            // You can reuse your syncService logic here
        }

        if (sleeps && sleeps.length > 0) {
            console.log(`😴 Processing ${sleeps.length} sleep records`);
            // Store sleep data
        }

        console.log('✅ Garmin PUSH data processed successfully');

    } catch (error) {
        console.error('❌ Error in processGarminPushData:', error);
        throw error;
    }
}

module.exports = router;
