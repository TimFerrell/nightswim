// Pool system constants
const POOL_CONSTANTS = {
  // System identifiers
  MSP_ID: 'DCEC367C6BDDCB06',
  BOW_ID: '48A6C0EBC3808A94',
  BOW_SYSTEM_ID: 'BE1BF543BCC6BD40',

  // Base URLs
  HAYWARD_BASE_URL: 'https://haywardomnilogic.com',

  // API endpoints
  ENDPOINTS: {
    LOGIN: '/Login.aspx',
    DASHBOARD: '/Module/UserManagement/Dashboard.aspx',
    FILTER_SETTINGS: '/Module/UserManagement/Filter_Setting.aspx',
    HEATER_SETTINGS: '/Module/UserManagement/Heater_Setting.aspx',
    CHLORINATOR_SETTINGS: '/Module/UserManagement/Chlorinator_Setting.aspx',
    LIGHTS_SETTINGS: '/Module/UserManagement/Light_Setting.aspx',
    SCHEDULES: '/Module/UserManagement/Bow_Schedule_List.aspx'
  },

  // Units
  UNITS: {
    TEMPERATURE: '°F',
    SALT: 'PPM'
  },

  // Default values
  DEFAULTS: {
    SYSTEM_STATUS: 'online'
  }
};

// Helper function to build URLs with system parameters
const buildSystemUrl = (endpoint) => {
  return `${endpoint}?mspID=${POOL_CONSTANTS.MSP_ID}&bowID=${POOL_CONSTANTS.BOW_ID}&bowSystemID=${POOL_CONSTANTS.BOW_SYSTEM_ID}`;
};

// Helper function to build dashboard URL (only needs MSP_ID)
const buildDashboardUrl = () => {
  return `${POOL_CONSTANTS.ENDPOINTS.DASHBOARD}?mspID=${POOL_CONSTANTS.MSP_ID}`;
};

module.exports = {
  POOL_CONSTANTS,
  buildSystemUrl,
  buildDashboardUrl
};
