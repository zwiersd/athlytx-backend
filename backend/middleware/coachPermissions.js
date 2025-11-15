/**
 * Coach Permission Middleware
 *
 * Purpose: Check if coach can access athlete data
 * Works with BOTH old system (CoachAthlete only) and new system (CoachAthlete + DeviceShares)
 */

const { CoachAthlete, DeviceShare } = require('../models');
const { Op } = require('sequelize');
const { useNewInviteSystem } = require('../utils/featureFlags');

/**
 * Check if coach can view athlete data
 * @param {string} coachId - UUID of coach
 * @param {string} athleteId - UUID of athlete
 * @param {boolean} requireDeviceShares - Whether to check DeviceShares (new system)
 * @returns {Promise<boolean>}
 */
async function canCoachViewAthlete(coachId, athleteId, requireDeviceShares = null) {
    try {
        // Auto-detect if we should check DeviceShares based on feature flag
        const checkDeviceShares = requireDeviceShares !== null
            ? requireDeviceShares
            : useNewInviteSystem();

        console.log('[PERMISSION] Checking coach access:', {
            coachId,
            athleteId,
            checkDeviceShares,
            featureFlagEnabled: useNewInviteSystem()
        });

        // 1. Check active CoachAthlete relationship
        const relationship = await CoachAthlete.findOne({
            where: {
                coachId,
                athleteId,
                status: 'active'
            }
        });

        if (!relationship) {
            console.log('[PERMISSION] ❌ No active relationship found');
            return false;
        }

        console.log('[PERMISSION] ✓ Active relationship found');

        // 2. If new system, also check DeviceShares
        if (checkDeviceShares) {
            const shareCount = await DeviceShare.count({
                where: {
                    coachId,
                    athleteId,
                    revokedAt: null // Must not be revoked
                }
            });

            if (shareCount === 0) {
                console.log('[PERMISSION] ❌ No device shares found');
                return false;
            }

            console.log('[PERMISSION] ✓ Found', shareCount, 'device shares');
        }

        return true;

    } catch (error) {
        console.error('[PERMISSION] Error checking permissions:', error);
        return false;
    }
}

/**
 * Check if coach can view specific device data
 * @param {string} coachId - UUID of coach
 * @param {string} athleteId - UUID of athlete
 * @param {string} deviceId - UUID of device/OAuthToken
 * @returns {Promise<boolean>}
 */
async function canCoachViewDevice(coachId, athleteId, deviceId) {
    try {
        console.log('[PERMISSION] Checking device access:', { coachId, athleteId, deviceId });

        // 1. Check active relationship
        const relationship = await CoachAthlete.findOne({
            where: { coachId, athleteId, status: 'active' }
        });

        if (!relationship) {
            console.log('[PERMISSION] ❌ No active relationship');
            return false;
        }

        // 2. If new system, check specific DeviceShare
        if (useNewInviteSystem()) {
            const share = await DeviceShare.findOne({
                where: {
                    coachId,
                    athleteId,
                    deviceId,
                    revokedAt: null
                }
            });

            if (!share) {
                console.log('[PERMISSION] ❌ No device share found');
                return false;
            }

            console.log('[PERMISSION] ✓ Device share found');
        }

        return true;

    } catch (error) {
        console.error('[PERMISSION] Error checking device permissions:', error);
        return false;
    }
}

/**
 * Express middleware to protect coach routes
 * Use: router.get('/athlete/:athleteId/data', requireCoachAccess, ...)
 */
async function requireCoachAccess(req, res, next) {
    try {
        const coachId = req.body.coachId || req.query.coachId;
        const athleteId = req.params.athleteId || req.body.athleteId || req.query.athleteId;

        if (!coachId || !athleteId) {
            return res.status(400).json({ error: 'Coach ID and Athlete ID required' });
        }

        const hasAccess = await canCoachViewAthlete(coachId, athleteId);

        if (!hasAccess) {
            console.log('[PERMISSION] ❌ Access denied:', { coachId, athleteId });
            return res.status(403).json({ error: 'Access denied. No permission to view this athlete.' });
        }

        console.log('[PERMISSION] ✓ Access granted:', { coachId, athleteId });
        next();

    } catch (error) {
        console.error('[PERMISSION] Middleware error:', error);
        res.status(500).json({ error: 'Permission check failed' });
    }
}

module.exports = {
    canCoachViewAthlete,
    canCoachViewDevice,
    requireCoachAccess
};
