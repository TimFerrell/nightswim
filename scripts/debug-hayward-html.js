const sessionManager = require('../src/services/sessionManager');
const credentials = require('../src/utils/credentials');
const { POOL_CONSTANTS } = require('../src/utils/constants');

async function debugHaywardHTML() {
  console.log('🔍 Debugging Hayward Filter Page HTML...\n');

  try {
    // Create a session
    const sessionId = 'debug-html';
    const session = sessionManager.getSession(sessionId);

    // Authenticate
    console.log('🔐 Authenticating...');
    const authResult = await session.authenticate(credentials.username, credentials.password);
    
    if (!authResult.success) {
      console.error('❌ Authentication failed:', authResult.message);
      return;
    }
    
    console.log('✅ Authentication successful\n');

    // Fetch the filter page HTML
    console.log('📄 Fetching filter page HTML...');
    const filterResponse = await session.makeRequest(POOL_CONSTANTS.ENDPOINTS.FILTER_SETTINGS);
    
    console.log('\n🔍 Analyzing HTML for pump status elements...');
    console.log('==============================================');
    
    // Look for elements containing pump/filter status keywords
    const html = filterResponse.data;
    const keywords = ['pump', 'filter', 'status', 'on', 'off', 'running', 'stopped', 'active', 'inactive'];
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`[^>]*${keyword}[^<]*`, 'gi');
      const matches = html.match(regex);
      if (matches && matches.length > 0) {
        console.log(`\n📋 Found "${keyword}" in HTML:`);
        matches.slice(0, 5).forEach(match => {
          console.log(`   ${match.trim()}`);
        });
        if (matches.length > 5) {
          console.log(`   ... and ${matches.length - 5} more matches`);
        }
      }
    });
    
    // Look for specific ID patterns
    console.log('\n🔍 Looking for ID patterns...');
    const idPatterns = [
      /id="[^"]*pump[^"]*"/gi,
      /id="[^"]*filter[^"]*"/gi,
      /id="[^"]*status[^"]*"/gi,
      /id="[^"]*div[^"]*"/gi
    ];
    
    idPatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`\n📋 Found ID pattern ${pattern}:`);
        matches.slice(0, 10).forEach(match => {
          console.log(`   ${match}`);
        });
        if (matches.length > 10) {
          console.log(`   ... and ${matches.length - 10} more matches`);
        }
      }
    });
    
    // Save HTML to file for manual inspection
    const fs = require('fs');
    fs.writeFileSync('debug-filter-page.html', html);
    console.log('\n💾 Saved full HTML to debug-filter-page.html for manual inspection');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugHaywardHTML(); 