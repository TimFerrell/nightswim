/**
 * Pool Session Service
 * Handles authentication and session management with Hayward system
 */

const axios = require('axios');
const FormData = require('form-data');
const { CookieJar } = require('tough-cookie');
const { POOL_SYSTEM } = require('../../../config');

class PoolSession {
  constructor(credentials = {}) {
    this.credentials = credentials;
    this.sessionId = null;
    this.cookieJar = new CookieJar();
    this.isAuthenticated = false;
    this.lastActivity = null;
  }

  /**
   * Authenticate with the Hayward system
   */
  async authenticate() {
    try {
      console.log('🔐 Starting authentication with Hayward system...');
      
      if (!this.credentials.username || !this.credentials.password) {
        throw new Error('Username and password are required');
      }

      const loginUrl = `${POOL_SYSTEM.BASE_URL}${POOL_SYSTEM.ENDPOINTS.LOGIN}`;
      const formData = new FormData();
      formData.append('txtUsername', this.credentials.username);
      formData.append('txtPassword', this.credentials.password);

      const response = await axios.post(loginUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'User-Agent': 'Mozilla/5.0 (compatible; Pool Monitor)'
        },
        timeout: POOL_SYSTEM.DEFAULTS.TIMEOUT,
        maxRedirects: 5,
        validateStatus: () => true // Don't throw on non-2xx status
      });

      // Check for successful authentication
      if (this.isAuthenticationSuccessful(response)) {
        this.isAuthenticated = true;
        this.lastActivity = new Date();
        this.sessionId = this.extractSessionId(response);
        
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.log('❌ Authentication failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Make authenticated request to Hayward system
   */
  async makeRequest(url, options = {}) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Please authenticate first.');
    }

    try {
      const response = await axios({
        url,
        method: 'GET',
        timeout: POOL_SYSTEM.DEFAULTS.TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Pool Monitor)',
          'Cookie': await this.getCookieHeader(url),
          ...options.headers
        },
        ...options
      });

      this.lastActivity = new Date();
      return response;
    } catch (error) {
      console.error(`❌ Request failed for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Check if session is still valid
   */
  isSessionValid() {
    if (!this.isAuthenticated || !this.lastActivity) {
      return false;
    }

    // Check if session has been inactive for too long (30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return this.lastActivity > thirtyMinutesAgo;
  }

  /**
   * Cleanup session
   */
  cleanup() {
    this.isAuthenticated = false;
    this.sessionId = null;
    this.lastActivity = null;
    this.cookieJar = new CookieJar();
  }

  // Private helper methods
  isAuthenticationSuccessful(response) {
    // Check for redirect to dashboard or successful status
    return response.status === 200 || 
           (response.status >= 300 && response.status < 400 &&
            response.headers.location?.includes('Dashboard'));
  }

  extractSessionId(response) {
    // Extract session ID from response if available
    const setCookies = response.headers['set-cookie'] || [];
    for (const cookie of setCookies) {
      const match = cookie.match(/ASP\.NET_SessionId=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
    return `session_${Date.now()}`;
  }

  async getCookieHeader(url) {
    try {
      const cookies = await this.cookieJar.getCookieString(url);
      return cookies;
    } catch (error) {
      console.warn('Warning: Could not get cookies:', error.message);
      return '';
    }
  }
}

module.exports = { PoolSession };