/**
 * Test script for weather alert service
 * Run with: node test-weather-alerts.js
 */

const WeatherAlertService = require('./src/services/weatherAlertService');

async function testWeatherAlerts() {
  console.log('🧪 Testing Weather Alert Service...\n');
  
  const weatherAlerts = new WeatherAlertService();
  
  try {
    // Test 1: Check if service initializes correctly
    console.log('1️⃣ Testing service initialization...');
    console.log(`   ZIP Code: ${weatherAlerts.zipCode}`);
    console.log(`   State: ${weatherAlerts.state}`);
    console.log(`   Coordinates: ${weatherAlerts.coordinates.lat}, ${weatherAlerts.coordinates.lng}`);
    console.log('   ✅ Service initialized successfully\n');
    
    // Test 2: Test alert checking (this will make an API call)
    console.log('2️⃣ Testing weather alert fetching...');
    const alerts = await weatherAlerts.getWeatherAlerts();
    console.log(`   Found ${alerts.length} weather alerts`);
    
    if (alerts.length > 0) {
      console.log('   Sample alert:');
      const sampleAlert = alerts[0];
      console.log(`   - Event: ${sampleAlert.properties.event}`);
      console.log(`   - Severity: ${sampleAlert.properties.severity}`);
      console.log(`   - Urgency: ${sampleAlert.properties.urgency}`);
      console.log(`   - Effective: ${sampleAlert.properties.effective}`);
      console.log(`   - Expires: ${sampleAlert.properties.expires}`);
    }
    console.log('   ✅ Alert fetching completed\n');
    
    // Test 3: Test alert parsing
    console.log('3️⃣ Testing alert parsing...');
    if (alerts.length > 0) {
      const parsedAlert = weatherAlerts.parseAlertData(alerts[0]);
      console.log('   Parsed alert data:');
      console.log(`   - ID: ${parsedAlert.id}`);
      console.log(`   - Event: ${parsedAlert.event}`);
      console.log(`   - Start Time: ${parsedAlert.startTime}`);
      console.log(`   - End Time: ${parsedAlert.endTime}`);
      console.log('   ✅ Alert parsing completed\n');
    } else {
      console.log('   ⏭️ No alerts to parse\n');
    }
    
    // Test 4: Test dashboard alerts (if InfluxDB is available)
    console.log('4️⃣ Testing dashboard alerts...');
    try {
      const dashboardAlerts = await weatherAlerts.getDashboardAlerts();
      console.log(`   Has active alerts: ${dashboardAlerts.hasActiveAlerts}`);
      console.log(`   Alert count: ${dashboardAlerts.alertCount}`);
      console.log('   ✅ Dashboard alerts completed\n');
    } catch (error) {
      console.log(`   ⚠️ Dashboard alerts failed (InfluxDB may not be available): ${error.message}\n`);
    }
    
    console.log('🎉 Weather Alert Service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testWeatherAlerts(); 