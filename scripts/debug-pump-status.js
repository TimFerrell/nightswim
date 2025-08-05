// Load environment variables
require('dotenv').config();

const sessionManager = require('../src/services/sessionManager');
const poolDataService = require('../src/services/poolDataService');
const timeSeriesService = require('../src/services/timeSeriesService');
const credentials = require('../src/utils/credentials');

async function debugPumpStatus() {
  console.log('🔍 Debugging Filter Pump Status Detection...\n');

  try {
    // Create a session
    const sessionId = 'debug-pump-status';
    const session = sessionManager.getSession(sessionId);

    // Authenticate
    console.log('🔐 Authenticating...');
    const authResult = await session.authenticate(credentials.username, credentials.password);
    
    if (!authResult.success) {
      console.error('❌ Authentication failed:', authResult.message);
      return;
    }
    
    console.log('✅ Authentication successful\n');

    // Fetch pool data
    console.log('📊 Fetching pool data...');
    const poolData = await poolDataService.fetchAllPoolData(session);
    
    console.log('\n🏊‍♂️ Filter Pump Status Debug Results:');
    console.log('=====================================');
    console.log(`Raw filter data:`, JSON.stringify(poolData.filter, null, 2));
    console.log(`\nPump status: ${poolData.filter?.status}`);
    console.log(`Pump diagnostic: ${poolData.filter?.diagnostic}`);
    
    // Check time series data
    console.log('\n📈 Time Series Data:');
    console.log('===================');
    const recentData = timeSeriesService.getDataPoints(1); // Last hour
    console.log(`Recent data points: ${recentData.length}`);
    
    if (recentData.length > 0) {
      const latestPoint = recentData[recentData.length - 1];
      console.log(`Latest pump status in time series: ${latestPoint.pumpStatus}`);
      console.log(`Latest timestamp: ${latestPoint.timestamp}`);
      
      // Show last 5 data points
      console.log('\nLast 5 data points:');
      recentData.slice(-5).forEach((point, index) => {
        console.log(`${index + 1}. ${point.timestamp} - Pump: ${point.pumpStatus}`);
      });
    }
    
    // Check pump state tracker
    const pumpTracker = require('../src/services/pumpStateTracker');
    const currentState = pumpTracker.getCurrentState();
    console.log('\n🔧 Pump State Tracker:');
    console.log('=====================');
    console.log(`Current tracked state: ${currentState.isOn ? 'ON' : 'OFF'}`);
    console.log(`Last change time: ${currentState.lastChangeTime}`);
    console.log(`Last change type: ${currentState.lastChangeType}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugPumpStatus(); 