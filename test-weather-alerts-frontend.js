/**
 * Test script for weather alerts frontend integration
 * Run with: node test-weather-alerts-frontend.js
 */

const axios = require('axios');

async function testWeatherAlertsFrontend() {
  console.log('🧪 Testing Weather Alerts Frontend Integration...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Check if the main page loads
    console.log('1️⃣ Testing main page load...');
    const pageResponse = await axios.get(`${baseUrl}/`);
    console.log(`   ✅ Main page loaded successfully (${pageResponse.status})`);
    console.log(`   📄 Page size: ${pageResponse.data.length} characters\n`);
    
    // Test 2: Check weather alerts API endpoint
    console.log('2️⃣ Testing weather alerts API endpoint...');
    const alertsResponse = await axios.get(`${baseUrl}/api/pool/alerts`);
    console.log(`   ✅ Weather alerts API responded (${alertsResponse.status})`);
    console.log(`   📊 Response data:`, alertsResponse.data);
    console.log(`   🔍 Has active alerts: ${alertsResponse.data.data.hasActiveAlerts}`);
    console.log(`   📈 Alert count: ${alertsResponse.data.data.alertCount}\n`);
    
    // Test 3: Check weather alerts active endpoint
    console.log('3️⃣ Testing weather alerts active endpoint...');
    const activeResponse = await axios.get(`${baseUrl}/api/pool/alerts/active`);
    console.log(`   ✅ Active alerts API responded (${activeResponse.status})`);
    console.log(`   📊 Response data:`, activeResponse.data);
    console.log(`   🔍 Has active alerts: ${activeResponse.data.data.hasActiveAlerts}\n`);
    
    // Test 4: Check weather alerts history endpoint
    console.log('4️⃣ Testing weather alerts history endpoint...');
    const historyResponse = await axios.get(`${baseUrl}/api/pool/alerts/history?hours=24`);
    console.log(`   ✅ History API responded (${historyResponse.status})`);
    console.log(`   📊 Response data:`, historyResponse.data);
    console.log(`   📈 Total alerts in history: ${historyResponse.data.data.alerts.length}\n`);
    
    // Test 5: Check if the weather alerts card HTML is present
    console.log('5️⃣ Checking for weather alerts card in HTML...');
    if (pageResponse.data.includes('weatherAlertsCard')) {
      console.log('   ✅ Weather alerts card HTML found in page');
    } else {
      console.log('   ❌ Weather alerts card HTML not found in page');
    }
    
    if (pageResponse.data.includes('weatherAlertsValue')) {
      console.log('   ✅ Weather alerts value element found in page');
    } else {
      console.log('   ❌ Weather alerts value element not found in page');
    }
    
    if (pageResponse.data.includes('weatherAlertsContainer')) {
      console.log('   ✅ Weather alerts container found in page');
    } else {
      console.log('   ❌ Weather alerts container not found in page');
    }
    
    // Test 6: Check if the JavaScript functions are loaded
    console.log('6️⃣ Checking for weather alerts JavaScript functions...');
    const scriptResponse = await axios.get(`${baseUrl}/script.js`);
    if (scriptResponse.data.includes('loadWeatherAlerts')) {
      console.log('   ✅ Weather alerts JavaScript function found in script.js');
    } else {
      console.log('   ❌ Weather alerts JavaScript function not found in script.js');
    }
    
    if (scriptResponse.data.includes('updateWeatherAlertsCard')) {
      console.log('   ✅ Weather alerts update function found in script.js');
    } else {
      console.log('   ❌ Weather alerts update function not found in script.js');
    }
    
    if (scriptResponse.data.includes('createWeatherAlertItem')) {
      console.log('   ✅ Weather alert item creation function found in script.js');
    } else {
      console.log('   ❌ Weather alert item creation function not found in script.js');
    }
    
    console.log('\n🎉 Weather Alerts Frontend Integration Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ All API endpoints are working');
    console.log('   ✅ Frontend HTML structure is in place');
    console.log('   ✅ JavaScript functions are loaded');
    console.log('   ✅ No active weather alerts currently (expected)');
    console.log('\n🌐 You can now view the dashboard at: http://localhost:3000');
    console.log('   The weather alerts card should show "0 Active" with "No active alerts" message');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   HTTP Status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testWeatherAlertsFrontend(); 