/**
 * Pool Data Collector Service
 * Orchestrates data collection from various pool endpoints
 */

const { PoolSession } = require('./pool-session');
const { PoolDataParser } = require('../parsers');
const { PoolData } = require('../entities/pool-data');
const { buildSystemUrl, buildDashboardUrl } = require('../../../config');

class PoolDataCollector {
  constructor(credentials) {
    this.session = new PoolSession(credentials);
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Collect all pool data
   */
  async collectAllData() {
    try {
      console.log('🏊‍♂️ Starting pool data collection...');

      // Authenticate if needed
      if (!this.session.isSessionValid()) {
        console.log('🔐 Session invalid, authenticating...');
        const authenticated = await this.session.authenticate();
        if (!authenticated) {
          throw new Error('Failed to authenticate with pool system');
        }
      }

      // Collect data from various endpoints
      const [dashboardData, filterData, heaterData, chlorinatorData, lightsData, scheduleData] =
        await Promise.allSettled([
          this.collectDashboardData(),
          this.collectFilterData(),
          this.collectHeaterData(),
          this.collectChlorinatorData(),
          this.collectLightsData(),
          this.collectScheduleData()
        ]);

      // Combine all data
      const combinedData = {
        dashboard: this.getSettledValue(dashboardData),
        filter: this.getSettledValue(filterData),
        heater: this.getSettledValue(heaterData),
        chlorinator: this.getSettledValue(chlorinatorData),
        lights: this.getSettledValue(lightsData),
        schedules: this.getSettledValue(scheduleData) || []
      };

      const poolData = new PoolData(combinedData);
      console.log('✅ Pool data collection completed successfully');

      return poolData;
    } catch (error) {
      console.error('❌ Pool data collection failed:', error.message);
      throw error;
    } finally {
      // Cleanup session resources
      this.cleanup();
    }
  }

  /**
   * Collect dashboard data
   */
  async collectDashboardData() {
    const url = buildDashboardUrl();
    const html = await this.fetchWithRetry(url, 'dashboard');
    return PoolDataParser.parseAll(html).dashboard;
  }

  /**
   * Collect filter/pump data
   */
  async collectFilterData() {
    const url = buildSystemUrl('aspx/control/filter.aspx');
    const html = await this.fetchWithRetry(url, 'filter');
    return PoolDataParser.parseAll(html).filter;
  }

  /**
   * Collect heater data
   */
  async collectHeaterData() {
    const url = buildSystemUrl('aspx/control/heater.aspx');
    const html = await this.fetchWithRetry(url, 'heater');
    return PoolDataParser.parseAll(html).heater;
  }

  /**
   * Collect chlorinator data
   */
  async collectChlorinatorData() {
    const url = buildSystemUrl('aspx/control/chlorinator.aspx');
    const html = await this.fetchWithRetry(url, 'chlorinator');
    return PoolDataParser.parseAll(html).chlorinator;
  }

  /**
   * Collect lights data
   */
  async collectLightsData() {
    const url = buildSystemUrl('aspx/control/lights.aspx');
    const html = await this.fetchWithRetry(url, 'lights');
    return PoolDataParser.parseAll(html).lights;
  }

  /**
   * Collect schedule data
   */
  async collectScheduleData() {
    const url = buildSystemUrl('aspx/schedule/schedule.aspx');
    const html = await this.fetchWithRetry(url, 'schedules');
    return PoolDataParser.parseAll(html).schedules;
  }

  /**
   * Fetch data with retry logic
   */
  async fetchWithRetry(url, dataType) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`📡 Fetching ${dataType} data (attempt ${attempt}/${this.retryAttempts})`);

        const response = await this.session.makeRequest(url);
        if (response.data) {
          console.log(`✅ ${dataType} data fetched successfully`);
          return response.data;
        }
        throw new Error(`No data received for ${dataType}`);

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt} failed for ${dataType}:`, error.message);

        if (attempt < this.retryAttempts) {
          console.log(`🔄 Retrying in ${this.retryDelay}ms...`);
          await this.sleep(this.retryDelay);
          this.retryDelay *= 2; // Exponential backoff
        }
      }
    }

    console.error(`❌ All ${this.retryAttempts} attempts failed for ${dataType}`);
    throw lastError;
  }

  /**
   * Get value from settled promise
   */
  getSettledValue(settledPromise) {
    if (settledPromise.status === 'fulfilled') {
      return settledPromise.value;
    }
    console.warn('⚠️ Data collection partially failed:', settledPromise.reason?.message);
    return null;

  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.session) {
      this.session.cleanup();
    }
  }
}

module.exports = { PoolDataCollector };
