/**
 * Pool Parsers Index
 * Centralized access to all pool data parsers
 */

const { DashboardParser } = require('./dashboard-parser');
const { FilterParser } = require('./filter-parser');
const { ChlorinatorParser } = require('./chlorinator-parser');
const cheerio = require('cheerio');
const { POOL_SYSTEM } = require('../../../config');

class PoolDataParser {
  /**
   * Parse all pool data from HTML
   */
  static parseAll(html) {
    if (!html) {
      return this.getEmptyData();
    }

    return {
      dashboard: DashboardParser.parse(html),
      filter: FilterParser.parse(html),
      chlorinator: ChlorinatorParser.parse(html),
      heater: this.parseHeaterData(html),
      lights: this.parseLightsData(html),
      schedules: this.parseSchedulesData(html)
    };
  }

  // Legacy parsers (to be moved to separate files later)
  static parseHeaterData(html) {
    if (!html) return this.getEmptyHeaterData();
    
    const $ = cheerio.load(html);
    
    return {
      temperature: {
        min: this.extractTemp($, '[id*="lblMinTargetTemp"]'),
        current: this.extractTemp($, '[id*="lblTemp"]'),
        max: this.extractTemp($, '[id*="lblMaxTargetTemp"]'),
        actual: this.extractTemp($, '[id*="lblActualTemp"]'),
        unit: POOL_SYSTEM.UNITS.TEMPERATURE
      },
      status: $('input[type="radio"]:checked').attr('name') || null,
      enabled: $('input[type="radio"]:checked').length > 0
    };
  }

  static parseLightsData(html) {
    if (!html) return this.getEmptyLightsData();
    
    const $ = cheerio.load(html);
    
    return {
      status: $('[id*="status"]').text().trim() || null,
      brightness: $('[id*="brightness"]').text().trim() || null,
      enabled: $('input[type="checkbox"]:checked').length > 0
    };
  }

  static parseSchedulesData(html) {
    if (!html) return [];
    
    const $ = cheerio.load(html);
    const schedules = [];

    $('table').each((tableIndex, table) => {
      const $table = $(table);
      let isScheduleTable = false;

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

            if (schedule.name && schedule.startTime) {
              schedules.push(schedule);
            }
          }
        });
      }
    });

    return schedules;
  }

  // Helper methods
  static extractTemp($, selector) {
    const temp = $(selector).text().trim();
    if (temp && temp !== '--' && temp !== '---') {
      const match = temp.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  }

  static getEmptyData() {
    return {
      dashboard: DashboardParser.getEmptyData(),
      filter: FilterParser.getEmptyData(),
      chlorinator: ChlorinatorParser.getEmptyData(),
      heater: this.getEmptyHeaterData(),
      lights: this.getEmptyLightsData(),
      schedules: []
    };
  }

  static getEmptyHeaterData() {
    return {
      temperature: {
        min: null,
        current: null,
        max: null,
        actual: null,
        unit: POOL_SYSTEM.UNITS.TEMPERATURE
      },
      status: null,
      enabled: false
    };
  }

  static getEmptyLightsData() {
    return {
      status: null,
      brightness: null,
      enabled: false
    };
  }
}

// Export individual parsers and main parser
module.exports = {
  PoolDataParser,
  DashboardParser,
  FilterParser,
  ChlorinatorParser
};