/**
 * Pool Routes Tests
 * Tests for API endpoints with request/response validations
 */

// Mock cheerio to avoid ES module issues
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    text: jest.fn(() => ''),
    find: jest.fn(() => ({ text: jest.fn(() => '') }))
  }))
}));

// Polyfill for setImmediate in test environment
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));

const request = require('supertest');
const express = require('express');

// Mock services
jest.mock('../../src/services/influxDBService', () => ({
  influxDBService: {
    queryDataPoints: jest.fn(),
    getStats: jest.fn(),
    testConnection: jest.fn(),
    storeDataPoint: jest.fn(),
    getCurrentSalt: jest.fn(),
    getSaltRollingAverage: jest.fn()
  }
}));

jest.mock('../../src/services/timeSeriesService', () => ({
  addDataPoint: jest.fn(),
  getDataPoints: jest.fn(),
  getLatestData: jest.fn(),
  clearData: jest.fn(),
  getStats: jest.fn()
}));

jest.mock('../../src/services/pumpStateTracker', () => ({
  checkStateChange: jest.fn()
}));

const influxDBService = require('../../src/services/influxDBService').influxDBService;
const timeSeriesService = require('../../src/services/timeSeriesService');
const pumpStateTracker = require('../../src/services/pumpStateTracker');

