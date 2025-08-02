const axios = require('axios');

// Create axios client with session support
const client = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // Important for session cookies
  timeout: 30000
});

class HaywardClient {
  constructor() {
    this.authenticated = false;
  }

  async login(username, password) {
    try {
      console.log('🔐 Logging in to Hayward Omnilogic...');
      
      const response = await client.post('/api/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        this.authenticated = true;
        console.log('✅ Authentication successful!');
        return true;
      } else {
        console.error('❌ Authentication failed:', response.data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error.response?.data?.error || error.message);
      return false;
    }
  }

  async logout() {
    try {
      await client.post('/api/auth/logout');
      this.authenticated = false;
      console.log('👋 Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error.message);
    }
  }

  async checkStatus() {
    try {
      const response = await client.get('/api/auth/status');
      this.authenticated = response.data.authenticated;
      return this.authenticated;
    } catch (error) {
      console.error('❌ Status check error:', error.message);
      return false;
    }
  }

  async extractPageData(page) {
    if (!this.authenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      console.log(`📄 Extracting data from page: ${page}`);
      
      const response = await client.get(`/api/extract/${page}`);
      return response.data;
    } catch (error) {
      console.error('❌ Data extraction error:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  async extractCustomData(page, selectors) {
    if (!this.authenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      console.log(`🎯 Extracting custom data from page: ${page}`);
      console.log('Selectors:', selectors);
      
      const response = await client.post('/api/extract-custom', {
        page,
        selectors
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Custom extraction error:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  async proxyRequest(path, method = 'GET', data = null) {
    if (!this.authenticated) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      console.log(`🔗 Proxying ${method} request to: ${path}`);
      
      const response = await client({
        method,
        url: `/api/proxy/${path}`,
        data
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Proxy request error:', error.response?.data?.error || error.message);
      throw error;
    }
  }

  async getHealthStatus() {
    try {
      const response = await client.get('/health');
      return response.data;
    } catch (error) {
      console.error('❌ Health check error:', error.message);
      throw error;
    }
  }
}

// Example usage
async function demonstrateUsage() {
  const hayward = new HaywardClient();

  try {
    // Check server health
    console.log('\n🏥 Checking server health...');
    const health = await hayward.getHealthStatus();
    console.log('Server status:', health);

    // Login (replace with actual credentials)
    const username = process.env.HAYWARD_USERNAME || 'your-username';
    const password = process.env.HAYWARD_PASSWORD || 'your-password';
    
    if (username === 'your-username' || password === 'your-password') {
      console.log('\n⚠️  Please set HAYWARD_USERNAME and HAYWARD_PASSWORD environment variables');
      console.log('Example: HAYWARD_USERNAME=user HAYWARD_PASSWORD=pass node example-client.js');
      return;
    }

    const loginSuccess = await hayward.login(username, password);
    if (!loginSuccess) {
      console.log('❌ Could not authenticate. Exiting...');
      return;
    }

    // Check authentication status
    console.log('\n🔍 Checking authentication status...');
    const isAuthenticated = await hayward.checkStatus();
    console.log('Authenticated:', isAuthenticated);

    // Extract general page data
    console.log('\n📊 Extracting general data from main page...');
    try {
      const pageData = await hayward.extractPageData('');
      console.log('Page title:', pageData.title);
      console.log('Number of forms found:', pageData.forms.length);
      console.log('Number of headings found:', pageData.headings.length);
      console.log('Number of links found:', pageData.links.length);
      
      // Show first few headings
      if (pageData.headings.length > 0) {
        console.log('\nFirst few headings:');
        pageData.headings.slice(0, 3).forEach((heading, index) => {
          console.log(`  ${index + 1}. ${heading.level}: ${heading.text}`);
        });
      }

      // Show form information
      if (pageData.forms.length > 0) {
        console.log('\nForms found:');
        pageData.forms.forEach((form, index) => {
          console.log(`  Form ${index + 1}: ${form.id || 'no-id'} (${form.method}) -> ${form.action || 'no-action'}`);
          console.log(`    Fields: ${form.fields.length}`);
        });
      }
    } catch (error) {
      console.log('Could not extract general page data:', error.message);
    }

    // Example custom data extraction
    console.log('\n🎯 Attempting custom data extraction...');
    try {
      const customSelectors = {
        // Common selectors that might exist on pool/spa control systems
        title: 'title',
        mainHeading: 'h1',
        navigationItems: 'nav a, .nav a, .navigation a',
        statusIndicators: '.status, .indicator, .state',
        temperatureReadings: '[class*="temp"], [class*="temperature"]',
        buttons: 'button, input[type="button"], input[type="submit"]',
        errorMessages: '.error, .alert, .message',
        userInfo: '.user, .account, .profile'
      };

      const customData = await hayward.extractCustomData('', customSelectors);
      
      Object.entries(customData).forEach(([key, value]) => {
        if (value === null) {
          console.log(`  ${key}: Not found`);
        } else if (Array.isArray(value)) {
          console.log(`  ${key}: Found ${value.length} elements`);
          if (value.length > 0 && value.length <= 3) {
            value.forEach((item, index) => {
              console.log(`    ${index + 1}: ${item.text.substring(0, 50)}${item.text.length > 50 ? '...' : ''}`);
            });
          }
        } else if (value.error) {
          console.log(`  ${key}: Error - ${value.error}`);
        } else {
          console.log(`  ${key}: ${value.text.substring(0, 100)}${value.text.length > 100 ? '...' : ''}`);
        }
      });
    } catch (error) {
      console.log('Could not extract custom data:', error.message);
    }

    // Example proxy request
    console.log('\n🔗 Testing proxy functionality...');
    try {
      // Try to get a raw page through the proxy
      const rawResponse = await hayward.proxyRequest('');
      console.log('Proxy response received, size:', rawResponse.length, 'characters');
      
      // Look for some indicators that we got a real page
      const htmlSnippet = rawResponse.substring(0, 200);
      console.log('HTML snippet:', htmlSnippet);
      
      if (rawResponse.includes('<html') || rawResponse.includes('<!DOCTYPE')) {
        console.log('✅ Proxy appears to be working - received HTML content');
      } else {
        console.log('⚠️  Proxy response may not be HTML content');
      }
    } catch (error) {
      console.log('Could not test proxy:', error.message);
    }

    // Logout
    console.log('\n👋 Logging out...');
    await hayward.logout();

  } catch (error) {
    console.error('❌ Demonstration failed:', error.message);
  }
}

// Advanced example: monitoring specific data
async function monitorPoolData() {
  const hayward = new HaywardClient();
  
  // Login
  const username = process.env.HAYWARD_USERNAME;
  const password = process.env.HAYWARD_PASSWORD;
  
  if (!username || !password) {
    console.log('Please set HAYWARD_USERNAME and HAYWARD_PASSWORD environment variables');
    return;
  }

  const loginSuccess = await hayward.login(username, password);
  if (!loginSuccess) return;

  try {
    // Define selectors for pool data you want to monitor
    const poolSelectors = {
      poolTemp: '.pool-temperature, [class*="pool"][class*="temp"], #poolTemp',
      spaTemp: '.spa-temperature, [class*="spa"][class*="temp"], #spaTemp',
      pumpStatus: '.pump-status, [class*="pump"][class*="status"], #pumpStatus',
      heaterStatus: '.heater-status, [class*="heater"][class*="status"], #heaterStatus',
      filterStatus: '.filter-status, [class*="filter"][class*="status"], #filterStatus',
      chlorinatorLevel: '.chlorinator, [class*="chlor"], #chlorinator',
      waterLevel: '.water-level, [class*="water"][class*="level"], #waterLevel'
    };

    console.log('🏊 Monitoring pool data...');
    
    // Extract the data
    const poolData = await hayward.extractCustomData('', poolSelectors);
    
    // Process and display the results
    console.log('\n📊 Pool Status Report:');
    console.log('========================');
    
    Object.entries(poolData).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      if (value === null) {
        console.log(`${label}: Data not available`);
      } else if (value.error) {
        console.log(`${label}: Error - ${value.error}`);
      } else if (Array.isArray(value) && value.length > 0) {
        console.log(`${label}: ${value[0].text}`);
      } else if (value.text) {
        console.log(`${label}: ${value.text}`);
      }
    });

  } catch (error) {
    console.error('Error monitoring pool data:', error.message);
  } finally {
    await hayward.logout();
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'demo':
      demonstrateUsage();
      break;
    case 'monitor':
      monitorPoolData();
      break;
    default:
      console.log('Hayward Omnilogic Proxy Client');
      console.log('=============================');
      console.log('');
      console.log('Usage:');
      console.log('  node example-client.js demo     - Run demonstration');
      console.log('  node example-client.js monitor  - Monitor pool data');
      console.log('');
      console.log('Environment variables:');
      console.log('  HAYWARD_USERNAME - Your Hayward Omnilogic username');
      console.log('  HAYWARD_PASSWORD - Your Hayward Omnilogic password');
      console.log('');
      console.log('Example:');
      console.log('  HAYWARD_USERNAME=user HAYWARD_PASSWORD=pass node example-client.js demo');
      break;
  }
}

module.exports = HaywardClient;