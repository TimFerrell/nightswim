/**
 * Legacy Compatibility Layer
 * Maintains backward compatibility with existing imports while new architecture is adopted
 */

// Import new domain-based modules
const { POOL_SYSTEM, buildSystemUrl, buildDashboardUrl } = require('../../config');
const { PoolDataParser, PoolData, PoolDataCollector } = require('../../domains/pool');
const { timeSeriesService, influxDBClient } = require('../../domains/monitoring');

// Legacy poolDataParser.js exports
const legacyPoolDataParser = {
  parseDashboardData: (html) => PoolDataParser.parseAll(html).dashboard,
  parseFilterData: (html) => PoolDataParser.parseAll(html).filter,
  parseHeaterData: (html) => PoolDataParser.parseAll(html).heater,
  parseChlorinatorData: (html) => PoolDataParser.parseAll(html).chlorinator,
  parseLightsData: (html) => PoolDataParser.parseAll(html).lights,
  parseSchedulesData: (html) => PoolDataParser.parseAll(html).schedules,
  parseAllData: (html) => PoolDataParser.parseAll(html),
  createPoolDataStructure: (data) => new PoolData(data).toJSON()
};

// Legacy poolDataService.js exports
const legacyPoolDataService = {
  fetchAllPoolData: async (session) => {
    const collector = new PoolDataCollector(session.credentials || {});
    return await collector.collectAllData();
  },
  getMostRecentData: () => timeSeriesService.getLatestData()
};

// Legacy timeSeriesService.js exports
const legacyTimeSeriesService = timeSeriesService;

// Legacy influxDBService.js exports
const legacyInfluxDBService = {
  influxDBService: influxDBClient,
  InfluxDBService: class LegacyInfluxDBService {
    constructor() {
      return influxDBClient;
    }
  }
};

// Legacy constants.js exports
const legacyConstants = {
  POOL_CONSTANTS: POOL_SYSTEM,
  buildSystemUrl,
  buildDashboardUrl
};

module.exports = {
  // Pool data parsing
  ...legacyPoolDataParser,

  // Pool data service
  ...legacyPoolDataService,

  // Time series service
  timeSeriesService: legacyTimeSeriesService,

  // InfluxDB service
  ...legacyInfluxDBService,

  // Constants
  ...legacyConstants,

  // Direct exports for specific legacy imports
  PoolDataParser: legacyPoolDataParser,
  poolDataService: legacyPoolDataService,
  influxDBService: influxDBClient
};
