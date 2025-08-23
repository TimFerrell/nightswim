const { POOL_CONSTANTS } = require('../utils/constants');
const { buildDashboardUrl, buildSystemUrl } = require('../utils/constants');
const { parseDashboardData, parseFilterData, parseHeaterData, parseChlorinatorData, parseLightsData, parseSchedulesData, createPoolDataStructure } = require('./poolDataParser');
// const HaywardSession = require('./HaywardSession');
const weatherService = require('./weatherService');

// New architecture imports
const { timeSeriesService, influxDBClient } = require('../domains/monitoring');
// Keep legacy influx service for backward compatibility during migration
const { influxDBService } = require('./influxDBService');
const pumpStateTracker = require('./pumpStateTracker');

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_TTL = 15 * 1000; // 15 seconds cache (reduced from 30)

// In-memory storage for most recent pool data (always available)
let mostRecentPoolData = null;

/**
 * Get cached data or null if expired
 */
const getCachedData = (key) => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

/**
 * Set cached data with timestamp
 */
const setCachedData = (key, data) => {
  apiCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Clear expired cache entries
 */
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of apiCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      apiCache.delete(key);
    }
  }
};

/**
 * Get the most recent pool data (always available)
 * @returns {object|null} Most recent pool data or null if none available
 */
const getMostRecentPoolData = () => {
  return mostRecentPoolData;
};

/**
 * Set the most recent pool data
 * @param {object} data - Pool data to store
 */
const setMostRecentPoolData = (data) => {
  mostRecentPoolData = data;
};

// Clean up cache every minute
setInterval(cleanupCache, 60 * 1000);

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
   * Fetch all pool data with parallel requests and caching
   * @param {import('./HaywardSession')} session - The authenticated session
   * @returns {Promise<PoolData>} Complete pool data
   */
  async fetchAllPoolData(session) {
    const poolData = createPoolDataStructure({});
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `pool_data_${session.sessionId}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('📦 Returning cached pool data');
      return cachedData;
    }

    console.log('🚀 Fetching fresh pool data with parallel requests...');

    // Prepare all API requests in parallel
    const requests = [
      // Dashboard data
      session.makeRequest(buildDashboardUrl()).then(response => ({
        type: 'dashboard',
        data: parseDashboardData(response.data)
      })).catch(error => ({
        type: 'dashboard',
        error: error.message
      })),

      // Filter Pump data
      session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.FILTER_SETTINGS)).then(response => ({
        type: 'filter',
        data: parseFilterData(response.data)
      })).catch(error => ({
        type: 'filter',
        error: error.message
      })),

      // Heater data
      session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.HEATER_SETTINGS)).then(response => ({
        type: 'heater',
        data: parseHeaterData(response.data)
      })).catch(error => ({
        type: 'heater',
        error: error.message
      })),

      // Chlorinator data
      session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.CHLORINATOR_SETTINGS)).then(response => ({
        type: 'chlorinator',
        data: parseChlorinatorData(response.data)
      })).catch(error => ({
        type: 'chlorinator',
        error: error.message
      })),

      // Light data
      session.makeRequest(buildSystemUrl(POOL_CONSTANTS.ENDPOINTS.LIGHTS_SETTINGS)).then(response => ({
        type: 'lights',
        data: parseLightsData(response.data)
      })).catch(error => ({
        type: 'lights',
        error: error.message
      })),

      // Schedules
      session.makeRequest(`${POOL_CONSTANTS.ENDPOINTS.SCHEDULES}?mspID=${POOL_CONSTANTS.MSP_ID}&bowID=${POOL_CONSTANTS.BOW_ID}`).then(response => ({
        type: 'schedules',
        data: parseSchedulesData(response.data)
      })).catch(error => ({
        type: 'schedules',
        error: error.message
      })),

      // Weather data (non-blocking)
      weatherService.getCurrentWeather().then(data => ({
        type: 'weather',
        data
      })).catch(error => ({
        type: 'weather',
        error: error.message
      }))
    ];

    // Execute all requests in parallel
    const results = await Promise.allSettled(requests);

    // Process results
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { type, data, error } = result.value;
        if (error) {
          console.error(`${type} fetch error:`, error);
          poolData[type] = { error };
        } else {
          poolData[type] = data;
        }
      } else {
        console.error('Request failed:', result.reason);
      }
    });

    // Store time series data for charts
    const timeSeriesPoint = {
      timestamp: poolData.timestamp,
      saltInstant: poolData.chlorinator?.salt?.instant || null,
      cellTemp: poolData.chlorinator?.cell?.temperature?.value || null,
      cellVoltage: poolData.chlorinator?.cell?.voltage || null,
      waterTemp: poolData.dashboard?.temperature?.actual || null,
      airTemp: poolData.dashboard?.airTemperature || null,
      pumpStatus: poolData.filter?.status || null,
      weatherTemp: poolData.weather?.temperature || null,
      weatherHumidity: poolData.weather?.humidity || null
    };

    console.log('💾 Time series point to store:', timeSeriesPoint);

    // Store in InfluxDB using new architecture (primary storage)
    const newInfluxResult = await influxDBClient.storeDataPoint(timeSeriesPoint);
    console.log('💾 New InfluxDB storage result:', newInfluxResult);
    
    // Fallback to legacy InfluxDB service for compatibility
    let legacyInfluxResult = null;
    if (!newInfluxResult) {
      legacyInfluxResult = await influxDBService.storeDataPoint(timeSeriesPoint);
      console.log('💾 Legacy InfluxDB storage result:', legacyInfluxResult);
    }

    // Store in memory using new architecture
    await timeSeriesService.addDataPoint(timeSeriesPoint);

    // Check for pump state changes and generate annotations
    if (poolData.filter && poolData.filter.status !== null && poolData.filter.status !== undefined) {
      await pumpStateTracker.checkStateChange(poolData.filter.status, poolData.timestamp);
    }

    // Cache the result
    setCachedData(cacheKey, poolData);

    // Store the most recent data for immediate access
    setMostRecentPoolData(poolData);

    const endTime = Date.now();
    console.log(`✅ Pool data fetched in ${endTime - startTime}ms`);

    return poolData;
  }
};

// Export both the service and cache functions
module.exports = {
  ...poolDataService,
  getCachedData,
  setCachedData,
  cleanupCache,
  getMostRecentPoolData,
  setMostRecentPoolData
};
