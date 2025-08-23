const cheerio = require('cheerio');
const { POOL_CONSTANTS } = require('../utils/constants');

/**
 * @typedef {object} DashboardData
 * @property {object} temperature - Temperature information
 * @property {number|null} temperature.target - Target temperature
 * @property {number|null} temperature.actual - Actual temperature
 * @property {string} temperature.unit - Temperature unit
 * @property {string} systemStatus - System status
 */

/**
 * @typedef {object} FilterData
 * @property {boolean|null} status - Filter pump status (true = on, false = off)
 * @property {string|null} diagnostic - Filter diagnostic information
 */

/**
 * @typedef {object} HeaterData
 * @property {object} temperature - Temperature information
 * @property {number|null} temperature.min - Minimum temperature
 * @property {number|null} temperature.current - Current temperature
 * @property {number|null} temperature.max - Maximum temperature
 * @property {number|null} temperature.actual - Actual temperature
 * @property {string} temperature.unit - Temperature unit
 * @property {string|null} status - Heater status
 * @property {boolean} enabled - Whether heater is enabled
 */

/**
 * @typedef {object} ChlorinatorData
 * @property {object} salt - Salt information
 * @property {number|null} salt.instant - Instant salt level
 * @property {string|null} salt.average - Average salt level
 * @property {string} salt.unit - Salt unit
 * @property {object} cell - Cell information
 * @property {object} cell.temperature - Cell temperature
 * @property {number|null} cell.temperature.value - Cell temperature value
 * @property {string} cell.temperature.unit - Cell temperature unit
 * @property {number|null} cell.voltage - Cell voltage
 * @property {number|null} cell.current - Cell current
 * @property {string|null} cell.type - Cell type
 * @property {string|null} status - Chlorinator status
 * @property {boolean} enabled - Whether chlorinator is enabled
 */

/**
 * @typedef {object} LightsData
 * @property {string|null} status - Lights status
 * @property {string|null} brightness - Lights brightness
 * @property {boolean} enabled - Whether lights are enabled
 */

/**
 * @typedef {object} Schedule
 * @property {string|null} name - Schedule name
 * @property {string|null} startTime - Start time
 * @property {string|null} endTime - End time
 * @property {string|null} setting - Setting
 * @property {string|null} repeat - Repeat pattern
 * @property {string|null} status - Schedule status
 */

/**
 * Parse dashboard data from HTML
 * @param {string} html - Raw HTML content
 * @returns {DashboardData} Parsed dashboard data
 */
