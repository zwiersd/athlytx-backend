const { Resend } = require('resend');

// Initialize Resend with API key from environment (or dummy key for development)
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_dev');

/**
 * Send magic link authentication email
 * @param {string} email - Recipient email address
 * @param {string} magicLinkUrl - Full magic link URL
 * @param {string} code - 6-digit verification code
 */
async function sendMagicLink(email, magicLinkUrl, code) {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Athlytx <noreply@athlytx.com>',
            to: [email],
            subject: '🔐 Your Athlytx Magic Link - Instant Login',
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0a0e27 0%, #1e2659 30%, #2c1810 70%, #0f0a1a 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.98); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">

        <!-- Header with Logo -->
        <div style="background: linear-gradient(135deg, #0a0e27 0%, #1e2659 50%, #2c1810 100%); padding: 50px 30px; text-align: center; border-bottom: 3px solid #667eea;">
            <img src="https://www.athlytx.com/src/images/logo.png" alt="Athlytx" style="height: 60px; margin-bottom: 20px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 1px;">Athlytx Elite</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px; font-weight: 500;">Professional Coaching Dashboard</p>
        </div>

        <!-- Content -->
        <div style="padding: 50px 40px;">
            <h2 style="color: #0a0e27; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">Your Magic Link</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 35px 0;">
                Click the button below to instantly access your Athlytx dashboard. No code required!
            </p>

            <!-- Login Button -->
            <div style="text-align: center; margin: 0 0 40px 0;">
                <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #5a67d8); color: white; text-decoration: none; padding: 20px 60px; border-radius: 12px; font-weight: 700; font-size: 18px; box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4); transition: all 0.3s;">
                    🔐 Log In to Athlytx
                </a>
            </div>

            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0; text-align: center; font-style: italic;">
                One click - instant access. No codes to enter!
            </p>

            <!-- Security Notice -->
            <div style="background: linear-gradient(135deg, #f7fafc, #edf2f7); border-left: 4px solid #667eea; padding: 20px 24px; border-radius: 8px; margin: 0 0 20px 0;">
                <p style="color: #2d3748; font-size: 14px; line-height: 1.7; margin: 0;">
                    <strong style="color: #1a202c;">🔒 Security Notice:</strong> This link expires in 15 minutes. If you didn't request this login, you can safely ignore this email.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: linear-gradient(135deg, #0a0e27, #1e2659); padding: 30px; text-align: center; border-top: 1px solid rgba(102, 126, 234, 0.3);">
            <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
                © ${new Date().getFullYear()} Athlytx Elite
            </p>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
                Advanced analytics for elite coaching performance
            </p>
        </div>
    </div>
</body>
</html>
            `,
            text: `
Your Athlytx Magic Link

Click the link below to instantly log in to your dashboard:
${magicLinkUrl}

This link expires in 15 minutes. If you didn't request this login, please ignore this email.

© ${new Date().getFullYear()} Athlytx
            `
        });

        if (error) {
            console.error('❌ Resend email error:', error);
            throw error;
        }

        console.log('✅ Magic link email sent:', data);
        return data;

    } catch (error) {
        console.error('❌ Failed to send magic link email:', error);
        throw error;
    }
}

/**
 * Send athlete invitation email from coach
 * @param {string} athleteEmail - Athlete's email address
 * @param {string} coachName - Coach's name
 * @param {string} coachEmail - Coach's email address
 * @param {string} inviteUrl - URL to accept invitation
 * @param {string} message - Optional custom message from coach
 */
async function sendAthleteInvite(athleteEmail, coachName, coachEmail, inviteUrl, message = '') {
    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Athlytx <noreply@athlytx.com>',
            to: [athleteEmail],
            subject: `${coachName} invited you to join Athlytx Elite`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0a0e27 0%, #1e2659 30%, #2c1810 70%, #0f0a1a 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.98); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0a0e27 0%, #1e2659 50%, #2c1810 100%); padding: 50px 30px; text-align: center; border-bottom: 3px solid #667eea;">
            <img src="https://www.athlytx.com/src/images/logo.png" alt="Athlytx" style="height: 60px; margin-bottom: 20px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 1px;">You're Invited!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px; font-weight: 500;">Join ${coachName} on Athlytx Elite</p>
        </div>

        <!-- Content -->
        <div style="padding: 50px 40px;">
            <h2 style="color: #0a0e27; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">Coach Invitation</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                <strong>${coachName}</strong> (${coachEmail}) has invited you to connect on Athlytx Elite - a professional coaching platform for tracking your training and performance.
            </p>

            ${message ? `
            <div style="background: linear-gradient(135deg, #f7fafc, #edf2f7); border-left: 4px solid #667eea; padding: 20px 24px; border-radius: 8px; margin: 0 0 30px 0;">
                <p style="color: #2d3748; font-size: 15px; line-height: 1.7; margin: 0; font-style: italic;">
                    "${message}"
                </p>
            </div>
            ` : ''}

            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 35px 0;">
                Click below to accept this invitation and start sharing your fitness data:
            </p>

            <!-- Accept Button -->
            <div style="text-align: center; margin: 0 0 40px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #5a67d8); color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 17px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    Accept Invitation →
                </a>
            </div>

            <!-- What's Next -->
            <div style="background: #ffffff; border: 2px solid #edf2f7; border-radius: 12px; padding: 24px; margin: 0 0 20px 0;">
                <h3 style="color: #0a0e27; margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">What happens next?</h3>
                <ol style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li style="margin-bottom: 10px;">Accept this invitation to create your Athlytx account</li>
                    <li style="margin-bottom: 10px;">Connect your fitness devices (Garmin, Whoop, Oura, or Strava)</li>
                    <li style="margin-bottom: 10px;">Your coach will be able to view your training data and analytics</li>
                    <li>Get better insights and coaching based on your real training data</li>
                </ol>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: linear-gradient(135deg, #0a0e27, #1e2659); padding: 30px; text-align: center; border-top: 1px solid rgba(102, 126, 234, 0.3);">
            <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
                © ${new Date().getFullYear()} Athlytx Elite
            </p>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0;">
                Advanced analytics for elite coaching performance
            </p>
        </div>
    </div>
</body>
</html>
            `,
            text: `
${coachName} invited you to join Athlytx Elite

${coachName} (${coachEmail}) has invited you to connect on Athlytx Elite - a professional coaching platform for tracking your training and performance.

${message ? `Message from ${coachName}: "${message}"` : ''}

Click this link to accept the invitation:
${inviteUrl}

What happens next?
1. Accept this invitation to create your Athlytx account
2. Connect your fitness devices (Garmin, Whoop, Oura, or Strava)
3. Your coach will be able to view your training data and analytics
4. Get better insights and coaching based on your real training data

© ${new Date().getFullYear()} Athlytx
            `
        });

        if (error) {
            console.error('❌ Resend email error:', error);
            throw error;
        }

        console.log('✅ Athlete invite email sent:', data);
        return data;

    } catch (error) {
        console.error('❌ Failed to send athlete invite email:', error);
        throw error;
    }
}

