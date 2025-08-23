/**
 * Pool System Constants
 * All pool-related constants and configuration values
 */

const POOL_SYSTEM = {
  // System identifiers
  MSP_ID: '44697',
  BOW_ID: '102321',
  BOW_SYSTEM_ID: '102321',

  // Base URLs and endpoints
  BASE_URL: 'https://hayward.com/PoolFusion/',
  
  ENDPOINTS: {
    LOGIN: 'aspx/Login.aspx',
    DASHBOARD: 'Dashboard.aspx',
    HEATER: 'aspx/control/heater.aspx',
    FILTER: 'aspx/control/filter.aspx',
    CHLORINATOR: 'aspx/control/chlorinator.aspx',
    LIGHTS: 'aspx/control/lights.aspx',
    SCHEDULES: 'aspx/schedule/schedule.aspx'
  },

  // Data units
  UNITS: {
    TEMPERATURE: '°F',
    SALT: 'PPM',
    VOLTAGE: 'V',
    CURRENT: 'A',
    PERCENTAGE: '%'
  },

  // Default values
  DEFAULTS: {
    SYSTEM_STATUS: 'online',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    DATA_RETENTION_HOURS: 168 // 7 days
  },

  // Validation ranges
  VALIDATION: {
    TEMPERATURE: { min: 32, max: 120 },
    SALT: { min: 2000, max: 5000 },
    VOLTAGE: { min: 0, max: 50 },
    CURRENT: { min: 0, max: 10 }
  }
};

// URL builders
const buildSystemUrl = (endpoint = '') => {
  const params = new URLSearchParams({
    mspId: POOL_SYSTEM.MSP_ID,
    bowId: POOL_SYSTEM.BOW_ID,
    bowSystemId: POOL_SYSTEM.BOW_SYSTEM_ID
  });
  return `${POOL_SYSTEM.BASE_URL}${endpoint}?${params}`;
};

const buildDashboardUrl = () => {
  return `${POOL_SYSTEM.BASE_URL}${POOL_SYSTEM.ENDPOINTS.DASHBOARD}?mspId=${POOL_SYSTEM.MSP_ID}`;
};

module.exports = {
  POOL_SYSTEM,
  buildSystemUrl,
  buildDashboardUrl
};