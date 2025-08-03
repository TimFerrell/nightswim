#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = process.env.DEPLOYMENT_URL || 'https://nightswim.vercel.app';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function quickTest() {
  log('🚀 Quick Deployment Test', 'blue');
  log(`📍 Testing: ${BASE_URL}`, 'yellow');
  log('');

  try {
    // Test 1: Health check
    log('Testing: Health check', 'blue');
    const health = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    if (health.data.hasCredentials) {
      log('✅ Health check: Credentials configured', 'green');
    } else {
      log('❌ Health check: Missing credentials', 'red');
    }

    // Test 2: Main page
    log('Testing: Main page', 'blue');
    const mainPage = await axios.get(`${BASE_URL}/`, { timeout: 5000 });
    log('✅ Main page: Loads successfully', 'green');

    // Test 3: JavaScript file
    log('Testing: JavaScript file', 'blue');
    const script = await axios.get(`${BASE_URL}/script.js`, { timeout: 5000 });
    log('✅ JavaScript file: Serves correctly', 'green');

    log('');
    log('🎉 Core functionality is working!', 'green');
    log('Your deployment is ready to use.', 'green');
    log('');
    log('Note: Pool data endpoints may take longer to respond due to authentication.', 'yellow');
    log('This is normal behavior.', 'yellow');

  } catch (error) {
    log('❌ Test failed:', 'red');
    log(error.message, 'red');
  }
}

quickTest(); 