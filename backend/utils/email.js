const { Resend } = require('resend');

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

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
            subject: 'Your Athlytx Elite Login Code',
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
            <h2 style="color: #0a0e27; margin: 0 0 16px 0; font-size: 26px; font-weight: 700;">Your Login Code</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.7; margin: 0 0 35px 0;">
                Enter this code to access your elite coaching dashboard and unlock powerful analytics:
            </p>

            <!-- Code Display - Dark Box with Bright Text -->
            <div style="background: linear-gradient(135deg, #0a0e27 0%, #1e2659 100%); border-radius: 12px; padding: 35px 30px; text-align: center; margin: 0 0 35px 0; border: 2px solid #667eea; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);">
                <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);">
                    ${code}
                </div>
            </div>

            <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0; text-align: center;">
                Or use the button below for instant access:
            </p>

            <!-- Login Button -->
            <div style="text-align: center; margin: 0 0 40px 0;">
                <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #5a67d8); color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 700; font-size: 17px; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.35); transition: all 0.3s;">
                    Access Elite Dashboard →
                </a>
            </div>

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
Your Athlytx Elite Login Code

Use this code to access your coaching dashboard: ${code}

Or click this link to log in directly:
${magicLinkUrl}

This code expires in 15 minutes. If you didn't request this login, please ignore this email.

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

module.exports = {
    sendMagicLink
};
