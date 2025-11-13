const Client = require("ssh2-sftp-client");
const fs = require("fs");
const path = require("path");

async function deployViaSFTP() {
    const sftp = new Client();
    
    try {
        console.log("🔐 Connecting to server via SFTP...");
        await sftp.connect({
            host: "athlytx.com",
            username: "nahsc643p90t",
            password: "Xozkyh-7tumzi-sipcif",
            port: 22
        });
        
        console.log("✅ Connected successfully!");
        
        // Upload index.html
        const localPath = "./index.html";
        const remotePath = "/home/nahsc643p90t/public_html/athlytx.com/index.html";
        
        console.log("📤 Uploading index.html...");
        await sftp.put(localPath, remotePath);
        console.log("✅ index.html uploaded successfully!");
        
        // Upload other HTML files if they exist
        const htmlFiles = ["about.html", "privacy.html", "terms.html", "garmin-debug.html"];
        for (const file of htmlFiles) {
            if (fs.existsSync(file)) {
                console.log(`📤 Uploading ${file}...`);
                await sftp.put(`./${file}`, `/home/nahsc643p90t/public_html/athlytx.com/${file}`);
                console.log(`✅ ${file} uploaded successfully!`);
            }
        }
        
        console.log("🎉 Deployment complete!");
        
    } catch (err) {
        console.error("❌ Deployment failed:", err.message);
    } finally {
        await sftp.end();
    }
}

deployViaSFTP();
