/**
 * Home Routes Tests
 * Tests for home environment API endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock the InfluxDB client
jest.mock('../../src/domains/monitoring/services/influxdb-client', () => ({
  influxDBClient: {
    queryHomeEnvironmentData: jest.fn(),
    getHomeEnvironmentStats: jest.fn()
  }
}));

const { influxDBClient } = require('../../src/domains/monitoring/services/influxdb-client');
const homeRoutes = require('../../src/routes/homeRoutes');

describe('Home Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/home', homeRoutes);
  });

  describe('GET /api/home/environment', () => {
    it('should return current home environment data', async () => {
      const mockData = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          temperature: 72.5,
          humidity: 45.2,
          feelsLike: 74.1
        }
      ];

      influxDBClient.queryHomeEnvironmentData.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/home/environment')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          temperature: 72.5,
          humidity: 45.2,
          feelsLike: 74.1,
          comfortLevel: 'comfortable',
          humidityLevel: 'normal',
          timestamp: '2025-01-01T10:00:00Z',
          source: 'influxdb'
        },
        responseTime: expect.any(Number)
      });

      expect(influxDBClient.queryHomeEnvironmentData).toHaveBeenCalledWith(1, 1);
    });

    it('should return null data when no data available', async () => {
      influxDBClient.queryHomeEnvironmentData.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/home/environment')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          temperature: null,
          humidity: null,
          feelsLike: null,
          comfortLevel: 'unknown',
          humidityLevel: 'unknown',
          timestamp: expect.any(String),
          source: 'influxdb'
        },
        message: 'No home environment data available',
        responseTime: expect.any(Number)
      });
    });

    it('should handle errors gracefully', async () => {
      influxDBClient.queryHomeEnvironmentData.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/home/environment')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve home environment data',
        responseTime: expect.any(Number)
      });
    });

    it('should calculate comfort levels correctly', async () => {
      const testCases = [
        { temp: 72, humidity: 45, expectedComfort: 'comfortable', expectedHumidity: 'normal' },
        { temp: 85, humidity: 45, expectedComfort: 'hot', expectedHumidity: 'normal' },
        { temp: 65, humidity: 45, expectedComfort: 'cold', expectedHumidity: 'normal' },
        { temp: 72, humidity: 70, expectedComfort: 'humid', expectedHumidity: 'high' },
        { temp: 72, humidity: 25, expectedComfort: 'dry', expectedHumidity: 'low' }
      ];

      for (const testCase of testCases) {
        const mockData = [{
          timestamp: '2025-01-01T10:00:00Z',
          temperature: testCase.temp,
          humidity: testCase.humidity,
          feelsLike: testCase.temp + 2
        }];

        influxDBClient.queryHomeEnvironmentData.mockResolvedValue(mockData);

        const response = await request(app)
          .get('/api/home/environment')
          .expect(200);

        expect(response.body.data.comfortLevel).toBe(testCase.expectedComfort);
        expect(response.body.data.humidityLevel).toBe(testCase.expectedHumidity);
      }
    });
  });

  describe('GET /api/home/timeseries', () => {
    it('should return time series data with default hours', async () => {
      const mockData = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          temperature: 72.5,
          humidity: 45.2,
          feelsLike: 74.1
        },
        {
          timestamp: '2025-01-01T11:00:00Z',
          temperature: 73.0,
          humidity: 46.0,
          feelsLike: 74.8
        }
      ];

      influxDBClient.queryHomeEnvironmentData.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/home/timeseries')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockData,
        hours: 24,
        count: 2,
        limit: 1000,
        source: 'influxdb',
        responseTime: expect.any(Number)
      });

      expect(influxDBClient.queryHomeEnvironmentData).toHaveBeenCalledWith(24, 1000);
    });

    it('should accept custom hours and limit parameters', async () => {
      const mockData = [];
      influxDBClient.queryHomeEnvironmentData.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/home/timeseries?hours=6&limit=500')
        .expect(200);

      expect(influxDBClient.queryHomeEnvironmentData).toHaveBeenCalledWith(6, 500);
      expect(response.body.hours).toBe(6);
      expect(response.body.limit).toBe(500);
    });

    it('should handle errors gracefully', async () => {
      influxDBClient.queryHomeEnvironmentData.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get('/api/home/timeseries')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve home environment time series data',
        responseTime: expect.any(Number)
      });
    });
  });

  describe('GET /api/home/timeseries/stats', () => {
    it('should return statistics data', async () => {
      const mockStats = {
        temperature: { min: 70.0, max: 80.0, avg: 75.0 },
        humidity: { min: 40.0, max: 60.0, avg: 50.0 },
        feelsLike: { min: 72.0, max: 82.0, avg: 77.0 }
      };

      influxDBClient.getHomeEnvironmentStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/home/timeseries/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        stats: mockStats,
        hours: 24,
        source: 'influxdb',
        responseTime: expect.any(Number)
      });

      expect(influxDBClient.getHomeEnvironmentStats).toHaveBeenCalledWith(24);
    });

    it('should return null stats when no data available', async () => {
      influxDBClient.getHomeEnvironmentStats.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/home/timeseries/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        stats: {
          temperature: { min: null, max: null, avg: null },
          humidity: { min: null, max: null, avg: null },
          feelsLike: { min: null, max: null, avg: null }
        },
        hours: 24,
        message: 'No home environment statistics available',
        responseTime: expect.any(Number)
      });
    });

    it('should accept custom hours parameter', async () => {
      const mockStats = {
        temperature: { min: 70.0, max: 80.0, avg: 75.0 },
        humidity: { min: 40.0, max: 60.0, avg: 50.0 },
        feelsLike: { min: 72.0, max: 82.0, avg: 77.0 }
      };

      influxDBClient.getHomeEnvironmentStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/home/timeseries/stats?hours=6')
        .expect(200);

      expect(influxDBClient.getHomeEnvironmentStats).toHaveBeenCalledWith(6);
      expect(response.body.hours).toBe(6);
    });

    it('should handle errors gracefully', async () => {
      influxDBClient.getHomeEnvironmentStats.mockRejectedValue(new Error('Stats failed'));

      const response = await request(app)
        .get('/api/home/timeseries/stats')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve home environment statistics',
        responseTime: expect.any(Number)
      });
    });
  });

  describe('GET /api/home/comfort', () => {
    it('should return comfort analysis', async () => {
      const mockData = [
        { timestamp: '2025-01-01T10:00:00Z', temperature: 72, humidity: 45, feelsLike: 74 },
        { timestamp: '2025-01-01T11:00:00Z', temperature: 85, humidity: 45, feelsLike: 87 },
        { timestamp: '2025-01-01T12:00:00Z', temperature: 65, humidity: 45, feelsLike: 67 }
      ];

      influxDBClient.queryHomeEnvironmentData.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/home/comfort')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        analysis: {
          overallComfort: 'hot',
          comfortDistribution: {
            comfortable: { count: 1, percentage: 33 },
            hot: { count: 1, percentage: 33 },
            cold: { count: 1, percentage: 33 },
            humid: { count: 0, percentage: 0 },
            dry: { count: 0, percentage: 0 },
            marginal: { count: 0, percentage: 0 },
            unknown: { count: 0, percentage: 0 }
          },
          recommendations: [],
          averageComfort: 'hot'
        },
        hours: 24,
        dataPoints: 3,
        source: 'influxdb',
        responseTime: expect.any(Number)
      });
    });

    it('should return recommendations for problematic conditions', async () => {
      const mockData = [
        { timestamp: '2025-01-01T10:00:00Z', temperature: 85, humidity: 45, feelsLike: 87 },
        { timestamp: '2025-01-01T11:00:00Z', temperature: 87, humidity: 45, feelsLike: 89 },
        { timestamp: '2025-01-01T12:00:00Z', temperature: 86, humidity: 45, feelsLike: 88 },
        { timestamp: '2025-01-01T13:00:00Z', temperature: 88, humidity: 45, feelsLike: 90 }
      ];

      influxDBClient.queryHomeEnvironmentData.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/home/comfort')
        .expect(200);

      expect(response.body.analysis.recommendations).toContain('Consider reducing temperature or improving ventilation');
    });

    it('should return null analysis when no data available', async () => {
      influxDBClient.queryHomeEnvironmentData.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/home/comfort')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        analysis: {
          overallComfort: 'unknown',
          comfortDistribution: {},
          recommendations: [],
          averageComfort: 'unknown'
        },
        hours: 24,
        message: 'No data available for comfort analysis',
        responseTime: expect.any(Number)
      });
    });

    it('should handle errors gracefully', async () => {
      influxDBClient.queryHomeEnvironmentData.mockRejectedValue(new Error('Analysis failed'));

      const response = await request(app)
        .get('/api/home/comfort')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Internal server error',
        message: 'Failed to analyze comfort levels',
        responseTime: expect.any(Number)
      });
    });
  });
});
