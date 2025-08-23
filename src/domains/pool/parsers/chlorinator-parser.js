/**
 * Chlorinator Data Parser
 * Focused parser for chlorinator/salt cell data
 */

const cheerio = require('cheerio');
const { POOL_SYSTEM } = require('../../../config');

class ChlorinatorParser {
  static parse(html) {
    if (!html) {
      return this.getEmptyData();
    }

    const $ = cheerio.load(html);

    return {
      salt: {
        instant: this.extractSaltLevel($),
        average: this.extractNumeric($, '[id*="lbAverageSalt"]') ||
                 this.extractNumeric($, '[id*="AverageSalt"]'),
        unit: POOL_SYSTEM.UNITS.SALT
      },
      cell: {
        temperature: {
          value: this.extractNumeric($, '[id*="lbCellTemp"]'),
          unit: POOL_SYSTEM.UNITS.TEMPERATURE
        },
        voltage: this.extractNumeric($, '[id*="lbCellVoltage"]'),
        current: this.extractNumeric($, '[id*="lbCellCurrent"]'),
        type: $('[id*="lbCellType"]').text().trim() || null
      },
      status: $('input[type="radio"]:checked').attr('name') || null,
      enabled: $('input[type="radio"]:checked').length > 0
    };
  }

  static extractNumeric($, selector) {
    const text = $(selector).text().trim();
    if (text && text !== '--' && text !== '---') {
      const match = text.match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : null;
    }
    return null;
  }

  static extractSaltLevel($) {
    // Primary selector
    const rawText = $('.boxchlppm').text().trim();
    if (rawText) {
      const match = rawText.match(/(\d+)/);
      if (match) {
        return parseInt(match[1]);
      }
    }

    // Fallback selectors
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
  }

  static getEmptyData() {
    return {
      salt: {
        instant: null,
        average: null,
        unit: POOL_SYSTEM.UNITS.SALT
      },
      cell: {
        temperature: {
          value: null,
          unit: POOL_SYSTEM.UNITS.TEMPERATURE
        },
        voltage: null,
        current: null,
        type: null
      },
      status: null,
      enabled: false
    };
  }
}

module.exports = { ChlorinatorParser };