describe('Pool Routes', () => {
  let app;
  let mockInfluxDB;
  let mockTimeSeries;
  let mockPumpStateTracker;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock service instances
    mockInfluxDB = {
      queryDataPoints: jest.fn(),
      getStats: jest.fn(),
      testConnection: jest.fn(),
      storeDataPoint: jest.fn(),
      getCurrentSalt: jest.fn(),
      getSaltRollingAverage: jest.fn()
    };

    mockTimeSeries = {
      addDataPoint: jest.fn(),
      getDataPoints: jest.fn(),
      getLatestData: jest.fn(),
      clearData: jest.fn(),
      getStats: jest.fn()
    };

    mockPumpStateTracker = {
      checkStateChange: jest.fn()
    };

    // Set up mock implementations
    influxDBService.queryDataPoints.mockImplementation(mockInfluxDB.queryDataPoints);
    influxDBService.getStats.mockImplementation(mockInfluxDB.getStats);
    influxDBService.testConnection.mockImplementation(mockInfluxDB.testConnection);
    influxDBService.storeDataPoint.mockImplementation(mockInfluxDB.storeDataPoint);
    influxDBService.getCurrentSalt.mockImplementation(mockInfluxDB.getCurrentSalt);
    influxDBService.getSaltRollingAverage.mockImplementation(mockInfluxDB.getSaltRollingAverage);

    timeSeriesService.addDataPoint.mockImplementation(mockTimeSeries.addDataPoint);
    timeSeriesService.getDataPoints.mockImplementation(mockTimeSeries.getDataPoints);
    timeSeriesService.getLatestData.mockImplementation(mockTimeSeries.getLatestData);
    timeSeriesService.clearData.mockImplementation(mockTimeSeries.clearData);
    timeSeriesService.getStats.mockImplementation(mockTimeSeries.getStats);

    pumpStateTracker.checkStateChange.mockImplementation(mockPumpStateTracker.checkStateChange);

    // Import and register routes
    const poolRoutes = require('../../src/routes/poolRoutes');
    app.use('/api/pool', poolRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pool/data', () => {
    test('should return pool data successfully', async () => {
      const mockDataPoints = [
        {
          timestamp: '2024-01-01T12:00:00Z',
          saltInstant: 2838,
          waterTemp: 86,
          cellVoltage: 23.33,
          cellTemp: 75,
          pumpStatus: 'running',
          weatherTemp: 89,
          airTemp: 85
        }
      ];

      mockInfluxDB.queryDataPoints.mockResolvedValue(mockDataPoints);

      const response = await request(app)
        .get('/api/pool/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.dashboard.temperature.actual).toBe(86);
      expect(response.body.data.chlorinator.salt.instant).toBe(2838);
      expect(response.body.data.chlorinator.cell.voltage).toBe(23.33);
      expect(response.body.data.filter.status).toBe('running');
      expect(response.body.data.weather.temperature).toBe(89);
      expect(response.body.source).toBe('influxdb');
      expect(response.body.timestamp).toBeDefined();
    });

    test.skip('should handle no data available', async () => {
      mockInfluxDB.queryDataPoints.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/pool/data')
        .expect(404);

      expect(response.body.error).toBe('No data available');
      expect(response.body.message).toContain('Pool data not yet collected');
    });

    test('should handle InfluxDB query error', async () => {
      mockInfluxDB.queryDataPoints.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/pool/data')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch pool data from InfluxDB');
    });

    test('should handle partial data gracefully', async () => {
      const mockDataPoints = [
        {
          timestamp: '2024-01-01T12:00:00Z',
          saltInstant: null,
          waterTemp: 86,
          cellVoltage: null,
          cellTemp: 75,
          pumpStatus: 'running',
          weatherTemp: 89,
          airTemp: 85
        }
      ];

      mockInfluxDB.queryDataPoints.mockResolvedValue(mockDataPoints);

      const response = await request(app)
        .get('/api/pool/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dashboard.temperature.actual).toBe(86);
      expect(response.body.data.chlorinator.salt.instant).toBeNull();
      expect(response.body.data.chlorinator.cell.voltage).toBeNull();
    });
  });

  describe('GET /api/pool/timeseries', () => {
    test('should return time series data successfully', async () => {
      const mockDataPoints = [
        {
          timestamp: '2024-01-01T12:00:00Z',
          saltInstant: 2838,
          waterTemp: 86,
          cellVoltage: 23.33,
          cellTemp: 75,
          pumpStatus: 'running',
          weatherTemp: 89
        }
      ];

      const mockStats = {
        totalPoints: 1,
        averageSalt: 2838,
        averageTemp: 86
      };

      mockInfluxDB.queryDataPoints.mockResolvedValue(mockDataPoints);
      mockInfluxDB.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/pool/timeseries?hours=24')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDataPoints);
      expect(response.body.stats).toEqual(mockStats);
      expect(response.body.source).toBe('influxdb');
    });

    test('should fall back to in-memory storage when InfluxDB is empty', async () => {
      const mockFallbackData = [
        {
          timestamp: '2024-01-01T12:00:00Z',
          saltInstant: 2838,
          waterTemp: 86
        }
      ];

      const mockFallbackStats = {
        totalPoints: 1,
        averageSalt: 2838
      };

      mockInfluxDB.queryDataPoints.mockResolvedValue([]);
      mockTimeSeries.getDataPoints.mockReturnValue(mockFallbackData);
      mockTimeSeries.getStats.mockReturnValue(mockFallbackStats);

      const response = await request(app)
        .get('/api/pool/timeseries?hours=24')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFallbackData);
      expect(response.body.stats).toEqual(mockFallbackStats);
      expect(response.body.source).toBe('memory');
    });

    test('should handle query parameter validation', async () => {
      const mockDataPoints = [];
      mockInfluxDB.queryDataPoints.mockResolvedValue(mockDataPoints);

      const _response = await request(app)
        .get('/api/pool/timeseries')
        .expect(200);

      // Should default to 24 hours
      expect(mockInfluxDB.queryDataPoints).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe('GET /api/pool/salt', () => {
    test.skip('should return current salt level', async () => {
      const mockSaltData = {
        current: 2838,
        average: 2850,
        unit: 'PPM'
      };

      mockInfluxDB.getCurrentSalt.mockResolvedValue(mockSaltData);

      const response = await request(app)
        .get('/api/pool/salt')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSaltData);
    });

    test.skip('should handle no salt data available', async () => {
      mockInfluxDB.getCurrentSalt.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/pool/salt')
        .expect(404);

      expect(response.body.error).toBe('No salt data available');
    });
  });

  describe('GET /api/pool/salt/average', () => {
    test.skip('should return salt rolling average', async () => {
      const mockAverageData = {
        average: 2850,
        period: '7 days',
        unit: 'PPM'
      };

      mockInfluxDB.getSaltRollingAverage.mockResolvedValue(mockAverageData);

      const response = await request(app)
        .get('/api/pool/salt/average')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAverageData);
    });

    test.skip('should handle no average data available', async () => {
      mockInfluxDB.getSaltRollingAverage.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/pool/salt/average')
        .expect(404);

      expect(response.body.error).toBe('No salt average data available');
    });
  });

  describe('GET /api/pool/status', () => {
    test.skip('should return system status', async () => {
      const _mockStatus = {
        influxdb: 'connected',
        lastDataUpdate: '2024-01-01T12:00:00Z',
        dataPoints: 100
      };

      mockInfluxDB.testConnection.mockResolvedValue(true);
      mockInfluxDB.getStats.mockResolvedValue({ totalPoints: 100 });

      const response = await request(app)
        .get('/api/pool/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
    });

    test.skip('should handle InfluxDB connection failure', async () => {
      mockInfluxDB.testConnection.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/pool/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status.influxdb).toBe('disconnected');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed requests', async () => {
      const response = await request(app)
        .get('/api/pool/timeseries?hours=invalid')
        .expect(200);

      // Should handle invalid hours parameter gracefully
      expect(response.body.success).toBe(true);
    });

    test.skip('should handle missing routes', async () => {
      const response = await request(app)
        .get('/api/pool/nonexistent')
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should complete requests within reasonable time', async () => {
      const mockDataPoints = [
        {
          timestamp: '2024-01-01T12:00:00Z',
          saltInstant: 2838,
          waterTemp: 86
        }
      ];

      mockInfluxDB.queryDataPoints.mockResolvedValue(mockDataPoints);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/pool/data')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