const parseDashboardData = (html) => {
  const $ = cheerio.load(html);

  // Helper function to extract temperature value
  const extractTemp = ($, selector) => {
    const temp = $(selector).text().trim();
    if (temp && temp !== '--' && temp !== '---') {
      const match = temp.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  };

  // Helper function to extract air temperature
  const extractAirTemp = ($) => {
    // Primary selector for current temperature
    const currentTemp = $('#lblCurrentTemp').text().trim();
    if (currentTemp) {
      const match = currentTemp.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    // Fallback selectors if lblCurrentTemp is not found
    const fallbackSelectors = [
      '[id*="lblAirTemp"]',
      '[id*="AirTemp"]',
      '[id*="airTemp"]',
      '[id*="lblOutdoorTemp"]',
      '[id*="OutdoorTemp"]',
      '[id*="outdoorTemp"]',
      '[id*="lblAmbientTemp"]',
      '[id*="AmbientTemp"]',
      '[id*="ambientTemp"]',
      '[id*="lblWeatherTemp"]',
      '[id*="WeatherTemp"]',
      '[id*="weatherTemp"]'
    ];

    for (const selector of fallbackSelectors) {
      const temp = $(selector).text().trim();
      if (temp) {
        const match = temp.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }

    return null;
  };

  return {
    temperature: {
      target: extractTemp($, '[id*="lblTempTarget"]'),
      actual: extractTemp($, '[id*="lblTempActual"]'),
      unit: POOL_CONSTANTS.UNITS.TEMPERATURE
    },
    airTemperature: extractAirTemp($),
    systemStatus: POOL_CONSTANTS.DEFAULTS.SYSTEM_STATUS
  };
};

/**
 * Parse filter pump data from HTML
 * @param {string} html - Raw HTML content
 * @returns {FilterData} Parsed filter data
 */
const parseFilterData = (html) => {
  const $ = cheerio.load(html);

  return {
    status: (() => {
      // Try multiple selectors for filter/pump status
      const statusSelectors = [
        '#cphMainContent_3_divStatusName',  // This is the correct selector!
        '[id*="divfilterStatus"]',
        '[id*="filterStatus"]',
        '[id*="pumpStatus"]',
        '[id*="divPump"]',
        '[id*="lblFilter"]',
        '[id*="lblPump"]',
        '[id*="filter"]',
        '[id*="pump"]'
      ];

      let status = null;

      for (const selector of statusSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          console.log(`🔍 Filter status selector "${selector}": "${text}"`);

          if (text) {
            // Check for various "on" indicators
            const isOn = text.toLowerCase().includes('on') ||
                        text.toLowerCase().includes('running') ||
                        text.toLowerCase().includes('active') ||
                        text.toLowerCase().includes('enabled') ||
                        text.toLowerCase().includes('1') ||
                        text.toLowerCase().includes('true');

            // Check for various "off" indicators
            const isOff = text.toLowerCase().includes('off') ||
                         text.toLowerCase().includes('stopped') ||
                         text.toLowerCase().includes('inactive') ||
                         text.toLowerCase().includes('disabled') ||
                         text.toLowerCase().includes('0') ||
                         text.toLowerCase().includes('false');

            if (isOn) {
              status = true;
              console.log(`✅ Filter pump detected as ON via selector "${selector}"`);
              break;
            } else if (isOff) {
              status = false;
              console.log(`❌ Filter pump detected as OFF via selector "${selector}"`);
              break;
            }
          }
        }
      }

      // If no clear status found, try to infer from diagnostic text
      if (status === null) {
        const diagnostic = $('[id*="divPump"]').text().trim() ||
                          $('[id*="pump"]').text().trim() ||
                          $('[id*="filter"]').text().trim();

        if (diagnostic) {
          console.log(`🔍 Filter diagnostic text: "${diagnostic}"`);
          const isOn = diagnostic.toLowerCase().includes('on') ||
                      diagnostic.toLowerCase().includes('running') ||
                      diagnostic.toLowerCase().includes('active');

          if (isOn) {
            status = true;
            console.log('✅ Filter pump inferred as ON from diagnostic text');
          }
        }
      }

      console.log(`🏊‍♂️ Final filter pump status: ${status}`);
      return status;
    })(),
    diagnostic: $('[id*="divPump"]').text().trim() ||
                $('[id*="pump"]').text().trim() ||
                $('[id*="filter"]').text().trim() || null
  };
};

/**
 * Parse heater data from HTML
 * @param {string} html - Raw HTML content
 * @returns {HeaterData} Parsed heater data
 */
const parseHeaterData = (html) => {
  const $ = cheerio.load(html);

  // Helper function to extract temperature value
  const extractTemp = ($, selector) => {
    const temp = $(selector).text().trim();
    if (temp && temp !== '--' && temp !== '---') {
      const match = temp.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  };

  return {
    temperature: {
      min: extractTemp($, '[id*="lblMinTargetTemp"]'),
      current: extractTemp($, '[id*="lblTemp"]'),
      max: extractTemp($, '[id*="lblMaxTargetTemp"]'),
      actual: extractTemp($, '[id*="lblActualTemp"]'),
      unit: POOL_CONSTANTS.UNITS.TEMPERATURE
    },
    status: $('input[type="radio"]:checked').attr('name') || null,
    enabled: $('input[type="radio"]:checked').length > 0
  };
};

/**
 * Parse chlorinator data from HTML
 * @param {string} html - Raw HTML content
 * @returns {ChlorinatorData} Parsed chlorinator data
 */
const parseChlorinatorData = (html) => {
  const $ = cheerio.load(html);

  // Helper function to extract numeric value
  const extractNumeric = ($, selector) => {
    const text = $(selector).text().trim();
    if (text && text !== '--' && text !== '---') {
      const match = text.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  };

  // Helper function to extract salt value
  const extractSalt = ($) => {
    const rawText = $('.boxchlppm').text().trim();
    if (rawText) {
      const match = rawText.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }

    // Try fallback selectors
    const fallbackSelectors = [
      '[id*="boxchlppm"]',
      '[id*="lbInstantSalt"]',
      '[id*="chlppm"]',
      '[id*="salt"]',
      '[id*="InstantSalt"]',
      '[id*="SaltLevel"]'
    ];

    for (const selector of fallbackSelectors) {
      const text = $(selector).text().trim();
      if (text) {
        const match = text.match(/(\d+)/);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }

    return null;
  };

  return {
    salt: {
      instant: extractSalt($),
      average: extractNumeric($, '[id*="lbAverageSalt"]') || extractNumeric($, '[id*="AverageSalt"]'),
      unit: POOL_CONSTANTS.UNITS.SALT
    },
    cell: {
      temperature: {
        value: extractNumeric($, '[id*="lbCellTemp"]'),
        unit: POOL_CONSTANTS.UNITS.TEMPERATURE
      },
      voltage: extractNumeric($, '[id*="lbCellVoltage"]'),
      current: extractNumeric($, '[id*="lbCellCurrent"]'),
      type: $('[id*="lbCellType"]').text().trim() || null
    },
    status: $('input[type="radio"]:checked').attr('name') || null,
    enabled: $('input[type="radio"]:checked').length > 0
  };
};

/**
 * Parse lights data from HTML
 * @param {string} html - Raw HTML content
 * @returns {LightsData} Parsed lights data
 */
const parseLightsData = (html) => {
  const $ = cheerio.load(html);

  return {
    status: $('[id*="status"]').text().trim() || null,
    brightness: $('[id*="brightness"]').text().trim() || null,
    enabled: $('input[type="checkbox"]:checked').length > 0
  };
};

/**
 * Parse schedules data from HTML
 * @param {string} html - Raw HTML content
 * @returns {Schedule[]} Parsed schedules array
 */
const parseSchedulesData = (html) => {
  const $ = cheerio.load(html);
  const schedules = [];

  // Find the schedules table by looking for specific headers
  $('table').each((tableIndex, table) => {
    const $table = $(table);
    let isScheduleTable = false;

    // Check if this table contains schedule headers
    $table.find('th').each((headerIndex, header) => {
      const headerText = $(header).text().trim().toLowerCase();
      if (headerText.includes('name') || headerText.includes('time') || headerText.includes('setting')) {
        isScheduleTable = true;
      }
    });

    if (isScheduleTable) {
      $table.find('tr').each((rowIndex, row) => {
        const $row = $(row);
        const cells = $row.find('td');

        if (cells.length >= 6) {
          const schedule = {
            name: $(cells[0]).text().trim() || null,
            startTime: $(cells[1]).text().trim() || null,
            endTime: $(cells[2]).text().trim() || null,
            setting: $(cells[3]).text().trim() || null,
            repeat: $(cells[4]).text().trim() || null,
            status: $(cells[5]).text().trim() || null
          };

          // Only add if we have meaningful data
          if (schedule.name && schedule.startTime) {
            schedules.push(schedule);
          }
        }
      });
    }
  });

  return schedules;
};

/**
 * Create the complete pool data structure
 * @param {object} data - Object containing parsed data from different components
 * @returns {PoolData} Complete pool data structure
 */
const createPoolDataStructure = (data) => {
  return {
    timestamp: new Date().toISOString(),
    system: {
      mspId: POOL_CONSTANTS.MSP_ID,
      bowId: POOL_CONSTANTS.BOW_ID,
      bowSystemId: POOL_CONSTANTS.BOW_SYSTEM_ID
    },
    dashboard: data.dashboard || {},
    filter: data.filter || {},
    heater: data.heater || {},
    chlorinator: data.chlorinator || {},
    lights: data.lights || {},
    schedules: data.schedules || []
  };
};

/**
 * Parse weather data from HTML
 * @param {string} html - Raw HTML content
 * @returns {object} Parsed weather data
 */
const parseWeatherData = (html) => {
  if (!html) {
    return {
      temperature: null,
      humidity: null,
      conditions: null
    };
  }

  const $ = cheerio.load(html);

  // Helper function to extract numeric value
  const extractNumeric = ($, selector) => {
    const text = $(selector).first().text().trim();
    if (text && text !== '--' && text !== '---') {
      const match = text.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  };

  return {
    temperature: extractNumeric($, '[id*="weather"], [id*="temp"], [class*="weather"], [class*="temp"]'),
    humidity: extractNumeric($, '[id*="humidity"], [class*="humidity"]'),
    conditions: $('[id*="conditions"], [class*="conditions"]').first().text().trim() || null
  };
};

/**
 * Parse all data from HTML
 * @param {string} html - Raw HTML content
 * @returns {object} Complete parsed data structure
 */
const parseAllData = (html) => {
  if (!html) {
    return {
      dashboard: {},
      filter: {},
      heater: {},
      chlorinator: {},
      lights: {},
      weather: {},
      schedules: []
    };
  }

  return {
    dashboard: parseDashboardData(html),
    filter: parseFilterData(html),
    heater: parseHeaterData(html),
    chlorinator: parseChlorinatorData(html),
    lights: parseLightsData(html),
    weather: parseWeatherData(html),
    schedules: parseSchedulesData(html)
  };
};

module.exports = {
  parseDashboardData,
  parseFilterData,
  parseHeaterData,
  parseChlorinatorData,
  parseLightsData,
  parseSchedulesData,
  parseWeatherData,
  parseAllData,
  createPoolDataStructure
};
