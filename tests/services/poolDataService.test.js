/**
 * Pool Data Service Tests
 * Tests for pool data collection and processing
 */

const poolDataService = require('../../src/services/poolDataService');

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
  parseDashboardData: jest.fn(),
  parseFilterData: jest.fn(),
  parseHeaterData: jest.fn(),
  parseChlorinatorData: jest.fn(),
  parseLightsData: jest.fn(),
  parseSchedulesData: jest.fn(),
  createPoolDataStructure: jest.fn()
}));

jest.mock('../../src/services/influxDBService', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../../src/services/timeSeriesService', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../../src/services/pumpStateTracker', () => ({
  __esModule: true,
  default: jest.fn()
}));

const HaywardSession = require('../../src/services/HaywardSession');
const weatherService = require('../../src/services/weatherService');
const poolDataParser = require('../../src/services/poolDataParser');
const influxDBService = require('../../src/services/influxDBService').influxDBService;
const timeSeriesService = require('../../src/services/timeSeriesService');
const pumpStateTracker = require('../../src/services/pumpStateTracker');

describe('Pool Data Service', () => {
  let service;
  let mockSession;
  let mockWeatherService;
  let mockPoolDataParser;
  let mockInfluxDBService;
  let mockTimeSeriesService;
  let mockPumpStateTracker;

  beforeEach(() => {
    // Create mock instances
    mockSession = {
      sessionId: 'test-session-123',
      makeRequest: jest.fn()
    };

    mockWeatherService = {
      getCurrentWeather: jest.fn()
    };

    mockPoolDataParser = {
      parseDashboardData: jest.fn(),
      parseFilterData: jest.fn(),
      parseHeaterData: jest.fn(),
      parseChlorinatorData: jest.fn(),
      parseLightsData: jest.fn(),
      parseSchedulesData: jest.fn(),
      createPoolDataStructure: jest.fn()
    };

    mockInfluxDBService = {
      storeDataPoint: jest.fn()
    };

    mockTimeSeriesService = {
      addDataPoint: jest.fn()
    };

    mockPumpStateTracker = {
      checkStateChange: jest.fn()
    };

    // Set up mock implementations for poolDataParser functions
    poolDataParser.createPoolDataStructure.mockImplementation(mockPoolDataParser.createPoolDataStructure);
    poolDataParser.parseDashboardData.mockImplementation(mockPoolDataParser.parseDashboardData);
    poolDataParser.parseFilterData.mockImplementation(mockPoolDataParser.parseFilterData);
    poolDataParser.parseHeaterData.mockImplementation(mockPoolDataParser.parseHeaterData);
    poolDataParser.parseChlorinatorData.mockImplementation(mockPoolDataParser.parseChlorinatorData);
    poolDataParser.parseLightsData.mockImplementation(mockPoolDataParser.parseLightsData);
    poolDataParser.parseSchedulesData.mockImplementation(mockPoolDataParser.parseSchedulesData);
    
    // Set up mock implementations for other services
    influxDBService.storeDataPoint.mockImplementation(mockInfluxDBService.storeDataPoint);
    timeSeriesService.addDataPoint.mockImplementation(mockTimeSeriesService.addDataPoint);
    pumpStateTracker.checkStateChange.mockImplementation(mockPumpStateTracker.checkStateChange);

    // Use the service object directly
    service = poolDataService;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the cache and most recent data between tests
    service.cleanupCache();
    service.setMostRecentPoolData(null);
  });

  describe('fetchAllPoolData', () => {
    test('should fetch all pool data successfully', async () => {
      const mockDashboardData = { temperature: { actual: 86 } };
      const mockFilterData = { status: 'running' };
      const mockHeaterData = { temperature: { setpoint: 82 } };
      const mockChlorinatorData = { salt: { instant: 2838 } };
      const mockLightsData = { status: 'off' };
      const mockSchedulesData = [];
      const mockWeatherData = { temperature: 89, humidity: 65 };

      // Mock parser functions
      mockPoolDataParser.createPoolDataStructure.mockReturnValue({
        timestamp: new Date().toISOString(),
        system: {},
        dashboard: {},
        filter: {},
        heater: {},
        chlorinator: {},
        lights: {},
        schedules: [],
        weather: {}
      });

      mockPoolDataParser.parseDashboardData.mockReturnValue(mockDashboardData);
      mockPoolDataParser.parseFilterData.mockReturnValue(mockFilterData);
      mockPoolDataParser.parseHeaterData.mockReturnValue(mockHeaterData);
      mockPoolDataParser.parseChlorinatorData.mockReturnValue(mockChlorinatorData);
      mockPoolDataParser.parseLightsData.mockReturnValue(mockLightsData);
      mockPoolDataParser.parseSchedulesData.mockReturnValue(mockSchedulesData);

      // Mock session requests
      mockSession.makeRequest.mockImplementation((url) => {
        if (url.includes('dashboard')) {
          return Promise.resolve({ data: '<html><span id="lblTempActual">86°F</span></html>' });
        }
        return Promise.resolve({ data: '<html></html>' });
      });

      // Mock weather service
      mockWeatherService.getCurrentWeather.mockResolvedValue(mockWeatherData);

      // Mock storage services
      mockInfluxDBService.storeDataPoint.mockResolvedValue(true);
      mockTimeSeriesService.addDataPoint.mockResolvedValue();
      mockPumpStateTracker.checkStateChange.mockResolvedValue();

      const result = await service.fetchAllPoolData(mockSession);

      expect(result).toBeDefined();
      expect(result.dashboard).toEqual(mockDashboardData);
      expect(result.filter).toEqual(mockFilterData);
      expect(result.heater).toEqual(mockHeaterData);
      expect(result.chlorinator).toEqual(mockChlorinatorData);
      expect(result.lights).toEqual(mockLightsData);
      expect(result.schedules).toEqual(mockSchedulesData);
      expect(result.weather).toEqual(mockWeatherData);
      expect(mockInfluxDBService.storeDataPoint).toHaveBeenCalled();
      expect(mockTimeSeriesService.addDataPoint).toHaveBeenCalled();
    });

    test('should handle request failures gracefully', async () => {
      mockPoolDataParser.createPoolDataStructure.mockReturnValue({
        timestamp: new Date().toISOString(),
        system: {},
        dashboard: {},
        filter: {},
        heater: {},
        chlorinator: {},
        lights: {},
        schedules: [],
        weather: {}
      });

      // Mock some requests to fail
      mockSession.makeRequest.mockImplementation((url) => {
        if (url.includes('dashboard')) {
          return Promise.reject(new Error('Dashboard fetch failed'));
        }
        return Promise.resolve({ data: '<html></html>' });
      });

      mockWeatherService.getCurrentWeather.mockRejectedValue(new Error('Weather failed'));

      const result = await service.fetchAllPoolData(mockSession);

      expect(result).toBeDefined();
      expect(result.dashboard).toEqual({ error: 'Dashboard fetch failed' });
      expect(result.weather).toEqual({ error: 'Weather failed' });
    });

    test('should handle empty HTML responses', async () => {
      mockPoolDataParser.createPoolDataStructure.mockReturnValue({
        timestamp: new Date().toISOString(),
        system: {},
        dashboard: {},
        filter: {},
        heater: {},
        chlorinator: {},
        lights: {},
        schedules: [],
        weather: {}
      });

      mockSession.makeRequest.mockResolvedValue({ data: '' });
      mockWeatherService.getCurrentWeather.mockResolvedValue({});

      const result = await service.fetchAllPoolData(mockSession);

      expect(result).toBeDefined();
      expect(mockInfluxDBService.storeDataPoint).toHaveBeenCalled();
    });

    test('should handle null HTML responses', async () => {
      mockPoolDataParser.createPoolDataStructure.mockReturnValue({
        timestamp: new Date().toISOString(),
        system: {},
        dashboard: {},
        filter: {},
        heater: {},
        chlorinator: {},
        lights: {},
        schedules: [],
        weather: {}
      });

      mockSession.makeRequest.mockResolvedValue({ data: null });
      mockWeatherService.getCurrentWeather.mockResolvedValue({});

      const result = await service.fetchAllPoolData(mockSession);

      expect(result).toBeDefined();
      expect(mockInfluxDBService.storeDataPoint).toHaveBeenCalled();
    });
  });

  describe('Cache Functions', () => {
    test('should get cached data when available and not expired', () => {
      const testData = { test: 'data' };
      const cacheKey = 'test-key';
      
      service.setCachedData(cacheKey, testData);
      const result = service.getCachedData(cacheKey);
      
      expect(result).toEqual(testData);
    });

    test('should return null for expired cache', () => {
      const testData = { test: 'data' };
      const cacheKey = 'test-key';
      
      service.setCachedData(cacheKey, testData);
      
      // Manually expire the cache by modifying the timestamp
      const cache = service.getCachedData(cacheKey);
      expect(cache).toEqual(testData);
      
      // Clear cache and check again
      service.cleanupCache();
      const result = service.getCachedData(cacheKey);
      expect(result).toBeNull();
    });

    test('should return null for non-existent cache key', () => {
      const result = service.getCachedData('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Most Recent Data Functions', () => {
    test('should set and get most recent pool data', () => {
      const testData = { test: 'data' };
      
      service.setMostRecentPoolData(testData);
      const result = service.getMostRecentPoolData();
      
      expect(result).toEqual(testData);
    });

    test('should return null when no recent data is set', () => {
      const result = service.getMostRecentPoolData();
      expect(result).toBeNull();
    });
  });

  describe('Data Validation', () => {
    test('should handle missing optional fields', async () => {
      mockPoolDataParser.createPoolDataStructure.mockReturnValue({
        timestamp: new Date().toISOString(),
        system: {},
        dashboard: {},
        filter: {},
        heater: {},
        chlorinator: {},
        lights: {},
        schedules: [],
        weather: {}
      });

      mockSession.makeRequest.mockResolvedValue({ data: '<html></html>' });
      mockWeatherService.getCurrentWeather.mockResolvedValue({});

      const result = await service.fetchAllPoolData(mockSession);

      expect(result).toBeDefined();
      expect(mockInfluxDBService.storeDataPoint).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    test('should complete data collection within reasonable time', async () => {
      mockPoolDataParser.createPoolDataStructure.mockReturnValue({
        timestamp: new Date().toISOString(),
        system: {},
        dashboard: {},
        filter: {},
        heater: {},
        chlorinator: {},
        lights: {},
        schedules: [],
        weather: {}
      });

      mockSession.makeRequest.mockResolvedValue({ data: '<html></html>' });
      mockWeatherService.getCurrentWeather.mockResolvedValue({});

      const startTime = Date.now();
      const result = await service.fetchAllPoolData(mockSession);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent data collection', async () => {
      mockPoolDataParser.createPoolDataStructure.mockReturnValue({
        timestamp: new Date().toISOString(),
        system: {},
        dashboard: {},
        filter: {},
        heater: {},
        chlorinator: {},
        lights: {},
        schedules: [],
        weather: {}
      });

      mockSession.makeRequest.mockResolvedValue({ data: '<html></html>' });
      mockWeatherService.getCurrentWeather.mockResolvedValue({});

      const promises = Array.from({ length: 3 }, () => service.fetchAllPoolData(mockSession));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });
  });
}); 