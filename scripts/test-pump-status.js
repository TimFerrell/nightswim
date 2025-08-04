const sessionManager = require('../src/services/sessionManager');
const poolDataService = require('../src/services/poolDataService');
const credentials = require('../src/utils/credentials');

async function testPumpStatus() {
  console.log('🔍 Testing Filter Pump Status Detection...\n');

  try {
    // Create a session
    const sessionId = 'test-pump-status';
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
    
    console.log('\n🏊‍♂️ Filter Pump Status Results:');
    console.log('================================');
    console.log(`Raw filter data:`, JSON.stringify(poolData.filter, null, 2));
    console.log(`\nPump status: ${poolData.filter?.status}`);
    console.log(`Pump diagnostic: ${poolData.filter?.diagnostic}`);
    
    if (poolData.filter?.status === null) {
      console.log('\n❌ Pump status is null - this indicates the selectors are not finding the status');
      console.log('🔍 Check the Hayward page HTML for filter/pump status elements');
    } else if (poolData.filter?.status === true) {
      console.log('\n✅ Pump is detected as ON');
    } else if (poolData.filter?.status === false) {
      console.log('\n❌ Pump is detected as OFF');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPumpStatus(); 