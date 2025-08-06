/**
 * Test script for ZIP code geocoding
 * Run with: node test-geocoding.js [ZIP_CODE]
 */

const WeatherAlertService = require('./src/services/weatherAlertService');

async function testGeocoding() {
  const zipCode = process.argv[2] || '90210';
  console.log(`🧪 Testing geocoding for ZIP code: ${zipCode}\n`);
  
  const weatherAlerts = new WeatherAlertService();
  
  try {
    // Test 1: Initialize the service
    console.log('1️⃣ Initializing weather alert service...');
    await weatherAlerts.initialize();
    console.log(`   ✅ Service initialized successfully`);
    console.log(`   📍 Location: ${weatherAlerts.coordinates.displayName}`);
    console.log(`   🗺️ Coordinates: ${weatherAlerts.coordinates.lat}, ${weatherAlerts.coordinates.lng}`);
    console.log(`   🏛️ State: ${weatherAlerts.state}\n`);
    
    // Test 2: Test weather alert fetching
    console.log('2️⃣ Testing weather alert fetching...');
    const alerts = await weatherAlerts.getWeatherAlerts();
    console.log(`   📡 Found ${alerts.length} weather alerts for ${weatherAlerts.state}`);
    
    if (alerts.length > 0) {
      console.log('   Sample alert:');
      const sampleAlert = alerts[0];
      console.log(`   - Event: ${sampleAlert.properties.event}`);
      console.log(`   - Severity: ${sampleAlert.properties.severity}`);
      console.log(`   - Area: ${sampleAlert.properties.areaDesc}`);
    }
    console.log('   ✅ Weather alert fetching completed\n');
    
    console.log('🎉 Geocoding test completed successfully!');
    console.log(`\n📋 Summary:`);
    console.log(`   ZIP Code: ${zipCode}`);
    console.log(`   Location: ${weatherAlerts.coordinates.displayName}`);
    console.log(`   Coordinates: ${weatherAlerts.coordinates.lat}, ${weatherAlerts.coordinates.lng}`);
    console.log(`   State: ${weatherAlerts.state}`);
    console.log(`   Weather Alerts Found: ${alerts.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testGeocoding(); 