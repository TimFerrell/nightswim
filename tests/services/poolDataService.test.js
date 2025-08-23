/**
 * Pool Data Service Tests
 * Tests for pool data collection and processing
 */

const poolDataService = require('../../src/services/poolDataService');

// Mock cheerio to avoid ES module issues
jest.mock('cheerio', () => ({
  load: jest.fn(() => {
    const mockCheerio = (selector) => {
      const mockElement = {
        text: jest.fn(() => {
          const selectorStr = String(selector);
          if (selectorStr.includes('lblTempTarget') || selectorStr === '#lblTempTarget') return '75°F';
          if (selectorStr.includes('lblTempActual') || selectorStr === '#lblTempActual') return '85°F';
          if (selectorStr.includes('divfilterStatus') || selectorStr === '#divfilterStatus') return 'ON';
          if (selectorStr.includes('divPump') || selectorStr === '#divPump') return 'Filter Pump Running';
          if (selectorStr.includes('lblMinTargetTemp') || selectorStr === '#lblMinTargetTemp') return '55°F';
          if (selectorStr.includes('lblTemp') || selectorStr === '#lblTemp') return '82°F';
          if (selectorStr.includes('lblMaxTargetTemp') || selectorStr === '#lblMaxTargetTemp') return '95°F';
          if (selectorStr.includes('lblActualTemp') || selectorStr === '#lblActualTemp') return '82°F';
          if (selectorStr.includes('lbCellTemp') || selectorStr === '#lbCellTemp') return '85.6°F';
          if (selectorStr.includes('lbCellVoltage') || selectorStr === '#lbCellVoltage') return '23.01';
          if (selectorStr.includes('lbCellCurrent') || selectorStr === '#lbCellCurrent') return '4.89';
          if (selectorStr.includes('lbCellType') || selectorStr === '#lbCellType') return 'T-15';
          if (selectorStr.includes('boxchlppm') || selectorStr === '.boxchlppm') return 'salt level 2897 ppm';
          if (selectorStr.includes('status') && !selectorStr.includes('divfilterStatus')) return 'ON';
          if (selectorStr.includes('brightness')) return '75%';
          if (selectorStr === 'input[type="checkbox"]:checked') return 'checked';
          if (selectorStr === 'input[type="radio"]:checked') return 'checked';
          return '';
        }),
        attr: jest.fn((attr) => {
          if (attr === 'name') {
            const selectorStr = String(selector);
            if (selectorStr.includes('heater') || selectorStr.includes('lblTemp')) return 'heater_on';
            if (selectorStr.includes('chlorinator') || selectorStr.includes('lbCell')) return 'chlorinator_on';
            return 'heater_on';
          }
          return null;
        }),
        length: 1,
        each: jest.fn((callback) => callback(0, mockElement)),
        find: jest.fn(() => mockElement)
      };
      return mockElement;
    };

    // Add methods that cheerio provides
    mockCheerio.each = jest.fn((callback) => callback(0, mockCheerio('table')));
    mockCheerio.length = 1;
    mockCheerio.find = jest.fn(() => mockCheerio('th'));

    return mockCheerio;
  })
}));

// Mock dependencies
jest.mock('../../src/services/HaywardSession');
jest.mock('../../src/services/weatherService');
jest.mock('../../src/services/poolDataParser');
jest.mock('../../src/services/influxDBService');
jest.mock('../../src/services/timeSeriesService');
jest.mock('../../src/services/pumpStateTracker');

const HaywardSession = require('../../src/services/HaywardSession');
const weatherService = require('../../src/services/weatherService');
const poolDataParser = require('../../src/services/poolDataParser');
const { influxDBService } = require('../../src/services/influxDBService');
const timeSeriesService = require('../../src/services/timeSeriesService');
const pumpStateTracker = require('../../src/services/pumpStateTracker');

