require('dotenv').config();
const ftp = require('basic-ftp');

async function deployIndexOnly() {
    const client = new ftp.Client();
    client.ftp.timeout = 30000; // 30 second timeout

    try {
        console.log('🚀 Connecting to FTP for index.html only...');
        await client.access({
            host: process.env.FTP_HOST,
            port: parseInt(process.env.FTP_PORT) || 21,
            user: process.env.FTP_USER,
            password: decodeURIComponent(process.env.FTP_PASSWORD),
            secure: false
        });

        await client.ensureDir('/public_html/athlytx.com/');
        console.log('✅ Connected and in correct directory');

        // Upload only index.html
        console.log('📤 Uploading index.html...');
        await client.uploadFrom('index.html', 'index.html');
        console.log('✅ Successfully uploaded index.html');

    } catch (err) {
        console.log('❌ Upload failed:', err.message);
    } finally {
        client.close();
    }
}

deployIndexOnly();