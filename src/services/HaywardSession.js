const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');
const { CookieJar } = require('tough-cookie');
const { POOL_CONSTANTS } = require('../utils/constants');

/**
 * @typedef {object} AuthenticationResult
 * @property {boolean} success - Whether authentication was successful
 * @property {string} message - Authentication result message
 */

/**
 * @typedef {object} RequestOptions
 * @property {string} [method] - HTTP method (default: 'GET')
 * @property {*} [data] - Request data
 * @property {object} [headers] - Request headers
 */

/**
 * HaywardSession manages authentication and HTTP requests to Hayward OmniLogic
 */
class HaywardSession {
  /**
   * @param {string} userId - Unique identifier for the user session
   */
  constructor(userId) {
    /** @type {string} */
    this.userId = userId;

    /** @type {CookieJar} */
    this.cookieJar = new CookieJar();

    /** @type {boolean} */
    this.authenticated = false;

    /** @type {number} */
    this.lastActivity = Date.now();

    /** @type {import('axios').AxiosInstance} */
    this.axiosInstance = axios.create({
      baseURL: POOL_CONSTANTS.HAYWARD_BASE_URL,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    // Axios interceptors to handle cookies
    this.setupCookieHandling();
  }

  /**
   * Sets up axios interceptors for cookie handling
   * @private
   */
  setupCookieHandling() {
    // Request interceptor to add cookies
    this.axiosInstance.interceptors.request.use(async (config) => {
      const cookies = await this.cookieJar.getCookieString(config.baseURL + config.url);
      if (cookies) {
        config.headers.Cookie = cookies;
      }
      return config;
    });

    // Response interceptor to store cookies
    this.axiosInstance.interceptors.response.use(async (response) => {
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        for (const cookie of setCookieHeaders) {
          await this.cookieJar.setCookie(cookie, response.config.baseURL + response.config.url);
        }
      }
      this.lastActivity = Date.now();
      return response;
    });
  }

  /**
   * Authenticates with Hayward OmniLogic using provided credentials
   * @param {string} username - Hayward OmniLogic username/email
   * @param {string} password - Hayward OmniLogic password
   * @returns {Promise<AuthenticationResult>} Authentication result
   */
  async authenticate(username, password) {
    try {
      // First, get the login page to extract form data and viewstate
      const loginPageResponse = await this.axiosInstance.get(POOL_CONSTANTS.ENDPOINTS.LOGIN);
      const $ = cheerio.load(loginPageResponse.data);

      // Extract ASP.NET WebForms viewstate and other hidden fields
      const viewState = $('input[name="__VIEWSTATE"]').val();
      const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val();
      const eventValidation = $('input[name="__EVENTVALIDATION"]').val();

      // Find login form fields (Hayward OmniLogic specific patterns)
      const usernameField = $('input[name="txtLoginName"]').attr('name');
      const passwordField = $('input[name="txtPassword"]').attr('name');
      const loginButton = $('input[name="btnLogin"]');

      if (!usernameField || !passwordField) {
        throw new Error('Could not find login form fields');
      }

      // Prepare form data
      const formData = new FormData();
      if (viewState) formData.append('__VIEWSTATE', viewState);
      if (viewStateGenerator) formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
      if (eventValidation) formData.append('__EVENTVALIDATION', eventValidation);

      formData.append(usernameField, username);
      formData.append(passwordField, password);

      // Add button click event if needed
      if (loginButton.attr('name')) {
        formData.append(loginButton.attr('name'), loginButton.val() || 'Login');
      }

      // Submit login form
      const loginResponse = await this.axiosInstance.post('/Login.aspx', formData, {
        headers: {
          ...formData.getHeaders(),
          'Referer': `${POOL_CONSTANTS.HAYWARD_BASE_URL}/Login.aspx`
        }
      });

      // Check if authentication was successful
      const loginResult = cheerio.load(loginResponse.data);
      const hasError = loginResult('.error, .alert-danger, .validation-error').length > 0;
      const hasLoginForm = loginResult('input[type="password"]').length > 0;

      if (!hasError && !hasLoginForm) {
        this.authenticated = true;
        return { success: true, message: 'Authentication successful' };
      }
      return { success: false, message: 'Invalid credentials' };

    } catch (error) {
      console.error('Authentication error:', error.message);
      return { success: false, message: `Authentication failed: ${error.message}` };
    }
  }

  /**
   * Makes an authenticated request to Hayward OmniLogic
   * @param {string} path - Request path
   * @param {RequestOptions} [options] - Request options
   * @returns {Promise<import('axios').AxiosResponse>} Response from Hayward OmniLogic
   * @throws {Error} If not authenticated
   */
  async makeRequest(path, options = {}) {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }

    const startTime = Date.now();
    console.log(`🌐 Making request to: ${path}`);

    try {
      // Add timeout to prevent hanging requests
      const timeout = 10000; // 10 seconds timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await this.axiosInstance({
        url: path,
        method: options.method || 'GET',
        data: options.data,
        headers: options.headers,
        signal: controller.signal,
        timeout
      });

      clearTimeout(timeoutId);
      const requestTime = Date.now() - startTime;
      console.log(`✅ Request completed in ${requestTime}ms: ${path}`);

      return response;
    } catch (error) {
      const requestTime = Date.now() - startTime;
      if (error.name === 'AbortError') {
        console.error(`⏰ Request timed out after ${requestTime}ms: ${path}`);
        throw new Error(`Request timed out after ${timeout}ms`);
      } else {
        console.error(`❌ Request failed after ${requestTime}ms: ${path}`, error.message);
        throw error;
      }
    }
  }

  /**
   * Checks if the session has expired
   * @returns {boolean} True if session has expired
   */
  isExpired() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    return Date.now() - this.lastActivity > maxAge;
  }
}

module.exports = HaywardSession;
