const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { User, MagicLink, CoachAthlete } = require('../models');
const { sendMagicLink } = require('../utils/email');
const { Op } = require('sequelize');

/**
 * Authentication Routes for Coaches & Athletes
 * Using passwordless magic link authentication
 */

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

        if (!user) {
            console.log('[AUTH] User not found, creating new user...');
            user = await User.create({
                email: normalizedEmail,
                name: normalizedEmail.split('@')[0],
                role: role, // 'coach' or 'athlete'
                isActive: true
            });
            console.log('[AUTH] User created:', user.id);
        } else {
            console.log('[AUTH] User found:', user.id);
        }

        // Expire any existing magic links
        console.log('[AUTH] Expiring old magic links...');
        await MagicLink.update(
            { used: true },
            { where: { userId: user.id, used: false } }
        );

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
        const magicLinkUrl = `${process.env.FRONTEND_URL || 'https://www.athlytx.com'}/elite?token=${token}`;

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
        const { token, code } = req.body;

        if (!token && !code) {
            return res.status(400).json({ error: 'Token or code required' });
        }

        // Find magic link
        const where = token ? { token } : { code };
        const magicLink = await MagicLink.findOne({
            where: {
                ...where,
                used: false,
                expiresAt: { [Op.gt]: new Date() }
            },
            include: [{
                model: User,
                attributes: ['id', 'email', 'name', 'role']
            }]
        });

        if (!magicLink) {
            return res.status(401).json({ error: 'Invalid or expired link' });
        }

        // Mark as used
        magicLink.used = true;
        await magicLink.save();

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

        // Get user's coach/athlete relationships
        let relationships = [];
        if (magicLink.User.role === 'coach') {
            // Get coach's athletes
            relationships = await CoachAthlete.findAll({
                where: { coachId: magicLink.userId },
                include: [{
                    model: User,
                    as: 'athlete',
                    attributes: ['id', 'email', 'name']
                }]
            });
        } else {
            // Get athlete's coaches
            relationships = await CoachAthlete.findAll({
                where: { athleteId: magicLink.userId },
                include: [{
                    model: User,
                    as: 'coach',
                    attributes: ['id', 'email', 'name']
                }]
            });
        }

        res.json({
            success: true,
            user: {
                id: magicLink.User.id,
                email: magicLink.User.email,
                name: magicLink.User.name,
                role: magicLink.User.role
            },
            sessionToken,
            sessionExpiry,
            relationships: relationships.map(r => ({
                id: magicLink.User.role === 'coach' ? r.athlete.id : r.coach.id,
                email: magicLink.User.role === 'coach' ? r.athlete.email : r.coach.email,
                name: magicLink.User.role === 'coach' ? r.athlete.name : r.coach.name,
                status: r.status,
                createdAt: r.createdAt
            }))
        });

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

/**
 * POST /api/auth/session
 * Validate session token
 */
router.post('/session', async (req, res) => {
    try {
        const { sessionToken } = req.body;

        if (!sessionToken) {
            return res.status(400).json({ error: 'Session token required' });
        }

        const user = await User.findOne({
            where: {
                sessionToken,
                sessionExpiry: { [Op.gt]: new Date() }
            },
            attributes: ['id', 'email', 'name', 'role']
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        // Get relationships
        let relationships = [];
        if (user.role === 'coach') {
            relationships = await CoachAthlete.findAll({
                where: { coachId: user.id, status: 'active' },
                include: [{
                    model: User,
                    as: 'athlete',
                    attributes: ['id', 'email', 'name']
                }]
            });
        } else {
            relationships = await CoachAthlete.findAll({
                where: { athleteId: user.id, status: 'active' },
                include: [{
                    model: User,
                    as: 'coach',
                    attributes: ['id', 'email', 'name']
                }]
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            relationships: relationships.map(r => ({
                id: user.role === 'coach' ? r.athlete.id : r.coach.id,
                email: user.role === 'coach' ? r.athlete.email : r.coach.email,
                name: user.role === 'coach' ? r.athlete.name : r.coach.name,
                status: r.status
            }))
        });

    } catch (error) {
        console.error('Session error:', error);
        res.status(500).json({ error: 'Session validation failed' });
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

        // Create coach-athlete relationship (pending)
        const relationship = await CoachAthlete.create({
            coachId,
            athleteId: athlete.id,
            status: 'pending',
            inviteMessage: message
        });

        // Send invite email (for now, log to console)
        console.log(`
            📧 Coach Invite
            From: ${coach.name} (${coach.email})
            To: ${athlete.email}
            Message: ${message || 'Join me on Athlytx for training analytics'}
        `);

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
 * POST /api/auth/accept-invite
 * Athlete accepts coach invitation
 */
router.post('/accept-invite', async (req, res) => {
    try {
        const { athleteId, coachId } = req.body;

        const relationship = await CoachAthlete.findOne({
            where: { athleteId, coachId, status: 'pending' }
        });

        if (!relationship) {
            return res.status(404).json({ error: 'No pending invitation found' });
        }

        relationship.status = 'active';
        relationship.acceptedAt = new Date();
        await relationship.save();

        // Activate athlete account if needed
        await User.update(
            { isActive: true },
            { where: { id: athleteId, isActive: false } }
        );

        res.json({
            success: true,
            message: 'Invitation accepted',
            relationship
        });

    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({ error: 'Failed to accept invitation' });
    }
});

module.exports = router;