/**
 * Send admin notification when new user signs up
 * @param {string} userEmail - New user's email address
 * @param {string} userName - New user's name
 * @param {string} userRole - User's role (coach or athlete)
 * @param {string} userId - User's UUID
 */
async function sendAdminNotification(userEmail, userName, userRole, userId) {
    try {
        const adminEmail = 'connect@athlytx.com';
        const roleEmoji = userRole === 'coach' ? '👔' : '🏃';
        const roleLabel = userRole === 'coach' ? 'Coach' : 'Athlete';

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Athlytx <noreply@athlytx.com>',
            to: [adminEmail],
            subject: `${roleEmoji} New ${roleLabel} Sign-Up: ${userEmail}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7fafc; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${userRole === 'coach' ? '#667eea, #5a67d8' : '#48bb78, #38a169'}); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                ${roleEmoji} New ${roleLabel} Sign-Up
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">
                ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; font-weight: 600;">User Details</h2>

            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #718096; font-size: 14px; font-weight: 600;">
                        Email:
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px; text-align: right;">
                        ${userEmail}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #718096; font-size: 14px; font-weight: 600;">
                        Name:
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px; text-align: right;">
                        ${userName}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #718096; font-size: 14px; font-weight: 600;">
                        Role:
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #2d3748; font-size: 14px; text-align: right;">
                        ${roleEmoji} ${roleLabel}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; color: #718096; font-size: 14px; font-weight: 600;">
                        User ID:
                    </td>
                    <td style="padding: 12px 0; color: #718096; font-size: 12px; text-align: right; font-family: monospace;">
                        ${userId}
                    </td>
                </tr>
            </table>

            <div style="background: #f7fafc; border-left: 4px solid ${userRole === 'coach' ? '#667eea' : '#48bb78'}; padding: 16px; border-radius: 8px; margin: 24px 0 0 0;">
                <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0;">
                    <strong>Action Required:</strong> A new ${roleLabel.toLowerCase()} has registered and will be logging into the platform.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
                Athlytx Elite - Admin Notification System
            </p>
        </div>
    </div>
</body>
</html>
            `,
            text: `
New ${roleLabel} Sign-Up

User Details:
- Email: ${userEmail}
- Name: ${userName}
- Role: ${roleLabel}
- User ID: ${userId}
- Signed up: ${new Date().toLocaleString()}

A new ${roleLabel.toLowerCase()} has registered and will be logging into the platform.

---
Athlytx Elite - Admin Notification System
            `
        });

        if (error) {
            console.error('❌ Admin notification email error:', error);
            // Don't throw - we don't want to block user registration if admin email fails
            return false;
        }

        console.log('✅ Admin notification sent for new', roleLabel, ':', userEmail);
        return data;

    } catch (error) {
        console.error('❌ Failed to send admin notification email:', error);
        // Don't throw - silent failure for admin notifications
        return false;
    }
}

