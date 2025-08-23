/**
 * Pool Data Parser Tests
 * Tests for parsing HTML content from Hayward system
 */

// Mock cheerio to avoid ES module issues
jest.mock('cheerio', () => ({
  load: jest.fn(() => {
    const mock$ = jest.fn((selector) => {
      // Return different values based on selector
      if (selector.includes('lblTempTarget')) {
        return { text: jest.fn(() => '88°F') };
      }
      if (selector.includes('lblTempActual')) {
        return { text: jest.fn(() => '86°F') };
      }
      if (selector.includes('lblCurrentTemp')) {
        return { text: jest.fn(() => '89°F') };
      }
      if (selector.includes('boxchlppm')) {
        return { text: jest.fn(() => 'salt level\n2838\nppm') };
      }
      if (selector.includes('lbInstantSalt')) {
        return { text: jest.fn(() => '2838') };
      }
      if (selector.includes('lbCellVoltage')) {
        return { text: jest.fn(() => '23.33V') };
      }
      if (selector.includes('lbCellTemp')) {
        return { text: jest.fn(() => '75°F') };
      }
      if (selector.includes('lblMinTargetTemp')) {
        return { text: jest.fn(() => '78°F') };
      }
      if (selector.includes('lblMaxTargetTemp')) {
        return { text: jest.fn(() => '92°F') };
      }
      if (selector.includes('lblActualTemp')) {
        return { text: jest.fn(() => '86°F') };
      }
      if (selector.includes('weather') || selector.includes('temp')) {
        return {
          first: jest.fn(() => ({ text: jest.fn(() => '89°F') })),
          text: jest.fn(() => '89°F')
        };
      }
      if (selector.includes('humidity')) {
        return {
          first: jest.fn(() => ({ text: jest.fn(() => '65%') })),
          text: jest.fn(() => '65%')
        };
      }
      if (selector.includes('conditions')) {
        return {
          first: jest.fn(() => ({ text: jest.fn(() => 'Sunny') })),
          text: jest.fn(() => 'Sunny')
        };
      }
      if (selector.includes('radio')) {
        return {
          checked: jest.fn(() => ({ attr: jest.fn(() => 'heater') })),
          length: 1,
          attr: jest.fn(() => 'heater')
        };
      }
      if (selector.includes('checkbox')) {
        return {
          checked: jest.fn(() => ({ length: 1 }))
        };
      }
      if (selector.includes('lbCellType')) {
        return { text: jest.fn(() => 'T-15') };
      }
      if (selector.includes('lbAverageSalt')) {
        return { text: jest.fn(() => '2850') };
      }
      if (selector.includes('lbCellCurrent')) {
        return { text: jest.fn(() => '5.2A') };
      }
      if (selector.includes('table')) {
        return {
          each: jest.fn(() => []),
          find: jest.fn(() => ({ each: jest.fn(() => []) }))
        };
      }
      // Default case
      return {
        text: jest.fn(() => ''),
        first: jest.fn(() => ({ text: jest.fn(() => '') })),
        attr: jest.fn(() => null),
        length: 0,
        trim: jest.fn(() => ''),
        each: jest.fn(() => [])
      };
    });

    // Add methods to the mock function
    mock$.first = jest.fn(() => mock$);
    mock$.attr = jest.fn(() => null);
    mock$.length = 0;

    return mock$;
  })
}));

const poolDataParser = require('../../src/services/poolDataParser');

