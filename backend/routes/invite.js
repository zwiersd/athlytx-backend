const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { Invite, User, OAuthToken, CoachAthlete, DeviceShare } = require('../models');
const { Op } = require('sequelize');
const { logInviteEvent, logConsentEvent, logError } = require('../utils/logger');
const { sendAthleteConfirmation, sendCoachConfirmation } = require('../utils/email');
const { timingSafeEqual, isValidUUID } = require('../utils/crypto');

/**
 * Invite Routes
 *
 * Handles invitation acceptance and device sharing consent
 */

// ✅ SECURITY FIX: Rate limiting for consent acceptance
const consentRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 consent attempts per window
    message: {
        error: 'Too many consent attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Rate limit by IP (defaults to proper IPv6 handling)
    skipSuccessfulRequests: false
});

// ✅ SECURITY FIX: Rate limiting for invite details/acceptance
const inviteRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // Max 20 requests per window (generous for legitimate use)
    message: {
        error: 'Too many invite requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

/**
 * GET /api/invite/accept?token={token}
 * ⭐ CRITICAL ENDPOINT - Device detection logic
 *
 * Three possible paths:
 * PATH A: Existing user WITH devices → Show consent screen
 * PATH B: Existing user WITHOUT devices → Onboarding (must connect devices)
 * PATH C: New user → Onboarding (must connect devices)
 */
router.get('/accept', inviteRateLimiter, async (req, res) => {
    try {
        const { token } = req.query;

        logInviteEvent('ACCEPT_INITIATED', {}); // ✅ Don't log token

        if (!token) {
            return res.status(400).json({ error: 'Invitation token required' });
        }

        // ✅ SECURITY FIX: Validate UUID format first (prevents malformed token queries)
        if (!isValidUUID(token)) {
            // Constant delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 100));
            return res.status(404).json({
                error: 'Invalid or expired invitation',
                code: 'INVITE_NOT_FOUND'
            });
        }

        // ✅ SECURITY FIX: Fetch ALL potentially valid invites (not expired/accepted/revoked)
        // Then compare tokens in constant time
        const pendingInvites = await Invite.findAll({
            where: {
                acceptedAt: null,
                revokedAt: null,
                expiresAt: { [Op.gt]: new Date() }
            },
            include: [{
                model: User,
                as: 'Coach',
                attributes: ['id', 'name', 'email']
            }],
            limit: 100 // Reasonable limit to prevent abuse
        });

        // ✅ SECURITY FIX: Constant-time token comparison
        let invite = null;
        for (const inv of pendingInvites) {
            if (timingSafeEqual(inv.inviteToken, token)) {
                invite = inv;
                break;
            }
        }

        if (!invite) {
            logInviteEvent('ACCEPT_FAILED', { reason: 'Invalid or expired token' });
            // ✅ Always take same time regardless of reason for failure
            await new Promise(resolve => setTimeout(resolve, 100));
            return res.status(404).json({
                error: 'Invalid or expired invitation',
                code: 'INVITE_NOT_FOUND'
            });
        }

        console.log('[INVITE-ACCEPT] Valid invite found for:', invite.athleteEmail);
        logInviteEvent('INVITE_VALIDATED', {
            athleteEmail: invite.athleteEmail,
            coachId: invite.coachId
        });

        // ⭐ CRITICAL: Check if user exists
        const existingUser = await User.findOne({
            where: { email: invite.athleteEmail.toLowerCase().trim() }
        });

        if (existingUser) {
            console.log('[INVITE-ACCEPT] Existing user found:', existingUser.id);

            // ⭐ CRITICAL: Check for devices
            const devices = await OAuthToken.findAll({
                where: {
                    userId: existingUser.id,
                    // Only active devices (not expired)
                    expiresAt: {
                        [Op.or]: [
                            { [Op.gt]: new Date() },
                            { [Op.is]: null }
                        ]
                    }
                },
                order: [['connectedAt', 'DESC']]
            });

            console.log('[INVITE-ACCEPT] Found', devices.length, 'active devices');

            if (devices.length > 0) {
                // PATH A: Existing user WITH devices → Consent screen
                console.log('[INVITE-ACCEPT] PATH A: Existing user with devices');
                logInviteEvent('PATH_A_CONSENT', {
                    userId: existingUser.id,
                    deviceCount: devices.length
                });

                return res.json({
                    onboardNeeded: false,
                    existingDevices: devices.map(d => ({
                        id: d.id,
                        provider: d.provider,
                        connectedAt: d.connectedAt,
                        lastSync: d.lastSyncAt
                    })),
                    requireConsent: true,
                    user: {
                        id: existingUser.id,
                        email: existingUser.email,
                        name: existingUser.name
                    },
                    coach: {
                        id: invite.Coach.id,
                        name: invite.Coach.name,
                        email: invite.Coach.email
                    },
                    invite: {
                        message: invite.message,
                        role: invite.roleRequested
                    }
                });
            } else {
                // PATH B: Existing user WITHOUT devices → Onboarding
                console.log('[INVITE-ACCEPT] PATH B: User exists but no devices');
                logInviteEvent('PATH_B_ONBOARDING', { userId: existingUser.id });

                return res.json({
                    onboardNeeded: true,
                    requireDeviceConnect: true,
                    user: {
                        id: existingUser.id,
                        email: existingUser.email,
                        name: existingUser.name
                    },
                    coach: {
                        id: invite.Coach.id,
                        name: invite.Coach.name,
                        email: invite.Coach.email
                    },
                    invite: {
                        message: invite.message,
                        role: invite.roleRequested
                    }
                });
            }
        } else {
            // PATH C: New user → Onboarding
            console.log('[INVITE-ACCEPT] PATH C: New user');
            logInviteEvent('PATH_C_NEW_USER', { athleteEmail: invite.athleteEmail });

            return res.json({
                onboardNeeded: true,
                requireDeviceConnect: true,
                newUser: true,
                athleteEmail: invite.athleteEmail,
                coach: {
                    id: invite.Coach.id,
                    name: invite.Coach.name,
                    email: invite.Coach.email
                },
                invite: {
                    message: invite.message,
                    role: invite.roleRequested
                }
            });
        }

    } catch (error) {
        console.error('[INVITE-ACCEPT] Error:', error);
        logError('INVITE_ACCEPT', error);
        res.status(500).json({
            error: 'Failed to process invitation',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * POST /api/invite/accept-with-consent
 * PATH A: Existing user accepts and consents to share devices
 *
 * SECURITY: Requires authentication via session token
 * SECURITY: Rate limited to 5 attempts per 15 minutes
 */
router.post('/accept-with-consent', consentRateLimiter, async (req, res) => {
    const { sequelize } = require('../models');

    try {
        const { token, deviceIds, consent } = req.body;

        // ✅ SECURITY FIX #1: Get session token from Authorization header
        const authHeader = req.headers.authorization;
        const sessionToken = authHeader?.replace('Bearer ', '') || req.body.sessionToken;

        logConsentEvent('CONSENT_INITIATED', { deviceCount: deviceIds?.length });

        // ✅ SECURITY FIX #2: Validate authentication FIRST
        if (!sessionToken) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'UNAUTHORIZED'
            });
        }

        // ✅ SECURITY FIX #3: Authenticate user via session
        const authenticatedUser = await User.findOne({
            where: {
                sessionToken,
                sessionExpiry: { [Op.gt]: new Date() }
            }
        });

        if (!authenticatedUser) {
            return res.status(401).json({
                error: 'Invalid or expired session',
                code: 'SESSION_EXPIRED'
            });
        }

        // ✅ FIX #4: Validate required fields
        if (!token || !deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['token', 'deviceIds']
            });
        }

        // ✅ FIX #5: Validate device limit (max 10 devices)
        if (deviceIds.length > 10) {
            return res.status(400).json({
                error: 'Maximum 10 devices can be shared at once',
                code: 'TOO_MANY_DEVICES'
            });
        }

        if (!consent) {
            return res.status(400).json({
                error: 'Consent required',
                code: 'CONSENT_REQUIRED'
            });
        }

        // ✅ FIX #6: Validate invite BEFORE starting transaction (with expiry check)
        const invite = await Invite.findOne({
            where: {
                inviteToken: token,
                athleteEmail: authenticatedUser.email.toLowerCase(), // ✅ Verify email matches
                acceptedAt: null,
                revokedAt: null,
                expiresAt: { [Op.gt]: new Date() } // ✅ Check expiry
            }
        });

        if (!invite) {
            return res.status(403).json({
                error: 'Invalid invitation for this user',
                code: 'INVALID_INVITE'
            });
        }

        // ✅ FIX #7: Validate all deviceIds belong to authenticated user
        const userDevices = await OAuthToken.findAll({
            where: {
                id: { [Op.in]: deviceIds },
                userId: authenticatedUser.id // ✅ Ensure ownership
            }
        });

        if (userDevices.length !== deviceIds.length) {
            return res.status(403).json({
                error: 'One or more devices do not belong to this user',
                code: 'INVALID_DEVICES'
            });
        }

        // ✅ Use authenticated userId and coachId from invite (not from request body)
        const userId = authenticatedUser.id;
        const coachId = invite.coachId;

        // ✅ FIX #8: NOW start transaction (after all validation)
        const transaction = await sequelize.transaction();

        try {
            // Create or update CoachAthlete relationship
            const [relationship, created] = await CoachAthlete.findOrCreate({
                where: { coachId, athleteId: userId },
                defaults: {
                    status: 'active',
                    acceptedAt: new Date()
                },
                transaction
            });

            if (!created && relationship.status !== 'active') {
                relationship.status = 'active';
                relationship.acceptedAt = new Date();
                await relationship.save({ transaction });
            }

            logConsentEvent('RELATIONSHIP_CREATED', { created });

            // Create DeviceShare records
            const deviceShares = [];
            for (const device of userDevices) {
                const share = await DeviceShare.create({
                    athleteId: userId,
                    coachId,
                    deviceId: device.id,
                    consentAt: new Date()
                }, { transaction });

                deviceShares.push(share);

                // Update device sharing flag
                await OAuthToken.update(
                    { shareWithCoaches: true },
                    { where: { id: device.id }, transaction }
                );
            }

            logConsentEvent('DEVICE_SHARES_CREATED', { count: deviceShares.length });

            // Mark invite as accepted
            invite.acceptedAt = new Date();
            await invite.save({ transaction });

            await transaction.commit();

            logConsentEvent('CONSENT_GRANTED', {
                athleteId: userId,
                coachId,
                deviceSharesCreated: deviceShares.length
            });

            // Send confirmation emails (async, don't await)
            const coach = await User.findByPk(coachId);

            sendAthleteConfirmation(authenticatedUser.email, authenticatedUser.name, coach.name, userDevices)
                .catch(err => logError('EMAIL_ATHLETE_CONFIRMATION', err));

            sendCoachConfirmation(coach.email, coach.name, authenticatedUser.name, userDevices)
                .catch(err => logError('EMAIL_COACH_CONFIRMATION', err));

            res.json({
                success: true,
                message: 'Invitation accepted and devices shared',
                sharedDevices: userDevices.map(d => ({
                    provider: d.provider,
                    sharedAt: new Date()
                })),
                redirectTo: '/athlete/dashboard'
            });

        } catch (transactionError) {
            await transaction.rollback();
            throw transactionError;
        }

    } catch (error) {
        logError('CONSENT_ACCEPT', error);
        res.status(500).json({
            error: 'Failed to accept invitation',
            code: 'SERVER_ERROR'
        });
    }
});

/**
 * GET /api/invite/details?token={token}
 * Get invitation details (for displaying invite info before login)
 */
router.get('/details', inviteRateLimiter, async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        const invite = await Invite.findOne({
            where: { inviteToken: token },
            include: [{
                model: User,
                as: 'Coach',
                attributes: ['id', 'name', 'email']
            }]
        });

        if (!invite) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // Check status
        if (invite.isAccepted()) {
            return res.status(400).json({
                error: 'Invitation already accepted',
                code: 'ALREADY_ACCEPTED'
            });
        }

        if (invite.isRevoked()) {
            return res.status(400).json({
                error: 'Invitation has been revoked',
                code: 'REVOKED'
            });
        }

        if (invite.isExpired()) {
            return res.status(400).json({
                error: 'Invitation has expired',
                code: 'EXPIRED'
            });
        }

        res.json({
            coachName: invite.Coach.name || invite.Coach.email.split('@')[0],
            coachEmail: invite.Coach.email,
            athleteEmail: invite.athleteEmail,
            message: invite.message,
            expiresAt: invite.expiresAt,
            isPending: invite.isPending()
        });

    } catch (error) {
        console.error('[INVITE-DETAILS] Error:', error);
        logError('INVITE_DETAILS', error);
        res.status(500).json({ error: 'Failed to fetch invitation details' });
    }
});

module.exports = router;
