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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #0a0e27 0%, #1e2659 30%, #2c1810 70%, #0f0a1a 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Athlytx Elite</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0; font-size: 16px;">Professional Coaching Dashboard</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1a202c; margin: 0 0 20px 0; font-size: 24px;">Your Login Code</h2>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Use this code to access your Athlytx Elite coaching dashboard:
            </p>

            <!-- Code Display -->
            <div style="background: linear-gradient(135deg, #0a0e27 0%, #1e2659 100%); border-radius: 8px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
                <div style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: white; font-family: monospace;">
                    ${code}
                </div>
            </div>

            <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                Or click the button below to log in directly:
            </p>

            <!-- Login Button -->
            <div style="text-align: center; margin: 0 0 30px 0;">
                <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #5a67d8); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Log In to Athlytx Elite
                </a>
            </div>

            <!-- Security Notice -->
            <div style="background: #f7fafc; border-left: 4px solid #667eea; padding: 16px; border-radius: 4px;">
                <p style="color: #2d3748; font-size: 14px; line-height: 1.6; margin: 0;">
                    <strong>Security Notice:</strong> This code expires in 15 minutes. If you didn't request this login, please ignore this email.
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: #f7fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #718096; font-size: 12px; margin: 0 0 8px 0;">
                © ${new Date().getFullYear()} Athlytx. All rights reserved.
            </p>
            <p style="color: #a0aec0; font-size: 11px; margin: 0;">
                Professional coaching analytics platform
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
