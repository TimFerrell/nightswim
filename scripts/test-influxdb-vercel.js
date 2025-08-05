// Test InfluxDB connection for Vercel deployment
const influxDBService = require('../src/services/influxDBService');

async function testInfluxDBVercel() {
  console.log('🧪 Testing InfluxDB Connection for Vercel...\n');

  try {
    // Check environment variables
    console.log('📋 Environment Variables Check:');
    console.log('================================');
    console.log(`INFLUXDB_URL: ${process.env.INFLUXDB_URL ? 'SET' : 'NOT SET'}`);
    console.log(`INFLUX_DB_TOKEN: ${process.env.INFLUX_DB_TOKEN ? 'SET' : 'NOT SET'}`);
    console.log(`INFLUXDB_ORG: ${process.env.INFLUXDB_ORG ? 'SET' : 'NOT SET'}`);
    console.log(`INFLUXDB_BUCKET: ${process.env.INFLUXDB_BUCKET || 'pool_metrics'}`);
    console.log('');

    // Wait a moment for initialization
    console.log('⏳ Waiting for InfluxDB initialization...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test connection
    console.log('🔍 Testing InfluxDB connection...');
    const results = await influxDBService.testConnection();
    
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log('Configuration Check:', results.configCheck);
    console.log('Connection Status:', results.connectionStatus);
    console.log('Client Exists:', results.clientExists);
    console.log('Write API Exists:', results.writeApiExists);
    console.log('Query API Exists:', results.queryApiExists);
    
    if (results.writeTest !== undefined) {
      console.log('Write Test:', results.writeTest);
      if (results.writeError) {
        console.log('Write Error:', results.writeError);
      }
    }

    // Try to query some data
    if (results.connectionStatus) {
      console.log('\n📈 Testing Data Query...');
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (1 * 60 * 60 * 1000)); // Last hour
      
      const dataPoints = await influxDBService.queryDataPoints(startTime, endTime);
      console.log(`Query returned ${dataPoints.length} data points`);
      
      if (dataPoints.length > 0) {
        const latest = dataPoints[dataPoints.length - 1];
        console.log('Latest data point:', {
          timestamp: latest.timestamp,
          saltInstant: latest.saltInstant,
          waterTemp: latest.waterTemp,
          cellVoltage: latest.cellVoltage,
          pumpStatus: latest.pumpStatus
        });
      }
    }

    console.log('\n✅ Test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testInfluxDBVercel(); 