const axios = require('axios');
const fs = require('fs');

// Read version from app.json
const appConfig = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
const version = appConfig.expo.version;

// Get mode from command line argument
const mode = process.argv[2];

if (!mode || !['test', 'pilot', 'free', 'paid'].includes(mode)) {
  console.error('Usage: node setMode.js <test|pilot|free|paid>');
  process.exit(1);
}

async function setMode() {
  try {
    const response = await axios.post('https://homeedu.fsdgroup.com.ng/api/AddMode', {
      app_version: version,
      mode: mode
    });
    
    console.log(`✅ Mode set successfully!`);
    console.log(`Version: ${version}`);
    console.log(`Mode: ${mode}`);
    console.log(`Response:`, response.data);
  } catch (error) {
    console.error('❌ Error setting mode:', error.response?.data || error.message);
  }
}

setMode();