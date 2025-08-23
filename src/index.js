/**
 * Main Application Index
 * Central export point for the restructured application
 */

// Configuration
const config = require('./config');

// Domain modules
const pool = require('./domains/pool');
const monitoring = require('./domains/monitoring');

// Web modules
const webUtils = require('./web/frontend/utils/dom-cache');
const statusCards = require('./web/frontend/components/status-cards');

// Legacy compatibility (for gradual migration)
const legacyExports = require('./shared/compatibility/legacy-exports');

module.exports = {
  // Configuration
  config,
  
  // Domains
  pool,
  monitoring,
  
  // Web components
  web: {
    utils: webUtils,
    components: {
      statusCards
    }
  },
  
  // Legacy compatibility layer
  legacy: legacyExports,
  
  // Direct exports for common use cases
  PoolData: pool.PoolData,
  PoolDataParser: pool.PoolDataParser,
  PoolDataCollector: pool.PoolDataCollector,
  timeSeriesService: monitoring.timeSeriesService,
  influxDBClient: monitoring.influxDBClient
};