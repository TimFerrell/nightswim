/**
 * Test script to verify weather service coordinates for 32708
 */

const weatherService = require('./src/services/weatherService');

async function testWeatherCoordinates() {
  console.log('🧪 Testing Weather Service Coordinates for 32708\n');
  
  console.log('📍 Current coordinates in weather service:');
  console.log(`   Latitude: ${weatherService.latitude}`);
  console.log(`   Longitude: ${weatherService.longitude}`);
  console.log(`   ZIP Code: ${weatherService.zipCode}\n`);
  
  console.log('🌤️ Testing weather data fetch...');
  try {
    const weatherData = await weatherService.getCurrentWeather();
    
    if (weatherData) {
      console.log('✅ Weather data fetched successfully:');
      console.log(`   Temperature: ${weatherData.temperature}°F`);
      console.log(`   Humidity: ${weatherData.humidity}%`);
      console.log(`   Description: ${weatherData.description}`);
      console.log(`   Source: ${weatherData.source}`);
      console.log(`   Timestamp: ${weatherData.timestamp}`);
    } else {
      console.log('❌ Weather data fetch failed');
    }
  } catch (error) {
    console.error('❌ Error fetching weather data:', error.message);
  }
  
  console.log('\n📊 Coordinate Verification:');
  console.log('   Expected (Winter Springs, FL): 28.6884611, -81.2741674');
  console.log(`   Actual: ${weatherService.latitude}, ${weatherService.longitude}`);
  
  const latDiff = Math.abs(weatherService.latitude - 28.6884611);
  const lngDiff = Math.abs(weatherService.longitude - (-81.2741674));
  
  console.log(`   Latitude difference: ${latDiff.toFixed(6)} degrees`);
  console.log(`   Longitude difference: ${lngDiff.toFixed(6)} degrees`);
  
  if (latDiff < 0.001 && lngDiff < 0.001) {
    console.log('✅ Coordinates are correct!');
  } else {
    console.log('❌ Coordinates are incorrect!');
  }
}

// Run the test
testWeatherCoordinates(); 