require("dotenv").config();
const ftp = require("basic-ftp");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    
    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: decodeURIComponent(process.env.FTP_PASSWORD),
            secure: false
        });
        
        console.log("Connected to FTP server");
        
        // Upload just index.html
        await client.cd("/public_html/athlytx.com/");
        await client.uploadFrom("index.html", "index.html");
        console.log("✅ index.html uploaded successfully!");
        
    } catch(err) {
        console.error("Error:", err.message);
    }
    
    client.close();
}

deploy();
