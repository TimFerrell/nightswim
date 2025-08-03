#!/usr/bin/env node

/**
 * Simple type checking demonstration script
 * This script shows how JSDoc type annotations can be used for type validation
 */

const { POOL_CONSTANTS } = require('../src/utils/constants');
const sessionManager = require('../src/services/sessionManager');

/**
 * @typedef {import('../src/services/poolDataParser').DashboardData} DashboardData
 * @typedef {import('../src/services/poolDataParser').FilterData} FilterData
 * @typedef {import('../src/services/poolDataParser').HeaterData} HeaterData
 * @typedef {import('../src/services/poolDataParser').ChlorinatorData} ChlorinatorData
 * @typedef {import('../src/services/poolDataParser').LightsData} LightsData
 * @typedef {import('../src/services/poolDataParser').Schedule} Schedule
 */

/**
 * Type validation function for DashboardData
 * @param {unknown} data - Data to validate
 * @returns {data is DashboardData} True if data is valid DashboardData
 */
function isValidDashboardData(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.temperature === 'object' &&
    data.temperature !== null &&
    (typeof data.temperature.target === 'number' || data.temperature.target === null) &&
    (typeof data.temperature.actual === 'number' || data.temperature.actual === null) &&
    typeof data.temperature.unit === 'string' &&
    typeof data.systemStatus === 'string'
  );
}

/**
 * Type validation function for FilterData
 * @param {unknown} data - Data to validate
 * @returns {data is FilterData} True if data is valid FilterData
 */
function isValidFilterData(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    (typeof data.status === 'boolean' || data.status === null) &&
    (typeof data.diagnostic === 'string' || data.diagnostic === null)
  );
}

/**
 * Type validation function for HeaterData
 * @param {unknown} data - Data to validate
 * @returns {data is HeaterData} True if data is valid HeaterData
 */
function isValidHeaterData(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.temperature === 'object' &&
    data.temperature !== null &&
    (typeof data.temperature.min === 'number' || data.temperature.min === null) &&
    (typeof data.temperature.current === 'number' || data.temperature.current === null) &&
    (typeof data.temperature.max === 'number' || data.temperature.max === null) &&
    (typeof data.temperature.actual === 'number' || data.temperature.actual === null) &&
    typeof data.temperature.unit === 'string' &&
    (typeof data.status === 'string' || data.status === null) &&
    typeof data.enabled === 'boolean'
  );
}

/**
 * Type validation function for ChlorinatorData
 * @param {unknown} data - Data to validate
 * @returns {data is ChlorinatorData} True if data is valid ChlorinatorData
 */
function isValidChlorinatorData(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.salt === 'object' &&
    data.salt !== null &&
    (typeof data.salt.instant === 'number' || data.salt.instant === null) &&
    (typeof data.salt.average === 'string' || data.salt.average === null) &&
    typeof data.salt.unit === 'string' &&
    typeof data.cell === 'object' &&
    data.cell !== null &&
    typeof data.cell.temperature === 'object' &&
    data.cell.temperature !== null &&
    (typeof data.cell.temperature.value === 'number' || data.cell.temperature.value === null) &&
    typeof data.cell.temperature.unit === 'string' &&
    (typeof data.cell.voltage === 'number' || data.cell.voltage === null) &&
    (typeof data.cell.current === 'number' || data.cell.current === null) &&
    (typeof data.cell.type === 'string' || data.cell.type === null) &&
    (typeof data.status === 'string' || data.status === null) &&
    typeof data.enabled === 'boolean'
  );
}

/**
 * Type validation function for LightsData
 * @param {unknown} data - Data to validate
 * @returns {data is LightsData} True if data is valid LightsData
 */
function isValidLightsData(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    (typeof data.status === 'string' || data.status === null) &&
    (typeof data.brightness === 'string' || data.brightness === null) &&
    typeof data.enabled === 'boolean'
  );
}

/**
 * Type validation function for Schedule
 * @param {unknown} data - Data to validate
 * @returns {data is Schedule} True if data is valid Schedule
 */
function isValidSchedule(data) {
  return (
    typeof data === 'object' &&
    data !== null &&
    (typeof data.name === 'string' || data.name === null) &&
    (typeof data.startTime === 'string' || data.startTime === null) &&
    (typeof data.endTime === 'string' || data.endTime === null) &&
    (typeof data.setting === 'string' || data.setting === null) &&
    (typeof data.repeat === 'string' || data.repeat === null) &&
    (typeof data.status === 'string' || data.status === null)
  );
}

/**
 * Demonstrate type checking with sample data
 */
function demonstrateTypeChecking() {
  console.log('🔍 Type Checking Demonstration\n');

  // Test valid DashboardData
  const validDashboardData = {
    temperature: {
      target: 75,
      actual: 85,
      unit: '°F'
    },
    systemStatus: 'online'
  };

  console.log('✅ Valid DashboardData:', isValidDashboardData(validDashboardData));

  // Test invalid DashboardData
  const invalidDashboardData = {
    temperature: {
      target: 'not a number', // Should be number or null
      actual: 85,
      unit: '°F'
    },
    systemStatus: 'online'
  };

  console.log('❌ Invalid DashboardData:', isValidDashboardData(invalidDashboardData));

  // Test valid FilterData
  const validFilterData = {
    status: true,
    diagnostic: 'Filter Pump Running'
  };

  console.log('✅ Valid FilterData:', isValidFilterData(validFilterData));

  // Test valid HeaterData
  const validHeaterData = {
    temperature: {
      min: 55,
      current: 75,
      max: 90,
      actual: 85,
      unit: '°F'
    },
    status: 'enabled',
    enabled: true
  };

  console.log('✅ Valid HeaterData:', isValidHeaterData(validHeaterData));

  // Test valid ChlorinatorData
  const validChlorinatorData = {
    salt: {
      instant: 2884,
      average: '2850',
      unit: 'PPM'
    },
    cell: {
      temperature: {
        value: 85.6,
        unit: '°F'
      },
      voltage: 25.57,
      current: 6.18,
      type: 'T-15'
    },
    status: 'enabled',
    enabled: true
  };

  console.log('✅ Valid ChlorinatorData:', isValidChlorinatorData(validChlorinatorData));

  // Test valid Schedule
  const validSchedule = {
    name: 'Filter Pump',
    startTime: '08:00 AM',
    endTime: '08:00 PM',
    setting: '--',
    repeat: 'Weekdays',
    status: 'Enable'
  };

  console.log('✅ Valid Schedule:', isValidSchedule(validSchedule));

  // Test constants
  console.log('\n📋 Constants Validation:');
  console.log('MSP_ID type:', typeof POOL_CONSTANTS.MSP_ID, 'Expected: string');
  console.log('BOW_ID type:', typeof POOL_CONSTANTS.BOW_ID, 'Expected: string');
  console.log('HAYWARD_BASE_URL type:', typeof POOL_CONSTANTS.HAYWARD_BASE_URL, 'Expected: string');

  // Test session manager
  console.log('\n🔐 Session Manager Validation:');
  const session = sessionManager.getSession('test-session');
  console.log('Session type:', typeof session, 'Expected: object');
  console.log('Session has authenticate method:', typeof session.authenticate === 'function');
  console.log('Session has makeRequest method:', typeof session.makeRequest === 'function');
}

// Run the demonstration if this script is executed directly
if (require.main === module) {
  demonstrateTypeChecking();
}

module.exports = {
  isValidDashboardData,
  isValidFilterData,
  isValidHeaterData,
  isValidChlorinatorData,
  isValidLightsData,
  isValidSchedule
}; 