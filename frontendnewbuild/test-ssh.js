const Client = require("ssh2-sftp-client");

async function testConnection() {
    const sftp = new Client();
    
    try {
        console.log("🔐 Testing connection with different options...");
        
        // Try different connection configurations
        const configs = [
            {
                host: "athlytx.com",
                username: "nahsc643p90t", 
                password: "Xozkyh-7tumzi-sipcif",
                port: 22,
                algorithms: {
                    kex: ["diffie-hellman-group14-sha256", "ecdh-sha2-nistp256"],
                    cipher: ["aes128-ctr", "aes192-ctr", "aes256-ctr"],
                    serverHostKey: ["ssh-rsa", "ecdsa-sha2-nistp256"],
                    hmac: ["hmac-sha2-256", "hmac-sha1"]
                }
            },
            {
                host: "ssh.athlytx.com",
                username: "nahsc643p90t",
                password: "Xozkyh-7tumzi-sipcif", 
                port: 22
            }
        ];
        
        for (let i = 0; i < configs.length; i++) {
            try {
                console.log(`Trying config ${i + 1}...`);
                await sftp.connect(configs[i]);
                console.log("✅ Connected successfully with config", i + 1);
                return true;
            } catch (err) {
                console.log(`❌ Config ${i + 1} failed:`, err.message);
                await sftp.end().catch(() => {});
            }
        }
        
    } catch (err) {
        console.error("❌ All connection attempts failed:", err.message);
        return false;
    }
}

testConnection();