/**
 * Send confirmation email to athlete after accepting invite (NEW)
 * @param {string} athleteEmail - Athlete's email
 * @param {string} athleteName - Athlete's name
 * @param {string} coachName - Coach's name
 * @param {Array} devices - Array of device objects with provider property
 */
async function sendAthleteConfirmation(athleteEmail, athleteName, coachName, devices) {
    try {
        const deviceList = devices.map(d => `<li style="margin-bottom: 8px; color: #4a5568;"><strong style="color: #667eea;">${d.provider.charAt(0).toUpperCase() + d.provider.slice(1)}</strong> - Activities, heart rate, training data</li>`).join('');

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Athlytx <noreply@athlytx.com>',
            to: [athleteEmail],
            subject: `✓ You're now connected with ${coachName}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0a0e27 0%, #1e2659 30%, #2c1810 70%, #0f0a1a 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.98); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
        <div style="background: linear-gradient(135deg, #48bb78, #38a169); padding: 50px 30px; text-align: center; border-bottom: 3px solid #2f855a;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">✓ Connection Confirmed</h1>
        </div>
        <div style="padding: 50px 40px;">
            <h2 style="color: #0a0e27; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">Hi ${athleteName},</h2>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                You've successfully connected with <strong style="color: #667eea;">${coachName}</strong>. Your coach can now access your training data to provide personalized insights and coaching.
            </p>
            <div style="background: #f7fafc; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
                <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">📊 Shared Devices:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    ${deviceList}
                </ul>
            </div>
            <div style="background: linear-gradient(135deg, #f7fafc, #edf2f7); border-left: 4px solid #48bb78; padding: 20px 24px; border-radius: 8px; margin: 0 0 30px 0;">
                <p style="color: #2d3748; font-size: 14px; line-height: 1.7; margin: 0;">
                    <strong style="color: #1a202c;">🔒 Privacy Control:</strong> You can revoke your coach's access at any time from your dashboard settings.
                </p>
            </div>
            <div style="text-align: center; margin: 30px 0 0 0;">
                <a href="${process.env.FRONTEND_URL || 'https://www.athlytx.com'}/athlete/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea, #5a67d8); color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 17px;">
                    Go to Dashboard →
                </a>
            </div>
        </div>
        <div style="background: linear-gradient(135deg, #0a0e27, #1e2659); padding: 30px; text-align: center; border-top: 1px solid rgba(102, 126, 234, 0.3);">
            <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
                © ${new Date().getFullYear()} Athlytx Elite
            </p>
        </div>
    </div>
</body>
</html>
            `
        });

        if (error) throw error;
        console.log('✅ Athlete confirmation email sent');
        return data;
    } catch (error) {
        console.error('❌ Athlete confirmation email failed:', error);
        throw error;
    }
}

