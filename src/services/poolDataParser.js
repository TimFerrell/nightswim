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

  return {
    temperature: {
      target: (() => {
        const temp = $('[id*="lblTempTarget"]').text().trim();
        if (temp) {
          // Extract numeric temperature value (whole numbers or decimals)
          const match = temp.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : temp;
        }
        return null;
      })(),
      actual: (() => {
        const temp = $('[id*="lblTempActual"]').text().trim();
        if (temp) {
          // Extract numeric temperature value (whole numbers or decimals)
          const match = temp.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : temp;
        }
        return null;
      })(),
      unit: POOL_CONSTANTS.UNITS.TEMPERATURE
    },
    airTemperature: (() => {
      // Try multiple selectors for air temperature
      const airTempSelectors = [
        '[id*="lblAirTemp"]',
        '[id*="AirTemp"]',
        '[id*="airTemp"]',
        '[id*="air_temp"]',
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
      
      for (const selector of airTempSelectors) {
        const temp = $(selector).text().trim();
        if (temp) {
          // Extract numeric temperature value (whole numbers or decimals)
          const match = temp.match(/(\d+(?:\.\d+)?)/);
          if (match) {
            return parseFloat(match[1]);
          }
        }
      }
      
      // Also try looking for text containing "air" or "outdoor" near temperature values
      const allElements = $('*');
      for (let i = 0; i < allElements.length; i++) {
        const element = allElements.eq(i);
        const text = element.text().trim();
        if (text && (text.toLowerCase().includes('air') || text.toLowerCase().includes('outdoor'))) {
          const tempMatch = text.match(/(\d+(?:\.\d+)?)/);
          if (tempMatch) {
            return parseFloat(tempMatch[1]);
          }
        }
      }
      
      return null;
    })(),
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
      const status = $('[id*="divfilterStatus"]').text().trim();
      // Return true if filter is on, false if off
      return status ? status.toLowerCase().includes('on') : null;
    })(),
    diagnostic: $('[id*="divPump"]').text().trim() || null
  };
};

/**
 * Parse heater data from HTML
 * @param {string} html - Raw HTML content
 * @returns {HeaterData} Parsed heater data
 */
const parseHeaterData = (html) => {
  const $ = cheerio.load(html);

  return {
    temperature: {
      min: (() => {
        const temp = $('[id*="lblMinTargetTemp"]').text().trim();
        if (temp) {
          // Extract numeric temperature value (whole numbers or decimals)
          const match = temp.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : temp;
        }
        return null;
      })(),
      current: (() => {
        const temp = $('[id*="lblTemp"]').text().trim();
        if (temp) {
          // Extract numeric temperature value (whole numbers or decimals)
          const match = temp.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : temp;
        }
        return null;
      })(),
      max: (() => {
        const temp = $('[id*="lblMaxTargetTemp"]').text().trim();
        if (temp) {
          // Extract numeric temperature value (whole numbers or decimals)
          const match = temp.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : temp;
        }
        return null;
      })(),
      actual: (() => {
        const temp = $('[id*="lblActualTemp"]').text().trim();
        if (temp) {
          // Extract numeric temperature value (whole numbers or decimals)
          const match = temp.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : temp;
        }
        return null;
      })(),
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

  return {
    salt: {
      instant: (() => {
        const rawText = $('.boxchlppm').text().trim();
        if (rawText) {
          // Extract numeric salt value from text like "salt level\n2897\nppm"
          const match = rawText.match(/(\d+)/);
          return match ? parseInt(match[1]) : rawText;
        }
        return $('[id*="boxchlppm"]').text().trim() || $('[id*="lbInstantSalt"]').text().trim() || $('[id*="chlppm"]').text().trim() || $('[id*="salt"]').text().trim() || $('[id*="InstantSalt"]').text().trim() || $('[id*="SaltLevel"]').text().trim() || null;
      })(),
      average: $('[id*="lbAverageSalt"]').text().trim() || $('[id*="AverageSalt"]').text().trim() || null,
      unit: POOL_CONSTANTS.UNITS.SALT
    },
    cell: {
      temperature: {
        value: (() => {
          const temp = $('[id*="lbCellTemp"]').text().trim();
          if (temp) {
            // Extract numeric temperature value (whole numbers or decimals)
            const match = temp.match(/(\d+(?:\.\d+)?)/);
            return match ? parseFloat(match[1]) : temp;
          }
          return null;
        })(),
        unit: POOL_CONSTANTS.UNITS.TEMPERATURE
      },
      voltage: (() => {
        const voltage = $('[id*="lbCellVoltage"]').text().trim();
        if (voltage) {
          // Extract numeric voltage value (whole numbers or decimals)
          const match = voltage.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : voltage;
        }
        return null;
      })(),
      current: (() => {
        const current = $('[id*="lbCellCurrent"]').text().trim();
        if (current) {
          // Extract numeric current value (whole numbers or decimals)
          const match = current.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : current;
        }
        return null;
      })(),
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

module.exports = {
  parseDashboardData,
  parseFilterData,
  parseHeaterData,
  parseChlorinatorData,
  parseLightsData,
  parseSchedulesData,
  createPoolDataStructure
};
