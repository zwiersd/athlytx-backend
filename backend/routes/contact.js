const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/contact
 * Send contact form email via Resend
 */
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['name', 'email', 'subject', 'message']
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        // Send email via Resend
        const emailData = await resend.emails.send({
            from: 'Athlytx Contact Form <noreply@athlytx.com>',
            to: ['info@athlytx.com'],
            replyTo: email,
            subject: `Contact Form: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea;">New Contact Form Submission</h2>

                    <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 8px 0;"><strong>From:</strong> ${name}</p>
                        <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 8px 0;"><strong>Subject:</strong> ${subject}</p>
                    </div>

                    <div style="background: #ffffff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2d3748;">Message:</h3>
                        <p style="white-space: pre-wrap; line-height: 1.6; color: #4a5568;">${message}</p>
                    </div>

                    <p style="color: #718096; font-size: 12px; margin-top: 30px;">
                        This email was sent from the Athlytx contact form. Reply directly to this email to respond to ${name}.
                    </p>
                </div>
            `
        });

        console.log('[CONTACT] Email sent successfully:', emailData);

        res.json({
            success: true,
            message: 'Your message has been sent successfully! We\'ll get back to you soon.',
            emailId: emailData.id
        });

    } catch (error) {
        console.error('[CONTACT] Error sending email:', error);

        res.status(500).json({
            error: 'Failed to send message',
            message: 'There was an error sending your message. Please try again later or email us directly at info@athlytx.com'
        });
    }
});

module.exports = router;
