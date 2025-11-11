require('dotenv').config();
const ftp = require('basic-ftp');

async function deploy() {
    const client = new ftp.Client();
    client.ftp.timeout = 30000;
    
    try {
        // Connect
        await client.access({
            host: process.env.FTP_HOST,
            port: 21,
            user: process.env.FTP_USER,
            password: decodeURIComponent(process.env.FTP_PASSWORD),
            secure: false
        });
        
        console.log('✅ Connected to FTP');
        
        // Change directory
        await client.cd('/public_html/athlytx.com/');
        console.log('📁 In directory:', await client.pwd());
        
        // Upload index.html
        console.log('📤 Uploading index.html...');
        await client.uploadFrom('index.html', 'index.html');
        console.log('✅ index.html uploaded!');
        
        console.log('🎉 Deployment complete!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.close();
    }
}

deploy();