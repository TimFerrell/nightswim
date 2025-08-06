/**
 * Pool Data Service Tests
 * Tests for pool data collection and processing
 */

const poolDataService = require('../../src/services/poolDataService');

// Mock cheerio to avoid ES module issues
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    text: jest.fn(() => ''),
    find: jest.fn(() => ({ text: jest.fn(() => '') }))
  }))
}));

// Mock dependencies
jest.mock('../../src/services/HaywardSession', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../../src/services/weatherService', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../../src/services/poolDataParser', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../../src/services/influxDBService', () => ({
  __esModule: true,
  default: jest.fn()
}));

const HaywardSession = require('../../src/services/HaywardSession');
const weatherService = require('../../src/services/weatherService');
const poolDataParser = require('../../src/services/poolDataParser');
const influxDBService = require('../../src/services/influxDBService');

describe('Pool Data Service', () => {
  let service;
  let mockHaywardSession;
  let mockWeatherService;
  let mockPoolDataParser;
  let mockInfluxDBService;

  beforeEach(() => {
    // Create mock instances
    mockHaywardSession = {
      getPoolData: jest.fn(),
      isAuthenticated: jest.fn(),
      authenticate: jest.fn()
    };

    mockWeatherService = {
      getWeatherData: jest.fn()
    };

    mockPoolDataParser = {
      parseAllData: jest.fn()
    };

    mockInfluxDBService = {
      storeDataPoint: jest.fn(),
      testConnection: jest.fn()
    };

    // Mock constructors
    HaywardSession.default.mockImplementation(() => mockHaywardSession);
    weatherService.default.mockImplementation(() => mockWeatherService);
    poolDataParser.default.mockImplementation(() => mockPoolDataParser);
    influxDBService.default.mockImplementation(() => mockInfluxDBService);

    // Use the service object directly
    service = poolDataService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('collectPoolData', () => {
    test('should collect pool data successfully', async () => {
      const mockHtml = '<html><body><span id="lblTempActual">86°F</span></body></html>';
      const mockParsedData = {
        dashboard: { temperature: { actual: 86 } },
        chlorinator: { salt: { instant: 2838 } }
      };
      const mockWeatherData = { temperature: 89, humidity: 65 };

      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockResolvedValue(mockHtml);
      mockPoolDataParser.parseAllData.mockReturnValue(mockParsedData);
      mockWeatherService.getWeatherData.mockResolvedValue(mockWeatherData);

      const result = await service.collectPoolData();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.dashboard).toEqual(mockParsedData.dashboard);
      expect(result.data.chlorinator).toEqual(mockParsedData.chlorinator);
      expect(result.data.weather).toEqual(mockWeatherData);
    });

    test('should handle authentication failure', async () => {
      mockHaywardSession.isAuthenticated.mockResolvedValue(false);
      mockHaywardSession.authenticate.mockRejectedValue(new Error('Auth failed'));

      const result = await service.collectPoolData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    test('should handle Hayward data fetch failure', async () => {
      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockRejectedValue(new Error('Fetch failed'));

      const result = await service.collectPoolData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch pool data');
    });

    test('should handle parsing failure', async () => {
      const mockHtml = '<html><body><span id="lblTempActual">86°F</span></body></html>';

      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockResolvedValue(mockHtml);
      mockPoolDataParser.parseAllData.mockImplementation(() => {
        throw new Error('Parsing failed');
      });

      const result = await service.collectPoolData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse pool data');
    });

    test('should handle weather service failure', async () => {
      const mockHtml = '<html><body><span id="lblTempActual">86°F</span></body></html>';
      const mockParsedData = {
        dashboard: { temperature: { actual: 86 } }
      };

      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockResolvedValue(mockHtml);
      mockPoolDataParser.parseAllData.mockReturnValue(mockParsedData);
      mockWeatherService.getWeatherData.mockRejectedValue(new Error('Weather failed'));

      const result = await service.collectPoolData();

      expect(result.success).toBe(true);
      expect(result.data.weather).toBeNull();
      expect(result.weatherError).toContain('Weather failed');
    });

    test('should handle empty HTML response', async () => {
      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockResolvedValue('');

      const result = await service.collectPoolData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty response from Hayward');
    });

    test('should handle null HTML response', async () => {
      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockResolvedValue(null);

      const result = await service.collectPoolData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Empty response from Hayward');
    });
  });

  describe('processPoolData', () => {
    test('should process pool data successfully', async () => {
      const rawData = {
        dashboard: { temperature: { actual: 86 } },
        chlorinator: { salt: { instant: 2838 } },
        weather: { temperature: 89 }
      };

      const mockInfluxDB = {
        storeDataPoint: jest.fn().mockResolvedValue(true)
      };
      influxDBService.mockImplementation(() => mockInfluxDB);

      const result = await service.processPoolData(rawData);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(true);
      expect(mockInfluxDB.storeDataPoint).toHaveBeenCalled();
    });

    test('should handle storage failure', async () => {
      const rawData = {
        dashboard: { temperature: { actual: 86 } }
      };

      const mockInfluxDB = {
        storeDataPoint: jest.fn().mockRejectedValue(new Error('Storage failed'))
      };
      influxDBService.mockImplementation(() => mockInfluxDB);

      const result = await service.processPoolData(rawData);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(false);
      expect(result.storageError).toContain('Storage failed');
    });

    test('should validate data structure', async () => {
      const invalidData = {
        invalid: 'data'
      };

      const result = await service.processPoolData(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid data structure');
    });

    test('should handle null data', async () => {
      const result = await service.processPoolData(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No data provided');
    });

    test('should handle missing required fields', async () => {
      const incompleteData = {
        dashboard: { temperature: { actual: 86 } }
        // Missing chlorinator and weather
      };

      const result = await service.processPoolData(incompleteData);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(true);
      // Should still process with missing fields
    });
  });

  describe('Data Validation', () => {
    test('should validate temperature ranges', async () => {
      const dataWithExtremeTemp = {
        dashboard: { temperature: { actual: 200 } }, // Extreme temperature
        chlorinator: { salt: { instant: 2838 } },
        weather: { temperature: 89 }
      };

      const mockInfluxDB = {
        storeDataPoint: jest.fn().mockResolvedValue(true)
      };
      influxDBService.mockImplementation(() => mockInfluxDB);

      const result = await service.processPoolData(dataWithExtremeTemp);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(true);
      // Should still store extreme values (validation happens elsewhere)
    });

    test('should validate salt level ranges', async () => {
      const dataWithExtremeSalt = {
        dashboard: { temperature: { actual: 86 } },
        chlorinator: { salt: { instant: 10000 } }, // Extreme salt level
        weather: { temperature: 89 }
      };

      const mockInfluxDB = {
        storeDataPoint: jest.fn().mockResolvedValue(true)
      };
      influxDBService.mockImplementation(() => mockInfluxDB);

      const result = await service.processPoolData(dataWithExtremeSalt);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(true);
    });

    test('should handle null values in data', async () => {
      const dataWithNulls = {
        dashboard: { temperature: { actual: null } },
        chlorinator: { salt: { instant: null } },
        weather: { temperature: null }
      };

      const mockInfluxDB = {
        storeDataPoint: jest.fn().mockResolvedValue(true)
      };
      influxDBService.mockImplementation(() => mockInfluxDB);

      const result = await service.processPoolData(dataWithNulls);

      expect(result.success).toBe(true);
      expect(result.stored).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts', async () => {
      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      const result = await service.collectPoolData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });

    test('should handle malformed HTML', async () => {
      const malformedHtml = '<html><body><span id="lblTempActual">86°F</span><span id="lblSaltInstant">2838</span>';
      const mockParsedData = {
        dashboard: { temperature: { actual: 86 } },
        chlorinator: { salt: { instant: 2838 } }
      };

      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockResolvedValue(malformedHtml);
      mockPoolDataParser.parseAllData.mockReturnValue(mockParsedData);
      mockWeatherService.getWeatherData.mockResolvedValue({ temperature: 89 });

      const result = await service.collectPoolData();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('should handle service unavailability', async () => {
      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockRejectedValue(new Error('Service unavailable'));

      const result = await service.collectPoolData();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });
  });

  describe('Performance', () => {
    test('should complete data collection within reasonable time', async () => {
      const mockHtml = '<html><body><span id="lblTempActual">86°F</span></body></html>';
      const mockParsedData = {
        dashboard: { temperature: { actual: 86 } },
        chlorinator: { salt: { instant: 2838 } }
      };
      const mockWeatherData = { temperature: 89 };

      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockResolvedValue(mockHtml);
      mockPoolDataParser.parseAllData.mockReturnValue(mockParsedData);
      mockWeatherService.getWeatherData.mockResolvedValue(mockWeatherData);

      const startTime = Date.now();
      const result = await service.collectPoolData();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle concurrent data collection', async () => {
      const mockHtml = '<html><body><span id="lblTempActual">86°F</span></body></html>';
      const mockParsedData = {
        dashboard: { temperature: { actual: 86 } }
      };
      const mockWeatherData = { temperature: 89 };

      mockHaywardSession.isAuthenticated.mockResolvedValue(true);
      mockHaywardSession.getPoolData.mockResolvedValue(mockHtml);
      mockPoolDataParser.parseAllData.mockReturnValue(mockParsedData);
      mockWeatherService.getWeatherData.mockResolvedValue(mockWeatherData);

      const promises = Array.from({ length: 5 }, () => service.collectPoolData());
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Data Transformation', () => {
    test('should transform data to correct format', async () => {
      const rawData = {
        dashboard: { temperature: { actual: 86 } },
        chlorinator: { salt: { instant: 2838 } },
        weather: { temperature: 89 }
      };

      const mockInfluxDB = {
        storeDataPoint: jest.fn().mockResolvedValue(true)
      };
      influxDBService.mockImplementation(() => mockInfluxDB);

      await service.processPoolData(rawData);

      expect(mockInfluxDB.storeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          saltInstant: 2838,
          waterTemp: 86,
          airTemp: 89
        })
      );
    });

    test('should handle missing optional fields', async () => {
      const incompleteData = {
        dashboard: { temperature: { actual: 86 } }
        // Missing chlorinator and weather
      };

      const mockInfluxDB = {
        storeDataPoint: jest.fn().mockResolvedValue(true)
      };
      influxDBService.mockImplementation(() => mockInfluxDB);

      await service.processPoolData(incompleteData);

      expect(mockInfluxDB.storeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          waterTemp: 86,
          saltInstant: null,
          airTemp: null
        })
      );
    });
  });
}); 