describe('Pool Data Service - InfluxDB Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock successful session with sessionId
    HaywardSession.mockImplementation(() => ({
      sessionId: 'test-session-123',
      authenticate: jest.fn().mockResolvedValue(true),
      makeRequest: jest.fn().mockResolvedValue({ data: '<html>mock data</html>' })
    }));

    // Mock parser functions
    poolDataParser.parseDashboardData.mockReturnValue({
      temperature: { actual: 82, target: 80, unit: '°F' },
      airTemperature: 75
    });
    poolDataParser.parseFilterData.mockReturnValue({
      status: true
    });
    poolDataParser.parseChlorinatorData.mockReturnValue({
      salt: { instant: 3000, unit: 'PPM' },
      cell: { temperature: { value: 85, unit: '°F' }, voltage: 25.5 }
    });
    poolDataParser.parseHeaterData.mockReturnValue({
      status: false
    });
    poolDataParser.parseLightsData.mockReturnValue({
      status: false
    });
    poolDataParser.parseSchedulesData.mockReturnValue([]);
    poolDataParser.createPoolDataStructure.mockReturnValue({
      timestamp: new Date().toISOString(),
      dashboard: {},
      filter: {},
      heater: {},
      chlorinator: {},
      lights: {},
      schedules: [],
      weather: {}
    });

    // Mock weather service
    weatherService.getCurrentWeather.mockResolvedValue({
      temperature: 76,
      humidity: 65,
      description: 'Partly cloudy',
      source: 'OpenMeteo'
    });

    // Mock InfluxDB service
    influxDBService.storeDataPoint.mockResolvedValue(true);
    influxDBService.queryDataPoints.mockResolvedValue([]);

    // Mock time series service
    timeSeriesService.addDataPoint.mockResolvedValue(true);

    // Mock pump state tracker
    pumpStateTracker.checkStateChange.mockResolvedValue(true);

    // Clear cache and most recent data
    if (poolDataService.cleanupCache) {
      poolDataService.cleanupCache();
    }
    if (poolDataService.setMostRecentPoolData) {
      poolDataService.setMostRecentPoolData(null);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear cache and most recent data between tests
    if (poolDataService.cleanupCache) {
      poolDataService.cleanupCache();
    }
    if (poolDataService.setMostRecentPoolData) {
      poolDataService.setMostRecentPoolData(null);
    }
  });

  describe('InfluxDB Integration', () => {
    it('should store data points in InfluxDB when fetchAllPoolData is called', async () => {
      // Create a mock session
      const mockSession = {
        sessionId: 'test-session-123',
        authenticate: jest.fn().mockResolvedValue(true),
        makeRequest: jest.fn().mockResolvedValue({ data: '<html>mock data</html>' })
      };

      // Call the service
      const _result = await poolDataService.fetchAllPoolData(mockSession);

      // Verify InfluxDB storage was called
      expect(influxDBService.storeDataPoint).toHaveBeenCalledTimes(1);

      const storedDataPoint = influxDBService.storeDataPoint.mock.calls[0][0];
      expect(storedDataPoint).toMatchObject({
        saltInstant: 3000,
        cellTemp: 85,
        cellVoltage: 25.5,
        waterTemp: 82,
        airTemp: 75,
        pumpStatus: true,
        weatherTemp: 76,
        weatherHumidity: 65
      });
      expect(storedDataPoint.timestamp).toBeDefined();
    });

    it('should handle InfluxDB storage failures gracefully', async () => {
      // Create a mock session with different sessionId to avoid cache
      const mockSession = {
        sessionId: 'test-session-456',
        authenticate: jest.fn().mockResolvedValue(true),
        makeRequest: jest.fn().mockResolvedValue({ data: '<html>mock data</html>' })
      };

      // Mock InfluxDB storage failure
      influxDBService.storeDataPoint.mockResolvedValue(false);

      // Call the service - should not throw
      const result = await poolDataService.fetchAllPoolData(mockSession);

      // Verify InfluxDB storage was attempted
      expect(influxDBService.storeDataPoint).toHaveBeenCalledTimes(1);

      // Verify the service still returns data even if storage fails
      expect(result).toBeDefined();
      expect(result.chlorinator).toBeDefined();
    });

    it('should store data points with null values when data is missing', async () => {
      // Create a mock session with different sessionId to avoid cache
      const mockSession = {
        sessionId: 'test-session-789',
        authenticate: jest.fn().mockResolvedValue(true),
        makeRequest: jest.fn().mockResolvedValue({ data: '<html>mock data</html>' })
      };

      // Mock data with missing values
      poolDataParser.parseChlorinatorData.mockReturnValue({
        salt: { instant: null, unit: 'PPM' },
        cell: { temperature: { value: null, unit: '°F' }, voltage: null }
      });
      poolDataParser.parseDashboardData.mockReturnValue({
        temperature: { actual: null, target: 80, unit: '°F' },
        airTemperature: null
      });
      poolDataParser.parseFilterData.mockReturnValue({
        status: null
      });

      // Call the service
      await poolDataService.fetchAllPoolData(mockSession);

      // Verify InfluxDB storage was called with null values
      expect(influxDBService.storeDataPoint).toHaveBeenCalledTimes(1);

      const storedDataPoint = influxDBService.storeDataPoint.mock.calls[0][0];
      expect(storedDataPoint).toMatchObject({
        saltInstant: null,
        cellTemp: null,
        cellVoltage: null,
        waterTemp: null,
        airTemp: null,
        pumpStatus: null,
        weatherTemp: 76,
        weatherHumidity: 65
      });
    });

    it.skip('should log storage results for debugging', async () => {
      // Create a mock session with different sessionId to avoid cache
      const mockSession = {
        sessionId: 'test-session-debug',
        authenticate: jest.fn().mockResolvedValue(true),
        makeRequest: jest.fn().mockResolvedValue({ data: '<html>mock data</html>' })
      };

      // Mock console.log to capture logging
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Call the service
      await poolDataService.fetchAllPoolData(mockSession);

      // Verify logging occurred
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💾 Time series point to store:'),
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💾 New InfluxDB storage result:'),
        true
      );

      consoleSpy.mockRestore();
    });
  });
});
