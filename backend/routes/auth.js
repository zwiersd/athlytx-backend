const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { User, MagicLink, CoachAthlete } = require('../models');
const { sendMagicLink, sendAthleteInvite, sendAdminNotification } = require('../utils/email');
const { Op } = require('sequelize');

/**
 * Authentication Routes for Coaches & Athletes
 * Using passwordless magic link authentication
 */

// Test endpoint to check database setup
router.get('/test-db', async (req, res) => {
    try {
        const { sequelize } = require('../models');

        // Check if users table has sessionToken column
        const usersQuery = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");

        // Check if magic_links table exists
        const magicLinksQuery = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'magic_links'");

        res.json({
            success: true,
            users_columns: usersQuery[0].map(c => c.column_name),
            magic_links_columns: magicLinksQuery[0].map(c => c.column_name),
            has_sessionToken: usersQuery[0].some(c => c.column_name === 'sessionToken'),
            magic_links_exists: magicLinksQuery[0].length > 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cleanup endpoint - DELETE user and all related data
router.delete('/cleanup/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const normalizedEmail = email.toLowerCase().trim();

        console.log(`[CLEANUP] Starting cleanup for: ${normalizedEmail}`);

        // Find user
        const user = await User.findOne({ where: { email: normalizedEmail } });

        if (!user) {
            return res.json({ success: true, message: 'User not found (already deleted)' });
        }

        const userId = user.id;
        console.log(`[CLEANUP] Found user ID: ${userId}`);

        // Delete all related records
        const { sequelize } = require('../models');

        // Delete magic links
        await MagicLink.destroy({ where: { userId } });
        console.log(`[CLEANUP] Deleted magic links`);

        // Delete coach-athlete relationships (as coach)
        const coachRelationships = await CoachAthlete.destroy({ where: { coachId: userId } });
        console.log(`[CLEANUP] Deleted ${coachRelationships} coach relationships`);

        // Delete coach-athlete relationships (as athlete)
        const athleteRelationships = await CoachAthlete.destroy({ where: { athleteId: userId } });
        console.log(`[CLEANUP] Deleted ${athleteRelationships} athlete relationships`);

        // Delete OAuth tokens if table exists
        try {
            await sequelize.query('DELETE FROM oauth_tokens WHERE "userId" = :userId', {
                replacements: { userId }
            });
            console.log(`[CLEANUP] Deleted OAuth tokens`);
        } catch (e) {
            console.log(`[CLEANUP] OAuth tokens table may not exist`);
        }

        // Delete activities
        try {
            await sequelize.query('DELETE FROM activities WHERE "userId" = :userId', {
                replacements: { userId }
            });
            console.log(`[CLEANUP] Deleted activities`);
        } catch (e) {
            console.log(`[CLEANUP] Activities table may not exist`);
        }

        // Delete daily metrics
        try {
            await sequelize.query('DELETE FROM daily_metrics WHERE "userId" = :userId', {
                replacements: { userId }
            });
            console.log(`[CLEANUP] Deleted daily metrics`);
        } catch (e) {
            console.log(`[CLEANUP] Daily metrics table may not exist`);
        }

        // Finally, delete the user
        await User.destroy({ where: { id: userId } });
        console.log(`[CLEANUP] Deleted user`);

        res.json({
            success: true,
            message: `Successfully deleted user ${normalizedEmail} and all related data`
        });

    } catch (error) {
        console.error('[CLEANUP] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate secure token
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Generate 6-digit code for mobile
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/magic-link
 * Request magic link for email authentication
 */
router.post('/magic-link', async (req, res) => {
    try {
        console.log('[AUTH] Magic link request received:', req.body);
        const { email, role = 'athlete' } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();
        console.log('[AUTH] Normalized email:', normalizedEmail);

        // Find or create user
        console.log('[AUTH] Finding user...');
        let user = await User.findOne({ where: { email: normalizedEmail } });

        let isNewUser = false;
        if (!user) {
            console.log('[AUTH] User not found, creating new user...');
            user = await User.create({
                email: normalizedEmail,
                name: normalizedEmail.split('@')[0],
                role: role, // 'coach' or 'athlete'
                isActive: true
            });
            console.log('[AUTH] User created:', user.id);
            isNewUser = true;

            // Send admin notification for new sign-up
            try {
                await sendAdminNotification(
                    user.email,
                    user.name,
                    user.role,
                    user.id
                );
            } catch (notificationError) {
                // Silent failure - don't block user registration
                console.warn('[AUTH] Admin notification failed:', notificationError.message);
            }
        } else {
            console.log('[AUTH] User found:', user.id);
        }

        // Expire any existing magic links
        console.log('[AUTH] Expiring old magic links...');
        try {
            await MagicLink.update(
                { used: true },
                { where: { userId: user.id, used: false } }
            );
        } catch (expireError) {
            console.warn('[AUTH] Could not expire old links:', expireError.message);
        }

        // Create new magic link
        console.log('[AUTH] Generating token and code...');
        const token = generateToken();
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        console.log('[AUTH] Creating magic link record...');
        await MagicLink.create({
            userId: user.id,
            email: normalizedEmail,
            token,
            code,
            expiresAt,
            used: false
        });
        console.log('[AUTH] Magic link record created');

        // Send magic link email
        const magicLinkUrl = `${process.env.FRONTEND_URL || 'https://www.athlytx.com'}/login.html?token=${token}`;

        // Send email via Resend
        try {
            await sendMagicLink(normalizedEmail, magicLinkUrl, code);
            console.log(`✅ Magic link sent to ${normalizedEmail}`);
        } catch (emailError) {
            console.error('❌ Email failed, but continuing (code logged):', emailError.message);
            // Continue even if email fails - log to console as fallback
            console.log(`
                🔐 Magic Link for ${normalizedEmail}
                Link: ${magicLinkUrl}
                Code: ${code}
                Expires: ${expiresAt}
            `);
        }

        res.json({
            success: true,
            message: 'Magic link sent to your email',
            // In dev, return the code for testing
            ...(process.env.NODE_ENV === 'development' && { code, token })
        });

    } catch (error) {
        console.error('Magic link error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Failed to send magic link',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/auth/verify
 * Verify magic link token or code
 */
router.post('/verify', async (req, res) => {
    try {
        console.log('[VERIFY] Request received:', req.body);
        const { token, code } = req.body;

        if (!token && !code) {
            console.log('[VERIFY] Missing token or code');
            return res.status(400).json({ error: 'Token or code required' });
        }

        // Find magic link
        const where = token ? { token } : { code };
        console.log('[VERIFY] Looking for magic link with:', where);

        const magicLink = await MagicLink.findOne({
            where: {
                ...where,
                used: false,
                expiresAt: { [Op.gt]: new Date() }
            }
        });

        console.log('[VERIFY] Magic link found:', !!magicLink);
        if (magicLink) {
            console.log('[VERIFY] Magic link details:', {
                id: magicLink.id,
                userId: magicLink.userId,
                email: magicLink.email,
                used: magicLink.used,
                expiresAt: magicLink.expiresAt
            });
        }

        if (!magicLink) {
            console.log('[VERIFY] No valid magic link found');
            return res.status(401).json({ error: 'Invalid or expired link' });
        }

        // Mark as used
        magicLink.used = true;
        await magicLink.save();
        console.log('[VERIFY] Magic link marked as used');

        // Get the user
        const user = await User.findByPk(magicLink.userId);
        if (!user) {
            console.log('[VERIFY] User not found for userId:', magicLink.userId);
            return res.status(401).json({ error: 'User not found' });
        }
        console.log('[VERIFY] User found:', user.email, 'Role:', user.role);

        // Create session token
        const sessionToken = generateToken();
        const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Update user with session
        await User.update(
            {
                lastLogin: new Date(),
                sessionToken,
                sessionExpiry
            },
            { where: { id: magicLink.userId } }
        );
        console.log('[VERIFY] Session created for user');

        // Get user's coach/athlete relationships
        let relationships = [];
        if (user.role === 'coach') {
            // Get coach's athletes
            try {
                relationships = await CoachAthlete.findAll({
                    where: { coachId: magicLink.userId }
                });
                console.log('[VERIFY] Found', relationships.length, 'athlete relationships');
            } catch (relError) {
                console.warn('[VERIFY] Could not load relationships:', relError.message);
                relationships = [];
            }
        } else {
            // Get athlete's coaches
            try {
                relationships = await CoachAthlete.findAll({
                    where: { athleteId: magicLink.userId }
                });
                console.log('[VERIFY] Found', relationships.length, 'coach relationships');
            } catch (relError) {
                console.warn('[VERIFY] Could not load relationships:', relError.message);
                relationships = [];
            }
        }

        console.log('[VERIFY] Verification successful, returning session');
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                onboarded: user.onboarded || false
            },
            sessionToken,
            sessionExpiry,
            relationships: relationships.map(r => ({
                coachId: r.coachId,
                athleteId: r.athleteId,
                status: r.status,
                createdAt: r.createdAt
            }))
        });

    } catch (error) {
        console.error('[VERIFY] Error:', error);
        console.error('[VERIFY] Stack:', error.stack);
        res.status(500).json({ error: 'Verification failed', details: error.message });
    }
});

/**
 * POST /api/auth/session
 * Validate session token
 */
router.post('/session', async (req, res) => {
    try {
        const { sessionToken } = req.body;
        console.log('[SESSION-API] Validation request received');
        console.log('[SESSION-API] Token:', sessionToken?.substring(0, 20) + '...');

        if (!sessionToken) {
            console.log('[SESSION-API] ❌ No token provided');
            return res.status(400).json({ success: false, error: 'Session token required' });
        }

        const user = await User.findOne({
            where: {
                sessionToken,
                sessionExpiry: { [Op.gt]: new Date() }
            },
            attributes: ['id', 'email', 'name', 'role', 'onboarded']
        });

        if (!user) {
            console.log('[SESSION-API] ❌ User not found or token expired');
            return res.status(401).json({ success: false, error: 'Invalid session' });
        }

        console.log('[SESSION-API] ✅ User found:', user.email);

        // Get relationships
        let relationships = [];
        if (user.role === 'coach') {
            relationships = await CoachAthlete.findAll({
                where: { coachId: user.id, status: 'active' },
                include: [{
                    model: User,
                    as: 'Athlete',
                    attributes: ['id', 'email', 'name']
                }]
            });
        } else {
            relationships = await CoachAthlete.findAll({
                where: { athleteId: user.id, status: 'active' },
                include: [{
                    model: User,
                    as: 'Coach',
                    attributes: ['id', 'email', 'name']
                }]
            });
        }

        console.log('[SESSION-API] Found user:', user.email, 'with', relationships.length, 'relationships');

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                onboarded: user.onboarded || false
            },
            relationships: relationships.map(r => ({
                id: user.role === 'coach' ? r.Athlete?.id : r.Coach?.id,
                email: user.role === 'coach' ? r.Athlete?.email : r.Coach?.email,
                name: user.role === 'coach' ? r.Athlete?.name : r.Coach?.name,
                status: r.status
            })).filter(r => r.id) // Filter out any null relationships
        });

    } catch (error) {
        console.error('[SESSION-API] Error:', error);
        console.error('[SESSION-API] Stack:', error.stack);
        res.status(500).json({ success: false, error: 'Session validation failed', details: error.message });
    }
});

/**
 * POST /api/auth/logout
 * Invalidate session
 */
router.post('/logout', async (req, res) => {
    try {
        const { sessionToken } = req.body;

        if (sessionToken) {
            await User.update(
                { sessionToken: null, sessionExpiry: null },
                { where: { sessionToken } }
            );
        }

        res.json({ success: true, message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

/**
 * POST /api/auth/invite-athlete
 * Coach invites an athlete
 */
router.post('/invite-athlete', async (req, res) => {
    try {
        const { coachId, athleteEmail, message } = req.body;

        if (!coachId || !athleteEmail) {
            return res.status(400).json({ error: 'Coach ID and athlete email required' });
        }

        // Verify coach exists
        const coach = await User.findByPk(coachId);
        if (!coach || coach.role !== 'coach') {
            return res.status(403).json({ error: 'Invalid coach' });
        }

        const normalizedEmail = athleteEmail.toLowerCase().trim();

        // Find or create athlete
        let athlete = await User.findOne({ where: { email: normalizedEmail } });

        if (!athlete) {
            athlete = await User.create({
                email: normalizedEmail,
                name: normalizedEmail.split('@')[0],
                role: 'athlete',
                isActive: false // Inactive until they accept
            });
        }

        // Check if relationship exists
        const existing = await CoachAthlete.findOne({
            where: { coachId, athleteId: athlete.id }
        });

        if (existing) {
            return res.status(400).json({ error: 'Relationship already exists' });
        }

        // Generate invite token and expiry (7 days)
        const inviteToken = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        // Create coach-athlete relationship (pending)
        const relationship = await CoachAthlete.create({
            coachId,
            athleteId: athlete.id,
            status: 'pending',
            inviteMessage: message,
            inviteToken,
            expiresAt
        });

        // Create invite URL - athlete accepts via dedicated page
        const inviteUrl = `${process.env.FRONTEND_URL || 'https://www.athlytx.com'}/athlete/accept-invite?token=${inviteToken}`;

        // Send invite email
        try {
            await sendAthleteInvite(
                athlete.email,
                coach.name || coach.email.split('@')[0],
                coach.email,
                inviteUrl,
                message
            );
            console.log(`✅ Invite email sent to ${athlete.email}`);
        } catch (emailError) {
            console.error('❌ Email failed, but continuing:', emailError.message);
            // Continue even if email fails - log to console as fallback
            console.log(`
                📧 Coach Invite (email failed, logged)
                From: ${coach.name} (${coach.email})
                To: ${athlete.email}
                URL: ${inviteUrl}
                Message: ${message || 'Join me on Athlytx for training analytics'}
            `);
        }

        res.json({
            success: true,
            message: 'Invitation sent',
            relationship: {
                id: relationship.id,
                athleteEmail: athlete.email,
                status: relationship.status
            }
        });

    } catch (error) {
        console.error('Invite error:', error);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

/**
 * POST /api/auth/update-profile
 * Update coach/athlete profile information
 */
router.post('/update-profile', async (req, res) => {
    try {
        const { sessionToken, name } = req.body;

        if (!sessionToken || !name) {
            return res.status(400).json({ error: 'Session token and name required' });
        }

        // Find user by session token
        const user = await User.findOne({
            where: {
                sessionToken,
                sessionExpiry: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        // Update user name
        user.name = name.trim();
        await user.save();

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * GET /api/auth/invite/details
 * Get invitation details by token
 */
router.get('/invite/details', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Find the invitation by token
        const relationship = await CoachAthlete.findOne({
            where: { inviteToken: token },
            include: [
                { model: User, as: 'Coach', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'Athlete', attributes: ['id', 'email'] }
            ]
        });

        if (!relationship) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // Check if already accepted
        if (relationship.status === 'active') {
            return res.status(400).json({ error: 'Invitation already accepted' });
        }

        // Check if revoked or cancelled
        if (relationship.status === 'revoked' || relationship.status === 'cancelled') {
            return res.status(400).json({ error: 'Invitation is no longer valid' });
        }

        // Check if expired
        if (relationship.expiresAt && new Date(relationship.expiresAt) < new Date()) {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        // Return invitation details
        res.json({
            coachName: relationship.Coach.name || relationship.Coach.email.split('@')[0],
            coachEmail: relationship.Coach.email,
            athleteEmail: relationship.Athlete.email,
            inviteMessage: relationship.inviteMessage,
            invitedAt: relationship.invitedAt,
            expiresAt: relationship.expiresAt,
            status: relationship.status
        });

    } catch (error) {
        console.error('Invite details error:', error);
        res.status(500).json({ error: 'Failed to fetch invitation details' });
    }
});

/**
 * POST /api/auth/onboarding/complete
 * Complete athlete onboarding with profile data
 */
router.post('/onboarding/complete', async (req, res) => {
    try {
        const { userId, sessionToken, name, dateOfBirth, sport, timezone } = req.body;

        if (!userId && !sessionToken) {
            return res.status(400).json({ error: 'userId or sessionToken required' });
        }

        // Find user by ID or session token
        let user;
        if (sessionToken) {
            user = await User.findOne({
                where: {
                    sessionToken,
                    sessionExpiry: { [Op.gt]: new Date() }
                }
            });
        } else {
            user = await User.findByPk(userId);
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found or session expired' });
        }

        // Update user with onboarding data
        if (name) user.name = name.trim();
        if (dateOfBirth) user.dateOfBirth = dateOfBirth;
        if (sport) user.sport = sport;
        if (timezone) user.timezone = timezone;
        user.onboarded = true;

        await user.save();

        res.json({
            success: true,
            message: 'Onboarding completed',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                onboarded: user.onboarded,
                dateOfBirth: user.dateOfBirth,
                sport: user.sport,
                timezone: user.timezone
            }
        });

    } catch (error) {
        console.error('Onboarding complete error:', error);
        res.status(500).json({ error: 'Failed to complete onboarding' });
    }
});

/**
 * POST /api/auth/accept-invite
 * Athlete accepts coach invitation
 */
router.post('/accept-invite', async (req, res) => {
    try {
        const { token, athleteId, coachId } = req.body;

        let relationship;

        // Support both token-based (new) and ID-based (legacy) invitation acceptance
        if (token) {
            relationship = await CoachAthlete.findOne({
                where: { inviteToken: token, status: 'pending' }
            });

            if (!relationship) {
                return res.status(404).json({ error: 'No pending invitation found' });
            }

            // Check if expired
            if (relationship.expiresAt && new Date(relationship.expiresAt) < new Date()) {
                return res.status(400).json({ error: 'Invitation has expired' });
            }
        } else if (athleteId && coachId) {
            // Legacy support for ID-based acceptance
            relationship = await CoachAthlete.findOne({
                where: { athleteId, coachId, status: 'pending' }
            });

            if (!relationship) {
                return res.status(404).json({ error: 'No pending invitation found' });
            }
        } else {
            return res.status(400).json({ error: 'Either token or athleteId+coachId required' });
        }

        // Accept the invitation
        relationship.status = 'active';
        relationship.acceptedAt = new Date();
        await relationship.save();

        // Activate athlete account if needed
        await User.update(
            { isActive: true },
            { where: { id: relationship.athleteId, isActive: false } }
        );

        res.json({
            success: true,
            message: 'Invitation accepted',
            relationship: {
                id: relationship.id,
                coachId: relationship.coachId,
                athleteId: relationship.athleteId,
                status: relationship.status,
                acceptedAt: relationship.acceptedAt
            }
        });

    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

module.exports = router;