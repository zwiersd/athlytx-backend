const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User } = require('../models');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_dev');

/**
 * AUTHENTICATION ROUTES
 *
 * Optional login system with guest mode support
 * - Users can use the app as guests (no login required)
 * - Optional signup for cross-device sync and better experience
 * - Guests can upgrade to full accounts later
 */

/**
 * Sign up - Convert guest to full account or create new account
 * POST /api/auth/signup
 * Body: { userId (optional), email, password, name (optional) }
 */
router.post('/signup', async (req, res) => {
    try {
        const { userId, email, password, name } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters'
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser && !existingUser.isGuest) {
            return res.status(409).json({
                error: 'Email already registered'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionExpiry = new Date();
        sessionExpiry.setDate(sessionExpiry.getDate() + 30); // 30 day session

        let user;

        if (userId) {
            // Upgrade existing guest user to full account
            user = await User.findByPk(userId);

            if (!user) {
                return res.status(404).json({
                    error: 'User not found'
                });
            }

            if (!user.isGuest) {
                return res.status(400).json({
                    error: 'User already has an account'
                });
            }

            // Upgrade guest to full account
            await user.update({
                email,
                passwordHash,
                name: name || user.name,
                isGuest: false,
                sessionToken,
                sessionExpiry,
                lastLogin: new Date()
            });

            console.log(`✅ Upgraded guest user ${userId} to full account: ${email}`);

            // Send email notification for upgraded guest account
            try {
                await resend.emails.send({
                    from: 'Athlytx Notifications <noreply@athlytx.com>',
                    to: ['info@athlytx.com'],
                    subject: '🎉 New Account Created - Upgraded from Guest',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #667eea;">New Account: Guest Upgraded</h2>

                            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
                                <p style="margin: 8px 0;"><strong>Name:</strong> ${user.name}</p>
                                <p style="margin: 8px 0;"><strong>User ID:</strong> ${user.id}</p>
                                <p style="margin: 8px 0;"><strong>Previous Guest ID:</strong> ${userId}</p>
                                <p style="margin: 8px 0;"><strong>Signup Type:</strong> Guest Account Upgraded</p>
                            </div>

                            <p style="color: #718096; font-size: 12px; margin-top: 30px;">
                                A guest user just upgraded to a full account on Athlytx. Their data has been preserved.
                            </p>
                        </div>
                    `
                });
                console.log(`📧 Sent email notification for new account: ${email}`);
            } catch (emailError) {
                console.error('❌ Failed to send signup notification email:', emailError);
                // Don't fail the signup if email fails
            }
        } else {
            // Create new full account
            user = await User.create({
                email,
                passwordHash,
                name: name || 'Athlete',
                isGuest: false,
                sessionToken,
                sessionExpiry,
                lastLogin: new Date()
            });

            console.log(`✅ Created new account: ${email}`);

            // Send email notification for new account
            try {
                await resend.emails.send({
                    from: 'Athlytx Notifications <noreply@athlytx.com>',
                    to: ['info@athlytx.com'],
                    subject: '🎉 New Account Created',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #667eea;">New Account Created</h2>

                            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
                                <p style="margin: 8px 0;"><strong>Name:</strong> ${user.name}</p>
                                <p style="margin: 8px 0;"><strong>User ID:</strong> ${user.id}</p>
                                <p style="margin: 8px 0;"><strong>Signup Type:</strong> New Account</p>
                            </div>

                            <p style="color: #718096; font-size: 12px; margin-top: 30px;">
                                A new user just created an account on Athlytx.
                            </p>
                        </div>
                    `
                });
                console.log(`📧 Sent email notification for new account: ${email}`);
            } catch (emailError) {
                console.error('❌ Failed to send signup notification email:', emailError);
                // Don't fail the signup if email fails
            }
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isGuest: user.isGuest
            },
            sessionToken,
            sessionExpiry
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            error: 'Failed to create account',
            message: error.message
        });
    }
});

/**
 * Login - Authenticate with email and password
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password required'
            });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });

        if (!user || user.isGuest) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);

        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Create new session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionExpiry = new Date();
        sessionExpiry.setDate(sessionExpiry.getDate() + 30);

        await user.update({
            sessionToken,
            sessionExpiry,
            lastLogin: new Date()
        });

        console.log(`✅ User logged in: ${email}`);

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isGuest: user.isGuest
            },
            sessionToken,
            sessionExpiry
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed',
            message: error.message
        });
    }
});

/**
 * Verify session - Check if session token is valid
 * POST /api/auth/verify
 * Body: { sessionToken }
 */
router.post('/verify', async (req, res) => {
    try {
        const { sessionToken } = req.body;

        if (!sessionToken) {
            return res.status(400).json({
                error: 'Session token required'
            });
        }

        const user = await User.findOne({ where: { sessionToken } });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid session'
            });
        }

        // Check if session expired
        if (new Date() > user.sessionExpiry) {
            return res.status(401).json({
                error: 'Session expired'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isGuest: user.isGuest
            }
        });

    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({
            error: 'Verification failed',
            message: error.message
        });
    }
});

/**
 * Logout - Invalidate session token
 * POST /api/auth/logout
 * Body: { sessionToken }
 */
router.post('/logout', async (req, res) => {
    try {
        const { sessionToken } = req.body;

        if (!sessionToken) {
            return res.status(400).json({
                error: 'Session token required'
            });
        }

        const user = await User.findOne({ where: { sessionToken } });

        if (user) {
            await user.update({
                sessionToken: null,
                sessionExpiry: null
            });

            console.log(`✅ User logged out: ${user.email}`);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: error.message
        });
    }
});

/**
 * Get current user info
 * GET /api/auth/me
 * Query: ?sessionToken=xxx
 */
router.get('/me', async (req, res) => {
    try {
        const sessionToken = req.query.sessionToken || req.headers.authorization?.replace('Bearer ', '');

        if (!sessionToken) {
            return res.status(401).json({
                error: 'Not authenticated'
            });
        }

        const user = await User.findOne({ where: { sessionToken } });

        if (!user || new Date() > user.sessionExpiry) {
            return res.status(401).json({
                error: 'Invalid or expired session'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                isGuest: user.isGuest,
                role: user.role,
                onboarded: user.onboarded,
                lastLogin: user.lastLogin
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Failed to get user info',
            message: error.message
        });
    }
});

module.exports = router;
