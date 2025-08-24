const geocodingService = require('./src/services/geocodingService');
const weatherService = require('./src/services/weatherService');
const WeatherAlertService = require('./src/services/weatherAlertService');

/**
 * Test unified geocoding system
 */
async function testUnifiedGeocoding() {
  console.log('🧪 Testing Unified Geocoding System');
  console.log('=====================================\n');

  try {
    // Test 1: Direct Geocoding Service
    console.log('📍 Test 1: Direct Geocoding Service');
    console.log('-----------------------------------');
    
    const testZips = ['32708', '90210', '33101', '77001'];
    
    for (const zip of testZips) {
      console.log(`\n🌍 Testing ZIP code: ${zip}`);
      const coords = await geocodingService.getCoordinatesFromZip(zip);
      console.log(`  📍 ${coords.displayName}`);
      console.log(`  📊 Coordinates: ${coords.lat}, ${coords.lng}`);
      console.log(`  🏷️ Source: ${coords.source}`);
    }

    // Test 2: Weather Service Integration
    console.log('\n\n🌤️ Test 2: Weather Service Integration');
    console.log('-------------------------------------');
    
    console.log('\n🔧 Initializing weather service...');
    await weatherService.initialize();
    
    const weatherCoords = weatherService.getCoordinates();
    console.log(`📍 Weather Service Location: ${weatherCoords.displayName}`);
    console.log(`📊 Weather Service Coordinates: ${weatherCoords.lat}, ${weatherCoords.lng}`);
    console.log(`🏷️ Weather Service Source: ${weatherCoords.source}`);

    // Test 3: Weather Alert Service Integration
    console.log('\n\n⚠️ Test 3: Weather Alert Service Integration');
    console.log('-------------------------------------------');
    
    const weatherAlerts = new WeatherAlertService();
    console.log('\n🔧 Initializing weather alert service...');
    await weatherAlerts.initialize();
    
    const alertsCoords = weatherAlerts.getCoordinates();
    const alertsState = weatherAlerts.getState();
    console.log(`📍 Weather Alerts Location: ${alertsCoords.displayName}`);
    console.log(`📊 Weather Alerts Coordinates: ${alertsCoords.lat}, ${alertsCoords.lng}`);
    console.log(`🏷️ Weather Alerts Source: ${alertsCoords.source}`);
    console.log(`🗺️ Weather Alerts State: ${alertsState}`);

    // Test 4: ZIP Code Update
    console.log('\n\n🔄 Test 4: ZIP Code Updates');
    console.log('---------------------------');
    
    const newZip = '33139'; // Miami Beach, FL
    console.log(`\n📥 Updating weather services to ZIP: ${newZip}`);
    
    const weatherUpdateSuccess = await weatherService.updateZipCode(newZip);
    const alertsUpdateSuccess = await weatherAlerts.updateZipCode(newZip);
    
    console.log(`✅ Weather Service Update: ${weatherUpdateSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Weather Alerts Update: ${alertsUpdateSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    if (weatherUpdateSuccess) {
      const updatedWeatherCoords = weatherService.getCoordinates();
      console.log(`📍 New Weather Location: ${updatedWeatherCoords.displayName}`);
    }
    
    if (alertsUpdateSuccess) {
      const updatedAlertsCoords = weatherAlerts.getCoordinates();
      const updatedAlertsState = weatherAlerts.getState();
      console.log(`📍 New Alerts Location: ${updatedAlertsCoords.displayName}`);
      console.log(`🗺️ New Alerts State: ${updatedAlertsState}`);
    }

    // Test 5: Cache Performance
    console.log('\n\n⚡ Test 5: Cache Performance');
    console.log('---------------------------');
    
    console.log('\n🔍 Testing cache performance...');
    const startTime = Date.now();
    
    // This should be cached from previous call
    const cachedCoords = await geocodingService.getCoordinatesFromZip(newZip);
    
    const cacheTime = Date.now() - startTime;
    console.log(`📍 Cached Location: ${cachedCoords.displayName}`);
    console.log(`⚡ Cache lookup time: ${cacheTime}ms`);
    
    const cacheStats = geocodingService.getCacheStats();
    console.log(`📊 Cache entries: ${cacheStats.size}`);
    console.log(`🗂️ Cached ZIP codes: ${cacheStats.entries.join(', ')}`);

    console.log('\n\n✅ All geocoding tests completed successfully!');
    console.log('===========================================\n');

  } catch (error) {
    console.error('\n❌ Geocoding test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testUnifiedGeocoding().then(() => {
    console.log('🎉 Test completed!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testUnifiedGeocoding };