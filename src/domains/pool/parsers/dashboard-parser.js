/**
 * Dashboard Data Parser
 * Focused parser for dashboard-specific data
 */

const cheerio = require('cheerio');
const { POOL_SYSTEM } = require('../../../config');

class DashboardParser {
  static parse(html) {
    if (!html) {
      return this.getEmptyData();
    }

    const $ = cheerio.load(html);

    return {
      temperature: {
        target: this.extractTemperature($, '[id*="lblTempTarget"]'),
        actual: this.extractTemperature($, '[id*="lblTempActual"]'),
        unit: POOL_SYSTEM.UNITS.TEMPERATURE
      },
      airTemperature: this.extractAirTemperature($),
      systemStatus: POOL_SYSTEM.DEFAULTS.SYSTEM_STATUS
    };
  }

  static extractTemperature($, selector) {
    const temp = $(selector).text().trim();
    if (temp && temp !== '--' && temp !== '---') {
      const match = temp.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  }

  static extractAirTemperature($) {
    // Primary selector for current temperature
    const currentTemp = $('#lblCurrentTemp').text().trim();
    if (currentTemp) {
      const match = currentTemp.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    // Fallback selectors
    const fallbackSelectors = [
      '[id*="lblAirTemp"]',
      '[id*="AirTemp"]',
      '[id*="lblOutdoorTemp"]',
      '[id*="OutdoorTemp"]',
      '[id*="lblAmbientTemp"]',
      '[id*="AmbientTemp"]',
      '[id*="lblWeatherTemp"]',
      '[id*="WeatherTemp"]'
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
  }

  static getEmptyData() {
    return {
      temperature: {
        target: null,
        actual: null,
        unit: POOL_SYSTEM.UNITS.TEMPERATURE
      },
      airTemperature: null,
      systemStatus: POOL_SYSTEM.DEFAULTS.SYSTEM_STATUS
    };
  }
}

module.exports = { DashboardParser };
