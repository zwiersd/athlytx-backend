require('dotenv').config();
const FtpDeploy = require('ftp-deploy');
const ftpDeploy = new FtpDeploy();

const config = {
    user: process.env.FTP_USER,
    password: 'yMn2EU9%rlI#', // Using the raw password
    host: process.env.FTP_HOST,
    port: 21,
    localRoot: __dirname,
    remoteRoot: '/public_html/athlytx.com/',
    include: ['index.html'],  // Just try index.html first
    exclude: [],
    deleteRemote: false,
    forcePasv: true,
    sftp: false
};

console.log('🚀 Starting deployment with ftp-deploy...');

ftpDeploy
    .deploy(config)
    .then(res => {
        console.log('✅ Deployment finished:', res);
    })
    .catch(err => {
        console.error('❌ Deployment error:', err);
    });

ftpDeploy.on('uploading', function(data) {
    console.log(`📤 Uploading: ${data.filename} (${data.transferredFileCount}/${data.totalFilesCount})`);
});

ftpDeploy.on('uploaded', function(data) {
    console.log(`✅ Uploaded: ${data.filename}`);
});

ftpDeploy.on('upload-error', function(data) {
    console.error(`❌ Error uploading ${data.filename}:`, data.err);
});