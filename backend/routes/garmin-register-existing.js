/**
 * One-time endpoint to register existing Garmin users for PUSH notifications
 *
 * Call this endpoint once to fix the "no data in last 24 hours" issue
 * by registering all existing authorized Garmin users.
 */

const express = require('express');
const router = express.Router();
const { OAuthToken } = require('../models');
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

                const response = await fetch(pushRegUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: authHeader,
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                const responseText = await response.text();
                console.log('  Response:', response.status, responseText);

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
