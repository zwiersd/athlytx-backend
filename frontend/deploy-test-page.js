require('dotenv').config();
const ftp = require('basic-ftp');

async function deployTestPage() {
    const client = new ftp.Client();
    client.ftp.timeout = 30000;

    try {
        console.log('🚀 Connecting to FTP for test page...');
        await client.access({
            host: process.env.FTP_HOST,
            port: parseInt(process.env.FTP_PORT) || 21,
            user: process.env.FTP_USER,
            password: decodeURIComponent(process.env.FTP_PASSWORD),
            secure: false
        });

        await client.ensureDir('/public_html/athlytx.com/');
        console.log('✅ Connected');

        // Upload test page for debugging
        console.log('📤 Uploading test-garmin-fix.html...');
        await client.uploadFrom('test-garmin-fix.html', 'test-garmin-fix.html');
        console.log('✅ Uploaded test-garmin-fix.html');

        // Also upload the garmin oauth JS file
        console.log('📤 Uploading garmin-oauth2.js...');
        await client.uploadFrom('garmin-oauth2.js', 'garmin-oauth2.js');
        console.log('✅ Uploaded garmin-oauth2.js');

    } catch (err) {
        console.log('❌ Upload failed:', err.message);
    } finally {
        client.close();
    }
}

deployTestPage();