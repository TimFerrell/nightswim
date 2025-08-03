const {
  parseDashboardData,
  parseFilterData,
  parseHeaterData,
  parseChlorinatorData,
  parseLightsData,
  parseSchedulesData,
  createPoolDataStructure
} = require('./poolDataParser');
const { POOL_CONSTANTS, buildSystemUrl, buildDashboardUrl } = require('../utils/constants');
const timeSeriesService = require('./timeSeriesService');
const influxDBService = require('./influxDBService');

/**
 * @typedef {object} PoolData
 * @property {string} timestamp - ISO timestamp of when data was fetched
 * @property {object} system - System identification information
 * @property {object} dashboard - Dashboard temperature and status data
 * @property {object} filter - Filter pump status and diagnostic data
 * @property {object} heater - Heater temperature and status data
 * @property {object} chlorinator - Chlorinator salt and cell data
 * @property {object} lights - Lights status and brightness data
 * @property {Array} schedules - Array of schedule information
 */

const poolDataService = {
  /**
   * Fetch all pool data
   * @param {import('./HaywardSession')} session - The authenticated session
   * @returns {Promise<PoolData>} Complete pool data
   */
  async fetchAllPoolData(session) {
    const poolData = createPoolDataStructure({});

    // Fetch Dashboard data
    try {
      const dashboardResponse = await session.makeRequest(buildDashboardUrl());
      poolData.dashboard = parseDashboardData(dashboardResponse.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error.message);
      poolData.dashboard.error = error.message;
    }

    // Fetch Filter Pump data
    try {
      const filterResponse = await session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.FILTER_SETTINGS));
      poolData.filter = parseFilterData(filterResponse.data);
    } catch (error) {
      console.error('Filter fetch error:', error.message);
      poolData.filter.error = error.message;
    }

    // Fetch Heater data
    try {
      const heaterResponse = await session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.HEATER_SETTINGS));
      poolData.heater = parseHeaterData(heaterResponse.data);
    } catch (error) {
      console.error('Heater fetch error:', error.message);
      poolData.heater.error = error.message;
    }

    // Fetch Chlorinator data
    try {
      const chlorinatorResponse = await session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.CHLORINATOR_SETTINGS));
      poolData.chlorinator = parseChlorinatorData(chlorinatorResponse.data);
    } catch (error) {
      console.error('Chlorinator fetch error:', error.message);
      poolData.chlorinator.error = error.message;
    }

    // Fetch Light data
    try {
      const lightResponse = await session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.LIGHTS_SETTINGS));
      poolData.lights = parseLightsData(lightResponse.data);
    } catch (error) {
      console.error('Light fetch error:', error.message);
      poolData.lights.error = error.message;
    }

    // Fetch Schedules
    try {
      const scheduleResponse = await session.makeRequest(`${POOL_CONSTANTS.ENDPOINTS.SCHEDULES}?mspID=${POOL_CONSTANTS.MSP_ID}&bowID=${POOL_CONSTANTS.BOW_ID}`);
      poolData.schedules = parseSchedulesData(scheduleResponse.data);
    } catch (error) {
      console.error('Schedule fetch error:', error.message);
      poolData.schedules = { error: error.message };
    }

    // Store time series data for charts
    const timeSeriesPoint = {
      timestamp: poolData.timestamp,
      saltInstant: poolData.chlorinator?.salt?.instant || null,
      cellTemp: poolData.chlorinator?.cell?.temperature?.value || null,
      cellVoltage: poolData.chlorinator?.cell?.voltage || null,
      waterTemp: poolData.dashboard?.temperature?.actual || null
    };

    // Store in InfluxDB for persistent storage (primary storage)
    await influxDBService.storeDataPoint(timeSeriesPoint);
    
    // Also store in local memory for immediate chart access
    timeSeriesService.addDataPoint(timeSeriesPoint);

    return poolData;
  }
};

module.exports = poolDataService;
