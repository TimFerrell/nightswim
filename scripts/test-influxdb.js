#!/usr/bin/env node

const influxDBService = require('../src/services/influxDBService');

async function testInfluxDB() {
  console.log('🔍 Testing InfluxDB Connection...');
  
  // Check if environment variables are set
  const requiredVars = ['INFLUXDB_URL', 'INFLUX_DB_TOKEN', 'INFLUXDB_ORG'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing InfluxDB environment variables:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('');
    console.log('Please configure these in your Vercel dashboard:');
    console.log('   Settings → Environment Variables');
    return;
  }
  
  console.log('✅ Environment variables configured');
  
  // Run comprehensive test
  try {
    const results = await influxDBService.testConnection();
    console.log('');
    console.log('📊 Test Summary:');
    console.log(`   Config Check: ${results.configCheck.url && results.configCheck.token && results.configCheck.org ? '✅' : '❌'}`);
    console.log(`   Connection Status: ${results.connectionStatus ? '✅' : '❌'}`);
    console.log(`   Write Test: ${results.writeTest ? '✅' : '❌'}`);
    
    if (results.writeError) {
      console.log(`   Write Error: ${results.writeError}`);
    }
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testInfluxDB().catch(console.error); 