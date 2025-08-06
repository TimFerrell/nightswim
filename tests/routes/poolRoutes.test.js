/**
 * Pool Routes Tests
 * Tests for API endpoints with request/response validations
 */

const request = require('supertest');
const express = require('express');

// Mock services
jest.mock('../../src/services/influxDBService');
jest.mock('../../src/services/poolDataService');
jest.mock('../../src/services/timeSeriesService');

const influxDBService = require('../../src/services/influxDBService');
const poolDataService = require('../../src/services/poolDataService');
const timeSeriesService = require('../../src/services/timeSeriesService');

describe('Pool Routes', () => {
  let app;
  let mockInfluxDB;
  let mockPoolData;
  let mockTimeSeries;

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

    mockPoolData = {
      collectPoolData: jest.fn(),
      processPoolData: jest.fn()
    };

    mockTimeSeries = {
      addDataPoint: jest.fn(),
      getDataPoints: jest.fn(),
      getLatestData: jest.fn(),
      clearData: jest.fn()
    };

    // Mock service constructors
    influxDBService.mockImplementation(() => mockInfluxDB);
    poolDataService.mockImplementation(() => mockPoolData);
    timeSeriesService.mockImplementation(() => mockTimeSeries);

    // Import and register routes
    const poolRoutes = require('../../src/routes/poolRoutes');
    app.use('/api/pool', poolRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/pool/data', () => {
    test('should return pool data successfully', async () => {
      const mockData = {
        dashboard: {
          temperature: { actual: 86, target: 88 },
          filter: { status: true },
          pump: { status: true, state: 'Running' }
        },
        chlorinator: {
          salt: { instant: 2838 },
          cell: { voltage: 23.33, current: 5.2, temperature: { value: 75 } }
        },
        weather: {
          temperature: 89,
          humidity: 65
        },
        heater: {
          temperature: { actual: 86, min: 78, max: 92, current: 86 }
        }
      };

      mockTimeSeries.getLatestData.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/pool/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockData);
      expect(response.body.source).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('should handle no data available', async () => {
      mockTimeSeries.getLatestData.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/pool/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toContain('No data available');
    });

    test('should handle service errors', async () => {
      mockTimeSeries.getLatestData.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/pool/data')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service error');
    });

    test('should validate response structure', async () => {
      const mockData = {
        dashboard: { temperature: { actual: 86 } },
        chlorinator: { salt: { instant: 2838 } }
      };

      mockTimeSeries.getLatestData.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/pool/data')
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('source');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.success).toBe('boolean');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('GET /api/pool/timeseries', () => {
    test('should return time series data successfully', async () => {
      const mockData = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          saltInstant: 2838,
          waterTemp: 86,
          cellVoltage: 23.33,
          cellTemp: 75,
          airTemp: 89,
          pumpStatus: true
        }
      ];

      const mockStats = {
        dataPoints: 1,
        oldestTimestamp: '2024-01-01T00:00:00Z',
        newestTimestamp: '2024-01-01T00:00:00Z'
      };

      mockInfluxDB.queryDataPoints.mockResolvedValue(mockData);
      mockInfluxDB.getStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/pool/timeseries?hours=24')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockData);
      expect(response.body.stats).toEqual(mockStats);
    });

    test('should handle missing hours parameter', async () => {
      const response = await request(app)
        .get('/api/pool/timeseries')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('hours parameter is required');
    });

    test('should validate hours parameter', async () => {
      const response = await request(app)
        .get('/api/pool/timeseries?hours=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('hours must be a number');
    });

    test('should handle empty time series data', async () => {
      mockInfluxDB.queryDataPoints.mockResolvedValue([]);
      mockInfluxDB.getStats.mockResolvedValue({ dataPoints: 0 });

      const response = await request(app)
        .get('/api/pool/timeseries?hours=24')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.stats.dataPoints).toBe(0);
    });

    test('should handle service errors', async () => {
      mockInfluxDB.queryDataPoints.mockRejectedValue(new Error('Query failed'));

      const response = await request(app)
        .get('/api/pool/timeseries?hours=24')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query failed');
    });

    test('should validate time range limits', async () => {
      const response = await request(app)
        .get('/api/pool/timeseries?hours=1000')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('hours must be between 1 and 168');
    });
  });

  describe('GET /api/pool/salt-average', () => {
    test('should return salt rolling average successfully', async () => {
      const mockAverage = {
        average: 2850,
        timestamp: '2024-01-01T00:00:00Z'
      };

      mockInfluxDB.getSaltRollingAverage.mockResolvedValue(mockAverage);

      const response = await request(app)
        .get('/api/pool/salt-average')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAverage);
    });

    test('should handle no salt data', async () => {
      mockInfluxDB.getSaltRollingAverage.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/pool/salt-average')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toContain('No salt data available');
    });

    test('should handle service errors', async () => {
      mockInfluxDB.getSaltRollingAverage.mockRejectedValue(new Error('Salt query failed'));

      const response = await request(app)
        .get('/api/pool/salt-average')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Salt query failed');
    });
  });

  describe('POST /api/pool/collect', () => {
    test('should collect pool data successfully', async () => {
      const mockCollectedData = {
        dashboard: { temperature: { actual: 86 } },
        chlorinator: { salt: { instant: 2838 } }
      };

      mockPoolData.collectPoolData.mockResolvedValue(mockCollectedData);
      mockInfluxDB.storeDataPoint.mockResolvedValue(true);
      mockTimeSeries.addDataPoint.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/pool/collect')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCollectedData);
      expect(response.body.stored).toBe(true);
    });

    test('should handle collection failure', async () => {
      mockPoolData.collectPoolData.mockRejectedValue(new Error('Collection failed'));

      const response = await request(app)
        .post('/api/pool/collect')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Collection failed');
    });

    test('should handle storage failure', async () => {
      const mockCollectedData = {
        dashboard: { temperature: { actual: 86 } }
      };

      mockPoolData.collectPoolData.mockResolvedValue(mockCollectedData);
      mockInfluxDB.storeDataPoint.mockRejectedValue(new Error('Storage failed'));

      const response = await request(app)
        .post('/api/pool/collect')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCollectedData);
      expect(response.body.stored).toBe(false);
      expect(response.body.storageError).toContain('Storage failed');
    });

    test('should validate request body if provided', async () => {
      const invalidBody = { invalid: 'data' };

      const response = await request(app)
        .post('/api/pool/collect')
        .send(invalidBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid request body');
    });
  });

  describe('GET /api/pool/status', () => {
    test('should return system status successfully', async () => {
      const mockStatus = {
        influxdb: { connected: true, lastCheck: '2024-01-01T00:00:00Z' },
        hayward: { connected: true, lastCheck: '2024-01-01T00:00:00Z' },
        weather: { connected: true, lastCheck: '2024-01-01T00:00:00Z' },
        lastDataCollection: '2024-01-01T00:00:00Z',
        dataPoints: 100
      };

      mockInfluxDB.testConnection.mockResolvedValue({ success: true });
      mockTimeSeries.getDataPoints.mockResolvedValue(Array(100).fill({}));

      const response = await request(app)
        .get('/api/pool/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
    });

    test('should handle service failures', async () => {
      mockInfluxDB.testConnection.mockResolvedValue({ success: false, error: 'Connection failed' });

      const response = await request(app)
        .get('/api/pool/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status.influxdb.connected).toBe(false);
    });
  });

  describe('DELETE /api/pool/data', () => {
    test('should clear data successfully', async () => {
      mockTimeSeries.clearData.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/pool/data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Data cleared successfully');
    });

    test('should handle clear failure', async () => {
      mockTimeSeries.clearData.mockRejectedValue(new Error('Clear failed'));

      const response = await request(app)
        .delete('/api/pool/data')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Clear failed');
    });
  });

  describe('Request Validation', () => {
    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/pool/timeseries?hours=-1')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('hours must be positive');
    });

    test('should validate request headers', async () => {
      const response = await request(app)
        .get('/api/pool/data')
        .set('Accept', 'text/plain')
        .expect(406);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Accept header must be application/json');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/pool/collect')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON');
    });
  });

  describe('Response Validation', () => {
    test('should include required headers', async () => {
      const response = await request(app)
        .get('/api/pool/data')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['cache-control']).toBeDefined();
    });

    test('should handle CORS headers', async () => {
      const response = await request(app)
        .options('/api/pool/data')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should validate error response structure', async () => {
      mockTimeSeries.getLatestData.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/pool/data')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('Performance Tests', () => {
    test('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(`2024-01-01T${String(i).padStart(2, '0')}:00:00Z`).toISOString(),
        saltInstant: 2800 + (i % 100),
        waterTemp: 85 + (i % 5)
      }));

      mockInfluxDB.queryDataPoints.mockResolvedValue(largeDataset);
      mockInfluxDB.getStats.mockResolvedValue({ dataPoints: 1000 });

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/pool/timeseries?hours=24')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent requests', async () => {
      const mockData = { dashboard: { temperature: { actual: 86 } } };
      mockTimeSeries.getLatestData.mockResolvedValue(mockData);

      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/pool/data')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Security Tests', () => {
    test('should handle SQL injection attempts', async () => {
      const response = await request(app)
        .get('/api/pool/timeseries?hours=1; DROP TABLE data;')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle XSS attempts', async () => {
      const response = await request(app)
        .post('/api/pool/collect')
        .send({ data: '<script>alert("xss")</script>' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle path traversal attempts', async () => {
      const response = await request(app)
        .get('/api/pool/../../../etc/passwd')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
}); 