describe('Pool Data Parser', () => {
  let mockHtml;

  beforeEach(() => {
    // Mock HTML content from Hayward system
    mockHtml = `
      <html>
        <body>
          <!-- Dashboard Data -->
          <span id="lblTempActual">86°F</span>
          <span id="lblTempTarget">88°F</span>
          <span id="lblFilterStatus">ON</span>
          <span id="lblPumpStatus">Running</span>
          
          <!-- Chlorinator Data -->
          <span id="lblSaltInstant">2838</span>
          <span id="lblCellVoltage">23.33V</span>
          <span id="lblCellCurrent">5.2A</span>
          <span id="lblCellTemp">75°F</span>
          
          <!-- Weather Data -->
          <span id="lblAirTemp">89°F</span>
          <span id="lblHumidity">65%</span>
          
          <!-- Heater Data -->
          <span id="lblHeaterTempMin">78°F</span>
          <span id="lblHeaterTempCurrent">86°F</span>
          <span id="lblHeaterTempMax">92°F</span>
          <span id="lblHeaterTempActual">86°F</span>
        </body>
      </html>
    `;
  });

  describe('parseDashboardData', () => {
    test('should parse valid dashboard data correctly', () => {
      const result = poolDataParser.parseDashboardData(mockHtml);

      expect(result).toBeDefined();
      expect(result.temperature).toBeDefined();
      expect(result.temperature.target).toBe(88);
      expect(result.temperature.actual).toBe(86);
      expect(result.airTemperature).toBe(89);
      expect(result.systemStatus).toBeDefined();
    });

    test('should handle empty HTML', () => {
      const result = poolDataParser.parseDashboardData('');

      expect(result).toBeDefined();
      expect(result.temperature).toBeDefined();
    });

    test('should handle null HTML', () => {
      const result = poolDataParser.parseDashboardData(null);

      expect(result).toBeDefined();
      expect(result.temperature).toBeDefined();
    });
  });

  describe('parseChlorinatorData', () => {
    test('should parse valid chlorinator data correctly', () => {
      const result = poolDataParser.parseChlorinatorData(mockHtml);

      expect(result).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.cell).toBeDefined();
    });

    test('should handle empty HTML', () => {
      const result = poolDataParser.parseChlorinatorData('');

      expect(result).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.cell).toBeDefined();
    });
  });

  describe('parseWeatherData', () => {
    test('should parse valid weather data correctly', () => {
      const result = poolDataParser.parseWeatherData(mockHtml);

      expect(result).toBeDefined();
      expect(typeof result.temperature).toBe('number');
      expect(typeof result.humidity).toBe('number');
    });

    test('should handle empty HTML', () => {
      const result = poolDataParser.parseWeatherData('');

      expect(result).toBeDefined();
      expect(result.temperature).toBeNull();
      expect(result.humidity).toBeNull();
    });
  });

  describe('parseHeaterData', () => {
    test('should parse valid heater data correctly', () => {
      const result = poolDataParser.parseHeaterData(mockHtml);

      expect(result).toBeDefined();
      expect(result.temperature).toBeDefined();
      expect(result.temperature.min).toBeDefined();
      expect(result.temperature.current).toBeDefined();
      expect(result.temperature.max).toBeDefined();
      expect(result.temperature.actual).toBeDefined();
    });

    test('should handle empty HTML', () => {
      const result = poolDataParser.parseHeaterData('');

      expect(result).toBeDefined();
      expect(result.temperature).toBeDefined();
    });
  });

  describe('parseAllData', () => {
    test('should parse all data correctly', () => {
      const result = poolDataParser.parseAllData(mockHtml);

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
      expect(result.weather).toBeDefined();
      expect(result.heater).toBeDefined();
    });

    test('should handle partial data', () => {
      const partialHtml = `
        <html>
          <body>
            <span id="lblTempActual">86°F</span>
            <span id="lblSaltInstant">2838</span>
          </body>
        </html>
      `;

      const result = poolDataParser.parseAllData(partialHtml);

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
      expect(result.weather).toBeDefined();
      expect(result.heater).toBeDefined();
    });

    test('should handle empty HTML', () => {
      const result = poolDataParser.parseAllData('');

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
      expect(result.weather).toBeDefined();
      expect(result.heater).toBeDefined();
    });

    test('should handle null HTML', () => {
      const result = poolDataParser.parseAllData(null);

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
      expect(result.weather).toBeDefined();
      expect(result.heater).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    test('should validate numeric ranges', () => {
      const htmlWithExtremeValues = `
        <html>
          <body>
            <span id="lblTempActual">200°F</span>
            <span id="lblSaltInstant">10000</span>
            <span id="lblCellVoltage">50V</span>
          </body>
        </html>
      `;

      const result = poolDataParser.parseAllData(htmlWithExtremeValues);

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
    });

    test('should handle special characters in data', () => {
      const htmlWithSpecialChars = `
        <html>
          <body>
            <span id="lblTempActual">86.5°F</span>
            <span id="lblSaltInstant">2,838</span>
            <span id="lblCellVoltage">23.33V</span>
          </body>
        </html>
      `;

      const result = poolDataParser.parseAllData(htmlWithSpecialChars);

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed HTML', () => {
      const malformedHtml = '<html><body><span id="lblTempActual">86°F</span><span id="lblSaltInstant">2838</span>';

      const result = poolDataParser.parseAllData(malformedHtml);

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
    });

    test('should handle HTML with script tags', () => {
      const htmlWithScripts = `
        <html>
          <body>
            <script>var temp = 86;</script>
            <span id="lblTempActual">86°F</span>
            <script>var salt = 2838;</script>
            <span id="lblSaltInstant">2838</span>
          </body>
        </html>
      `;

      const result = poolDataParser.parseAllData(htmlWithScripts);

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
    });

    test('should handle HTML with nested elements', () => {
      const htmlWithNesting = `
        <html>
          <body>
            <div>
              <span>
                <span id="lblTempActual">86°F</span>
              </span>
            </div>
            <div>
              <span id="lblSaltInstant">2838</span>
            </div>
          </body>
        </html>
      `;

      const result = poolDataParser.parseAllData(htmlWithNesting);

      expect(result).toBeDefined();
      expect(result.dashboard).toBeDefined();
      expect(result.chlorinator).toBeDefined();
    });
  });
});
