const express = require('express');
const { influxDBClient } = require('./src/domains/monitoring');

// Set environment variables
process.env.INFLUXDB_URL = 'https://us-central1-1.gcp.cloud2.influxdata.com';
process.env.INFLUX_DB_TOKEN = 'msQEjVFc4CfAOgEprMLFDU7KrFg8fm56SuxvlfdQrTTUBURHCxZGRJMFqrIkxbL0FuHcA9TJ8Xu4IFrCTqRp1w==';
process.env.INFLUXDB_ORG = 'timothyferrell@gmail.com';
process.env.INFLUXDB_BUCKET = 'pool-data';

async function testHomeEnvironmentEndpoint24h() {
  console.log('🧪 Testing the /api/home/environment endpoint with 24h range...\n');

  try {
    const requestStartTime = Date.now();
    console.log('🏠 [Home Environment] Testing with 24h range');

    // Test with 24 hours instead of 1 hour
    const data = await influxDBClient.queryHomeEnvironmentData(24, 10);

    console.log(`📊 Raw data returned: ${data.length} points`);
    if (data.length > 0) {
      console.log('📋 Sample data points:');
      data.slice(0, 3).forEach((point, index) => {
        console.log(`   Point ${index + 1}:`, JSON.stringify(point, null, 2));
      });
    }

    if (data.length === 0) {
      const totalTime = Date.now() - requestStartTime;
      console.log(`❌ [Home Environment] No data available after ${totalTime}ms`);
      return { success: false, message: 'No data found with 24h range' };
    }

    const latestData = data[data.length - 1];
    console.log('📋 Latest data point:', JSON.stringify(latestData, null, 2));

    // Calculate comfort level
    function calculateComfortLevel(temperature, humidity) {
      if (temperature === null || humidity === null) {
        return 'unknown';
      }
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
      responseTime: totalTime,
      totalDataPoints: data.length
    };

    console.log('📋 Final Response:', JSON.stringify(response, null, 2));
    return response;

  } catch (error) {
    console.error('❌ [Home Environment] Error:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
testHomeEnvironmentEndpoint24h()
  .then(result => {
    console.log('\n🎯 Final Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success && result.data.temperature !== null) {
      console.log('\n✅ SUCCESS: API endpoint works with 24h range!');
      console.log(`   Temperature: ${result.data.temperature}°F`);
      console.log(`   Humidity: ${result.data.humidity}%`);
      console.log(`   Feels-Like: ${result.data.feelsLike}°F`);
      console.log(`   Total data points: ${result.totalDataPoints}`);
    } else {
      console.log('\n❌ FAILED: API endpoint still returns no data');
    }
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
  });
