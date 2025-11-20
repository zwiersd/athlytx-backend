/**
 * One-time endpoint to register existing Garmin users for PUSH notifications
 *
 * Call this endpoint once to fix the "no data in last 24 hours" issue
 * by registering all existing authorized Garmin users.
 */

const express = require('express');
const router = express.Router();
const { OAuthToken, User } = require('../models');
const { decrypt } = require('../utils/encryption');

router.post('/register-existing-users', async (req, res) => {
    console.log('\n' + '='.repeat(60));
    console.log('REGISTERING EXISTING GARMIN USERS FOR PUSH NOTIFICATIONS');
    console.log('='.repeat(60));

    try {
        // Get all Garmin OAuth tokens
        const tokens = await OAuthToken.findAll({
            where: {
                provider: 'garmin'
            }
        });

        console.log(`Found ${tokens.length} Garmin user(s) to register\n`);

        if (tokens.length === 0) {
            return res.json({
                success: true,
                message: 'No Garmin users found',
                registered: 0
            });
        }

        const results = [];
        const GarminOAuth1Hybrid = require('../utils/garmin-oauth1-hybrid');

        for (const token of tokens) {
            console.log(`\nRegistering user ${token.userId} (Garmin ID: ${token.providerUserId || 'unknown'})...`);

            try {
                // Decrypt the access token
                const accessToken = decrypt(token.accessTokenEncrypted);

                if (!accessToken) {
                    console.log(`  ❌ User ${token.userId} has no access token - skipping`);
                    results.push({
                        userId: token.userId,
                        garminUserId: token.providerUserId,
                        success: false,
                        error: 'No access token found'
                    });
                    continue;
                }

                const signer = new GarminOAuth1Hybrid(
                    process.env.GARMIN_CONSUMER_KEY,
                    process.env.GARMIN_CONSUMER_SECRET
                );

                const pushRegUrl = 'https://apis.garmin.com/wellness-api/rest/user/registration';
                const authHeader = signer.generateAuthHeader('POST', pushRegUrl, {}, accessToken);

                console.log('  Calling:', pushRegUrl);

                let response = await fetch(pushRegUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: authHeader,
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                let responseText = await response.text();
                console.log('  Response:', response.status, responseText);

                // If unauthorized, try refreshing token once (if refresh token available)
                if (response.status === 401 && token.refreshTokenEncrypted) {
                    try {
                        console.log('  🔄 Attempting token refresh for user', token.userId);
                        const refreshToken = decrypt(token.refreshTokenEncrypted);
                        const credentials = Buffer.from(
                            `${process.env.GARMIN_CONSUMER_KEY}:${process.env.GARMIN_CONSUMER_SECRET}`
                        ).toString('base64');

                        const refreshResp = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Authorization': `Basic ${credentials}`
                            },
                            body: new URLSearchParams({
                                grant_type: 'refresh_token',
                                refresh_token: refreshToken
                            })
                        });

                        const refreshData = await refreshResp.json();
                        console.log('  🔄 Refresh status:', refreshResp.status, !!refreshData.access_token);
                        if (refreshResp.ok && refreshData.access_token) {
                            // Update DB token
                            const { encrypt } = require('../utils/encryption');
                            token.accessTokenEncrypted = encrypt(refreshData.access_token);
                            if (refreshData.refresh_token) {
                                token.refreshTokenEncrypted = encrypt(refreshData.refresh_token);
                            }
                            if (refreshData.expires_in) {
                                token.expiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
                            }
                            await token.save();

                            // Retry registration
                            const retryAuthHeader = signer.generateAuthHeader('POST', pushRegUrl, {}, refreshData.access_token);
                            response = await fetch(pushRegUrl, {
                                method: 'POST',
                                headers: {
                                    Authorization: retryAuthHeader,
                                    Accept: 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({})
                            });
                            responseText = await response.text();
                            console.log('  🔁 Retry response:', response.status, responseText);
                        }
                    } catch (refreshErr) {
                        console.log('  ❌ Refresh attempt failed:', refreshErr.message);
                    }
                }

                if (response.ok || response.status === 409) {
                    console.log(`  ✅ User ${token.userId} registered successfully`);
                    results.push({
                        userId: token.userId,
                        garminUserId: token.providerUserId,
                        success: true,
                        status: response.status,
                        alreadyRegistered: response.status === 409
                    });
                } else {
                    console.log(`  ❌ User ${token.userId} registration failed:`, response.status);
                    results.push({
                        userId: token.userId,
                        garminUserId: token.providerUserId,
                        success: false,
                        status: response.status,
                        error: responseText
                    });
                }

                // Wait 1 second between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.log(`  ❌ Error for user ${token.userId}:`, error.message);
                results.push({
                    userId: token.userId,
                    success: false,
                    error: error.message
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const alreadyRegistered = results.filter(r => r.alreadyRegistered).length;

        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Successfully registered: ${successful}/${results.length}`);
        console.log(`ℹ️  Already registered: ${alreadyRegistered}/${results.length}`);
        console.log(`❌ Failed: ${failed}/${results.length}`);
        console.log('='.repeat(60) + '\n');

        res.json({
            success: true,
            total: results.length,
            registered: successful,
            alreadyRegistered: alreadyRegistered,
            failed: failed,
            results: results
        });

    } catch (error) {
        console.error('❌ Fatal error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

/**
 * Admin: Consolidate Garmin ownership for a user (by userId or email)
 * POST /api/garmin/admin/consolidate
 * Body: { userId?: string, email?: string }
 */
router.post('/consolidate', async (req, res) => {
    try {
        const { userId, email } = req.body;

        let user = null;
        if (email) {
            user = await User.findOne({ where: { email } });
        } else if (userId) {
            user = await User.findByPk(userId);
        }

        if (!user) {
            return res.status(400).json({ error: 'Target user not found (provide valid userId or email)' });
        }

        const { consolidateUserOwnership } = require('../utils/consolidate');
        const result = await consolidateUserOwnership(user.id);
        res.json({ success: true, userId: user.id, email: user.email, result });
    } catch (error) {
        console.error('❌ Consolidation error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Admin: Register a specific user for Garmin Health PUSH (uses newest token)
 * POST /api/garmin/admin/register-user
 * Body: { userId: string }
 */
router.post('/register-user', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'userId required' });
        }

        const token = await OAuthToken.findOne({
            where: { userId, provider: 'garmin' },
            order: [['connectedAt', 'DESC']]
        });

        if (!token || !token.accessTokenEncrypted) {
            return res.status(404).json({ error: 'No Garmin token found for user' });
        }

        const accessToken = decrypt(token.accessTokenEncrypted);
        const { signAndFetch } = require('../utils/garmin-api');
        const response = await signAndFetch('/user/registration', 'POST', accessToken, {});
        const bodyText = await response.text();

        const payload = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            body: bodyText
        };

        if (!response.ok && response.status !== 409) {
            return res.status(response.status).json({ success: false, ...payload });
        }

        res.json({ success: true, ...payload });
    } catch (error) {
        console.error('❌ Register user error:', error);
        res.status(500).json({ error: error.message });
    }
});
