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
                    <strong style="color: #1a202c;">🔒 Security Notice:</strong> This code expires in 15 minutes. If you didn't request this login, you can safely ignore this email.
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

module.exports = {
    sendMagicLink,
    sendAthleteInvite
};
