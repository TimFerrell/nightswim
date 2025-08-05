// Load environment variables
require('dotenv').config();

const sessionManager = require('../src/services/sessionManager');
const credentials = require('../src/utils/credentials');
const { buildSystemUrl } = require('../src/utils/constants');
const { POOL_CONSTANTS } = require('../src/utils/constants');

async function debugHaywardHTML() {
  console.log('🔍 Debugging Hayward HTML Content...\n');

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

    // Fetch the filter settings page HTML
    console.log('📄 Fetching filter settings page HTML...');
    const response = await session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.FILTER_SETTINGS));
    
    console.log('\n🏊‍♂️ Filter Settings Page HTML Analysis:');
    console.log('=====================================');
    
    // Look for the specific element
    const html = response.data;
    
    // Check for the main filter status element
    const mainStatusMatch = html.match(/id="cphMainContent_divfilterStatus"[^>]*>([^<]*)</);
    if (mainStatusMatch) {
      console.log(`✅ Found #cphMainContent_divfilterStatus: "${mainStatusMatch[1].trim()}"`);
    } else {
      console.log('❌ #cphMainContent_divfilterStatus not found');
    }
    
    // Check for other potential filter status elements
    const statusSelectors = [
      'cphMainContent_3_divStatusName',
      'divfilterStatus',
      'filterStatus',
      'pumpStatus',
      'divPump',
      'lblFilter',
      'lblPump'
    ];
    
    console.log('\n🔍 Checking other potential status elements:');
    statusSelectors.forEach(selector => {
      const regex = new RegExp(`id="[^"]*${selector}[^"]*"[^>]*>([^<]*)<`, 'g');
      const matches = html.match(regex);
      if (matches) {
        matches.forEach(match => {
          const contentMatch = match.match(/>([^<]*)</);
          if (contentMatch) {
            console.log(`✅ Found ${selector}: "${contentMatch[1].trim()}"`);
          }
        });
      }
    });
    
    // Look for any div elements that might contain pump/filter status
    console.log('\n🔍 Looking for pump/filter related content:');
    const pumpFilterMatches = html.match(/<div[^>]*>([^<]*pump[^<]*|[^<]*filter[^<]*|[^<]*on[^<]*|[^<]*off[^<]*)/gi);
    if (pumpFilterMatches) {
      pumpFilterMatches.slice(0, 10).forEach(match => {
        const contentMatch = match.match(/>([^<]*)</);
        if (contentMatch && contentMatch[1].trim()) {
          console.log(`📝 Potential status: "${contentMatch[1].trim()}"`);
        }
      });
    }
    
    // Save HTML to file for manual inspection
    const fs = require('fs');
    const filename = `debug-filter-page-${Date.now()}.html`;
    fs.writeFileSync(filename, html);
    console.log(`\n💾 Full HTML saved to: ${filename}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugHaywardHTML(); 