/**
 * Configuration Module Index
 * Central export point for all configuration
 */

const { envConfig, EnvironmentConfig } = require('./environment');
const { POOL_SYSTEM, buildSystemUrl, buildDashboardUrl } = require('./pool-constants');

module.exports = {
  // Environment configuration
  envConfig,
  EnvironmentConfig,
  
  // Pool system constants
  POOL_SYSTEM,
  buildSystemUrl,
  buildDashboardUrl,
  
  // Legacy compatibility - maintain old constant names
  POOL_CONSTANTS: POOL_SYSTEM
};