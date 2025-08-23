/**
 * Filter Data Parser
 * Focused parser for filter/pump-specific data
 */

const cheerio = require('cheerio');

class FilterParser {
  static parse(html) {
    if (!html) {
      return this.getEmptyData();
    }

    const $ = cheerio.load(html);
    
    return {
      status: this.extractPumpStatus($),
      diagnostic: this.extractDiagnosticInfo($)
    };
  }

  static extractPumpStatus($) {
    const statusSelectors = [
      '#cphMainContent_3_divStatusName',  // Known working selector
      '[id*="divfilterStatus"]',
      '[id*="filterStatus"]',
      '[id*="pumpStatus"]',
      '[id*="divPump"]',
      '[id*="lblFilter"]',
      '[id*="lblPump"]',
      '[id*="filter"]',
      '[id*="pump"]'
    ];

    for (const selector of statusSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        console.log(`🔍 Filter status selector "${selector}": "${text}"`);

        if (text) {
          const status = this.parseStatusText(text);
          if (status !== null) {
            console.log(`✅ Filter pump detected as ${status ? 'ON' : 'OFF'} via selector "${selector}"`);
            return status;
          }
        }
      }
    }

    // If no clear status found, try to infer from diagnostic text
    const diagnostic = this.extractDiagnosticInfo($);
    if (diagnostic) {
      console.log(`🔍 Filter diagnostic text: "${diagnostic}"`);
      const status = this.parseStatusText(diagnostic);
      if (status !== null) {
        console.log(`✅ Filter pump inferred as ${status ? 'ON' : 'OFF'} from diagnostic text`);
        return status;
      }
    }

    console.log(`🏊‍♂️ Final filter pump status: null`);
    return null;
  }

  static parseStatusText(text) {
    const lowerText = text.toLowerCase();
    
    // Check for "on" indicators
    const isOn = lowerText.includes('on') ||
                lowerText.includes('running') ||
                lowerText.includes('active') ||
                lowerText.includes('enabled') ||
                lowerText.includes('1') ||
                lowerText.includes('true');

    // Check for "off" indicators
    const isOff = lowerText.includes('off') ||
                 lowerText.includes('stopped') ||
                 lowerText.includes('inactive') ||
                 lowerText.includes('disabled') ||
                 lowerText.includes('0') ||
                 lowerText.includes('false');

    if (isOn) return true;
    if (isOff) return false;
    return null;
  }

  static extractDiagnosticInfo($) {
    const diagnosticSelectors = [
      '[id*="divPump"]',
      '[id*="pump"]',
      '[id*="filter"]'
    ];

    for (const selector of diagnosticSelectors) {
      const text = $(selector).text().trim();
      if (text) {
        return text;
      }
    }

    return null;
  }

  static getEmptyData() {
    return {
      status: null,
      diagnostic: null
    };
  }
}

module.exports = { FilterParser };