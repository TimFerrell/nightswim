const express = require('express');
const { influxDBClient } = require('./src/domains/monitoring');

// Set environment variables
process.env.INFLUXDB_URL = 'https://us-central1-1.gcp.cloud2.influxdata.com';
process.env.INFLUX_DB_TOKEN = 'msQEjVFc4CfAOgEprMLFDU7KrFg8fm56SuxvlfdQrTTUBURHCxZGRJMFqrIkxbL0FuHcA9TJ8Xu4IFrCTqRp1w==';
process.env.INFLUXDB_ORG = 'timothyferrell@gmail.com';
process.env.INFLUXDB_BUCKET = 'pool-data';

async function testHomeEnvironmentEndpoint() {
  console.log('🧪 Testing the actual /api/home/environment endpoint logic...\n');

  try {
    // This is the exact logic from the homeRoutes.js endpoint
    const requestStartTime = Date.now();
    console.log('🏠 [Home Environment] /api/home/environment request started');

    // Get the latest data point (last hour)
    const data = await influxDBClient.queryHomeEnvironmentData(1, 1);

    if (data.length === 0) {
      const totalTime = Date.now() - requestStartTime;
      console.log(`❌ [Home Environment] No data available after ${totalTime}ms`);

      const response = {
        success: true,
        data: {
          temperature: null,
          humidity: null,
          feelsLike: null,
          comfortLevel: 'unknown',
          humidityLevel: 'unknown',
          timestamp: new Date().toISOString(),
          source: 'influxdb'
        },
        message: 'No home environment data available',
        responseTime: totalTime
      };

      console.log('📋 Response (no data):', JSON.stringify(response, null, 2));
      return response;
    }

    const latestData = data[data.length - 1];

    // Calculate comfort level (from homeRoutes.js)
    function calculateComfortLevel(temperature, humidity) {
      if (temperature === null || humidity === null) {
        return 'unknown';
      }

      // Comfort zones based on temperature and humidity
      if (temperature >= 68 && temperature <= 78 && humidity >= 30 && humidity <= 60) {
        return 'comfortable';
      } else if (temperature > 78 || (temperature > 75 && humidity > 60)) {
        return 'hot';
      }
      if (temperature < 68) {
        return 'cold';
      }
      if (humidity > 60) {
        return 'humid';
      }
      if (humidity < 30) {
        return 'dry';
      }
      return 'marginal';
    }

    // Calculate humidity level (from homeRoutes.js)
    function calculateHumidityLevel(humidity) {
      if (humidity === null) {
        return 'unknown';
      }

      if (humidity < 30) {
        return 'low';
      }
      if (humidity >= 30 && humidity <= 60) {
        return 'normal';
      }
      if (humidity > 60 && humidity <= 70) {
        return 'high';
      }
      return 'very_high';
    }

    const comfortLevel = calculateComfortLevel(latestData.temperature, latestData.humidity);
    const humidityLevel = calculateHumidityLevel(latestData.humidity);

    const totalTime = Date.now() - requestStartTime;
    console.log(`✅ [Home Environment] Data retrieved in ${totalTime}ms`);

    const response = {
      success: true,
      data: {
        temperature: latestData.temperature,
        humidity: latestData.humidity,
        feelsLike: latestData.feelsLike,
        comfortLevel,
        humidityLevel,
        timestamp: latestData.timestamp,
        source: 'influxdb'
      },
      responseTime: totalTime
    };

    console.log('📋 Response (with data):', JSON.stringify(response, null, 2));
    return response;

  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error('❌ [Home Environment] Error fetching current data:', error);

    const response = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve home environment data',
      responseTime: totalTime
    };

    console.log('📋 Response (error):', JSON.stringify(response, null, 2));
    return response;
  }
}

// Run the test
testHomeEnvironmentEndpoint()
  .then(result => {
    console.log('\n🎯 Final Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success && result.data.temperature !== null) {
      console.log('\n✅ SUCCESS: API endpoint logic works locally!');
      console.log(`   Temperature: ${result.data.temperature}°F`);
      console.log(`   Humidity: ${result.data.humidity}%`);
      console.log(`   Feels-Like: ${result.data.feelsLike}°F`);
    } else {
      console.log('\n❌ FAILED: API endpoint logic returns no data locally');
    }
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
  });
