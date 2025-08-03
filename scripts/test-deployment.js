#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BASE_URL = process.env.DEPLOYMENT_URL || 'https://your-vercel-app.vercel.app';
const TIMEOUT = 30000; // 30 seconds

// Colors for console output
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

async function testEndpoint(path, expectedStatus = 200, description = '') {
  const url = `${BASE_URL}${path}`;
  const testName = description || `GET ${path}`;
  
  try {
    log(`Testing: ${testName}`, 'blue');
    const response = await axios.get(url, { timeout: TIMEOUT });
    
    if (response.status === expectedStatus) {
      log(`✅ ${testName} - Status: ${response.status}`, 'green');
      return { success: true, data: response.data };
    } else {
      log(`❌ ${testName} - Expected ${expectedStatus}, got ${response.status}`, 'red');
      return { success: false, status: response.status };
    }
  } catch (error) {
    if (error.response) {
      log(`❌ ${testName} - Error ${error.response.status}: ${error.response.statusText}`, 'red');
      return { success: false, status: error.response.status };
    } else {
      log(`❌ ${testName} - Network error: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }
}

async function testCronEndpoint() {
  const url = `${BASE_URL}/api/cron/collect-data`;
  
  try {
    log('Testing: Cron endpoint (GET)', 'blue');
    const response = await axios.get(url, { timeout: TIMEOUT });
    
    if (response.status === 200) {
      log('✅ Cron endpoint - Status: 200', 'green');
      return { success: true, data: response.data };
    } else {
      log(`❌ Cron endpoint - Unexpected status: ${response.status}`, 'red');
      return { success: false, status: response.status };
    }
  } catch (error) {
    if (error.response) {
      log(`❌ Cron endpoint - Error ${error.response.status}: ${error.response.statusText}`, 'red');
      return { success: false, status: error.response.status };
    } else {
      log(`❌ Cron endpoint - Network error: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }
}

async function runTests() {
  log('🚀 Starting deployment tests...', 'blue');
  log(`📍 Testing URL: ${BASE_URL}`, 'yellow');
  log('');

  const results = [];

  // Test basic endpoints
  results.push(await testEndpoint('/', 200, 'Main page'));
  results.push(await testEndpoint('/api/health', 200, 'Health check'));
  results.push(await testEndpoint('/script.js', 200, 'JavaScript file'));
  results.push(await testEndpoint('/api/pool/data', 200, 'Pool data endpoint'));
  
  // Test 404 handling
  results.push(await testEndpoint('/nonexistent', 404, '404 handling'));
  
  // Test cron endpoint
  results.push(await testCronEndpoint());

  // Summary
  log('');
  log('📊 Test Results Summary:', 'blue');
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  log(`✅ Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  if (passed < total) {
    log('❌ Some tests failed. Check the output above for details.', 'red');
    process.exit(1);
  } else {
    log('🎉 All tests passed! Your deployment is working correctly.', 'green');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log(`💥 Test runner error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { testEndpoint, testCronEndpoint, runTests }; 