/**
 * Home Environment Integration Tests
 * Tests the complete home environment data flow from API to frontend
 */

const request = require('supertest');
const express = require('express');

// Mock InfluxDB client for integration tests
jest.mock('../../src/domains/monitoring/services/influxdb-client', () => ({
  influxDBClient: {
    queryHomeEnvironmentData: jest.fn(),
    getHomeEnvironmentStats: jest.fn(),
    isConnected: true
  }
}));

const { influxDBClient } = require('../../src/domains/monitoring/services/influxdb-client');
const homeRoutes = require('../../src/routes/homeRoutes');

describe('Home Environment Integration', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/home', homeRoutes);
  });

  describe('Complete Data Flow', () => {
    it('should handle complete home environment data flow', async () => {
      // Mock InfluxDB data
      const mockTimeSeriesData = [
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
        },
        {
          timestamp: '2025-01-01T12:00:00Z',
          temperature: 74.5,
          humidity: 47.5,
          feelsLike: 76.2
        }
      ];

      const mockStats = {
        temperature: { min: 72.5, max: 74.5, avg: 73.3 },
        humidity: { min: 45.2, max: 47.5, avg: 46.2 },
        feelsLike: { min: 74.1, max: 76.2, avg: 75.0 }
      };

      // Setup mocks
      influxDBClient.queryHomeEnvironmentData
        .mockResolvedValueOnce([mockTimeSeriesData[2]]) // Current data
        .mockResolvedValueOnce(mockTimeSeriesData); // Time series data

      influxDBClient.getHomeEnvironmentStats.mockResolvedValue(mockStats);

      // Test current environment endpoint
      const currentResponse = await request(app)
        .get('/api/home/environment')
        .expect(200);

      expect(currentResponse.body.success).toBe(true);
      expect(currentResponse.body.data.temperature).toBe(74.5);
      expect(currentResponse.body.data.comfortLevel).toBe('comfortable');

      // Test time series endpoint
      const timeSeriesResponse = await request(app)
        .get('/api/home/timeseries?hours=24')
        .expect(200);

      expect(timeSeriesResponse.body.success).toBe(true);
      expect(timeSeriesResponse.body.data).toHaveLength(3);
      expect(timeSeriesResponse.body.count).toBe(3);

      // Test statistics endpoint
      const statsResponse = await request(app)
        .get('/api/home/timeseries/stats?hours=24')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.stats.temperature.avg).toBe(73.3);
      expect(statsResponse.body.stats.humidity.avg).toBe(46.2);

      // Test comfort analysis endpoint
      const comfortResponse = await request(app)
        .get('/api/home/comfort?hours=24')
        .expect(200);

      expect(comfortResponse.body.success).toBe(true);
      expect(comfortResponse.body.analysis.overallComfort).toBe('comfortable');
      expect(comfortResponse.body.dataPoints).toBe(3);
    });

    it('should handle edge cases and error conditions', async () => {
      // Test with no data
      influxDBClient.queryHomeEnvironmentData.mockResolvedValue([]);
      influxDBClient.getHomeEnvironmentStats.mockResolvedValue(null);

      const currentResponse = await request(app)
        .get('/api/home/environment')
        .expect(200);

      expect(currentResponse.body.data.temperature).toBeNull();
      expect(currentResponse.body.data.comfortLevel).toBe('unknown');

      const statsResponse = await request(app)
        .get('/api/home/timeseries/stats')
        .expect(200);

      expect(statsResponse.body.stats.temperature.min).toBeNull();

      const comfortResponse = await request(app)
        .get('/api/home/comfort')
        .expect(200);

      expect(comfortResponse.body.analysis.overallComfort).toBe('unknown');

      // Test with database errors
      influxDBClient.queryHomeEnvironmentData.mockRejectedValue(new Error('Database connection failed'));

      const errorResponse = await request(app)
        .get('/api/home/environment')
        .expect(500);

      expect(errorResponse.body.success).toBe(false);
      expect(errorResponse.body.error).toBe('Internal server error');
    });

    it('should handle various comfort level scenarios', async () => {
      const testScenarios = [
        {
          name: 'Hot and Humid',
          data: [
            { timestamp: '2025-01-01T10:00:00Z', temperature: 85, humidity: 70, feelsLike: 90 },
            { timestamp: '2025-01-01T11:00:00Z', temperature: 87, humidity: 72, feelsLike: 92 },
            { timestamp: '2025-01-01T12:00:00Z', temperature: 86, humidity: 71, feelsLike: 91 }
          ],
          expectedComfort: 'hot',
          expectedRecommendations: ['Consider reducing temperature or improving ventilation']
        },
        {
          name: 'Cold Conditions',
          data: [
            { timestamp: '2025-01-01T10:00:00Z', temperature: 65, humidity: 45, feelsLike: 67 },
            { timestamp: '2025-01-01T11:00:00Z', temperature: 63, humidity: 47, feelsLike: 65 },
            { timestamp: '2025-01-01T12:00:00Z', temperature: 64, humidity: 46, feelsLike: 66 }
          ],
          expectedComfort: 'cold',
          expectedRecommendations: ['Consider increasing temperature or adding insulation']
        },
        {
          name: 'Dry Conditions',
          data: [
            { timestamp: '2025-01-01T10:00:00Z', temperature: 72, humidity: 25, feelsLike: 74 },
            { timestamp: '2025-01-01T11:00:00Z', temperature: 73, humidity: 27, feelsLike: 75 },
            { timestamp: '2025-01-01T12:00:00Z', temperature: 71, humidity: 26, feelsLike: 73 }
          ],
          expectedComfort: 'dry',
          expectedRecommendations: ['Consider using a humidifier to increase moisture levels']
        }
      ];

      for (const scenario of testScenarios) {
        influxDBClient.queryHomeEnvironmentData.mockResolvedValue(scenario.data);

        const response = await request(app)
          .get('/api/home/comfort?hours=24')
          .expect(200);

        expect(response.body.analysis.overallComfort).toBe(scenario.expectedComfort);
        
        if (scenario.expectedRecommendations.length > 0) {
          expect(response.body.analysis.recommendations).toEqual(
            expect.arrayContaining(scenario.expectedRecommendations)
          );
        }
      }
    });

    it('should handle parameter validation', async () => {
      influxDBClient.queryHomeEnvironmentData.mockResolvedValue([]);

      // Test with invalid hours parameter
      const response1 = await request(app)
        .get('/api/home/timeseries?hours=invalid')
        .expect(200);

      expect(influxDBClient.queryHomeEnvironmentData).toHaveBeenCalledWith(NaN, 1000);

      // Test with very large hours parameter
      const response2 = await request(app)
        .get('/api/home/timeseries?hours=999999')
        .expect(200);

      expect(influxDBClient.queryHomeEnvironmentData).toHaveBeenCalledWith(999999, 1000);

      // Test with custom limit
      const response3 = await request(app)
        .get('/api/home/timeseries?hours=6&limit=100')
        .expect(200);

      expect(influxDBClient.queryHomeEnvironmentData).toHaveBeenCalledWith(6, 100);
    });

    it('should maintain data consistency across endpoints', async () => {
      const mockData = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          temperature: 72.5,
          humidity: 45.2,
          feelsLike: 74.1
        }
      ];

      influxDBClient.queryHomeEnvironmentData.mockResolvedValue(mockData);

      // Test that all endpoints return consistent data
      const [currentResponse, timeSeriesResponse, comfortResponse] = await Promise.all([
        request(app).get('/api/home/environment'),
        request(app).get('/api/home/timeseries?hours=1'),
        request(app).get('/api/home/comfort?hours=1')
      ]);

      expect(currentResponse.body.success).toBe(true);
      expect(timeSeriesResponse.body.success).toBe(true);
      expect(comfortResponse.body.success).toBe(true);

      // Verify data consistency
      expect(currentResponse.body.data.temperature).toBe(72.5);
      expect(timeSeriesResponse.body.data[0].temperature).toBe(72.5);
      expect(comfortResponse.body.dataPoints).toBe(1);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      const mockData = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          temperature: 72.5,
          humidity: 45.2,
          feelsLike: 74.1
        }
      ];

      influxDBClient.queryHomeEnvironmentData.mockResolvedValue(mockData);

      // Make multiple concurrent requests
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/home/environment')
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // InfluxDB should be called for each request
      expect(influxDBClient.queryHomeEnvironmentData).toHaveBeenCalledTimes(10);
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Simulate slow database response
      influxDBClient.queryHomeEnvironmentData.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/home/environment')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeGreaterThan(90); // Should take at least 90ms
      expect(response.body.success).toBe(true);
    });
  });
});