/**
 * Send confirmation email to coach after athlete accepts (NEW)
 * @param {string} coachEmail - Coach's email
 * @param {string} coachName - Coach's name
 * @param {string} athleteName - Athlete's name
 * @param {Array} devices - Array of device objects with provider property
 */
async function sendCoachConfirmation(coachEmail, coachName, athleteName, devices) {
    try {
        const deviceList = devices.map(d => `<li style="margin-bottom: 8px; color: #4a5568;"><strong style="color: #667eea;">${d.provider.charAt(0).toUpperCase() + d.provider.slice(1)}</strong></li>`).join('');

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Athlytx <noreply@athlytx.com>',
            to: [coachEmail],
            subject: `🎉 ${athleteName} accepted your invitation`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0a0e27 0%, #1e2659 30%, #2c1810 70%, #0f0a1a 100%); padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.98); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
        <div style="background: linear-gradient(135deg, #667eea, #5a67d8); padding: 50px 30px; text-align: center; border-bottom: 3px solid #4c51bf;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">🎉 Great News!</h1>
        </div>
        <div style="padding: 50px 40px;">
            <h2 style="color: #0a0e27; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">Hi ${coachName},</h2>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                <strong style="color: #667eea;">${athleteName}</strong> has accepted your invitation and is now part of your roster.
            </p>
            <div style="background: #f7fafc; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
                <h3 style="color: #2d3748; margin: 0 0 16px 0; font-size: 18px; font-weight: 700;">📊 Connected Devices:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                    ${deviceList}
                </ul>
            </div>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 30px 0;">
                You can now view ${athleteName}'s training data, analytics, and progress.
            </p>
            <div style="text-align: center; margin: 30px 0 0 0;">
                <a href="${process.env.FRONTEND_URL || 'https://www.athlytx.com'}/coach/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea, #5a67d8); color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 17px;">
                    View Athlete Dashboard →
                </a>
            </div>
        </div>
        <div style="background: linear-gradient(135deg, #0a0e27, #1e2659); padding: 30px; text-align: center; border-top: 1px solid rgba(102, 126, 234, 0.3);">
            <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin: 0;">
                © ${new Date().getFullYear()} Athlytx Elite
            </p>
        </div>
    </div>
</body>
</html>
            `
        });

        if (error) throw error;
        console.log('✅ Coach confirmation email sent');
        return data;
    } catch (error) {
        console.error('❌ Coach confirmation email failed:', error);
        throw error;
    }
}

/**
 * Send notification to coach when athlete revokes access (NEW)
 * @param {string} coachEmail - Coach's email
 * @param {string} coachName - Coach's name
 * @param {string} athleteName - Athlete's name
 * @param {Array} revokedDevices - Array of device provider names
 */
async function sendCoachRevocation(coachEmail, coachName, athleteName, revokedDevices) {
    try {
        const deviceList = revokedDevices.map(d => `<li style="margin-bottom: 8px; color: #e53e3e;">${d.charAt(0).toUpperCase() + d.slice(1)}</li>`).join('');

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Athlytx <noreply@athlytx.com>',
            to: [coachEmail],
            subject: `${athleteName} updated data sharing preferences`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7fafc; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #ed8936, #dd6b20); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Data Sharing Update</h1>
        </div>
        <div style="padding: 40px;">
            <h2 style="color: #2d3748; margin: 0 0 16px 0; font-size: 22px; font-weight: 700;">Hi ${coachName},</h2>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
                <strong>${athleteName}</strong> has revoked your access to the following devices:
            </p>
            <div style="background: #fff5f5; border-left: 4px solid #e53e3e; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px 0;">
                <ul style="margin: 0; padding-left: 20px;">
                    ${deviceList}
                </ul>
            </div>
            <p style="color: #4a5568; font-size: 15px; line-height: 1.7; margin: 0;">
                You no longer have access to training data from these sources.
            </p>
        </div>
        <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Athlytx Elite
            </p>
        </div>
    </div>
</body>
</html>
            `
        });

        if (error) throw error;
        console.log('✅ Coach revocation email sent');
        return data;
    } catch (error) {
        console.error('❌ Coach revocation email failed:', error);
        throw error;
    }
}

module.exports = {
    sendMagicLink,
    sendAthleteInvite,
    sendAdminNotification,
    sendAthleteConfirmation,
    sendCoachConfirmation,
    sendCoachRevocation
};
