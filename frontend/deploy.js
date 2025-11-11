require('dotenv').config();
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

async function deployToFTP() {
    const client = new ftp.Client();
    client.ftp.verbose = true; // Enable verbose for debugging
    client.ftp.timeout = 120000; // 120 second timeout
    
    try {
        console.log('🚀 Connecting to FTP...');
        await client.access({
            host: process.env.FTP_HOST,
            port: parseInt(process.env.FTP_PORT) || 21,
            user: process.env.FTP_USER,
            password: decodeURIComponent(process.env.FTP_PASSWORD),
            secure: false
        });
        
        // Try to ensure passive mode works properly
        await client.ensureDir('/public_html/athlytx.com/');
        
        console.log('✅ Connected successfully!');
        
        console.log('📂 Current directory:', await client.pwd());
        
        // Upload files (excluding deployment files)
        console.log('📤 Uploading files...');
        
        // Upload index.html first
        try {
            await client.uploadFrom('index.html', 'index.html');
            console.log('✅ Uploaded index.html');
        } catch (err) {
            console.log('⚠️ Failed to upload index.html:', err.message);
        }
        
        // Small delay to prevent connection issues
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Upload other HTML files one by one
        const htmlFiles = ['about.html', 'privacy.html', 'terms.html', 'garmin-debug.html', 'whoop-test.html'];
        for (const file of htmlFiles) {
            if (fs.existsSync(file)) {
                try {
                    await client.uploadFrom(file, file);
                    console.log(`✅ Uploaded ${file}`);
                    // Small delay between files
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (err) {
                    console.log(`⚠️ Failed to upload ${file}:`, err.message);
                }
            }
        }

        // Upload JavaScript files
        const jsFiles = ['garmin-oauth2.js', 'oauth-handler.js', 'whoop-oauth2.js', 'test-garmin-oauth.js'];
        for (const file of jsFiles) {
            if (fs.existsSync(file)) {
                try {
                    await client.uploadFrom(file, file);
                    console.log(`✅ Uploaded ${file}`);
                    // Small delay between files
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (err) {
                    console.log(`⚠️ Failed to upload ${file}:`, err.message);
                }
            }
        }

        // Upload documentation
        const docFiles = ['GARMIN_OAUTH2_INTEGRATION.md'];
        for (const file of docFiles) {
            if (fs.existsSync(file)) {
                try {
                    await client.uploadFrom(file, file);
                    console.log(`✅ Uploaded ${file}`);
                    // Small delay between files
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (err) {
                    console.log(`⚠️ Failed to upload ${file}:`, err.message);
                }
            }
        }
        
        // Upload src directory
        if (fs.existsSync('src')) {
            await client.uploadFromDir('src', 'src');
            console.log('✅ Uploaded src directory');
        }
        
        console.log('🎉 Deployment complete!');
        
    } catch (err) {
        console.log('❌ Deployment failed:', err.message);
    } finally {
        client.close();
    }
}

deployToFTP();