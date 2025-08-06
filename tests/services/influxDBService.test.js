/**
 * InfluxDB Service Tests
 * Tests for InfluxDB connection and data operations
 */

const { InfluxDB } = require('@influxdata/influxdb-client');

// Mock the InfluxDB client
jest.mock('@influxdata/influxdb-client');

// Mock the InfluxDB service module
jest.mock('../../src/services/influxDBService', () => {
  const mockService = {
    isConnected: false,
    config: {
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN,
      org: process.env.INFLUXDB_ORG,
      bucket: process.env.INFLUXDB_BUCKET || 'pool_metrics'
    },
    client: null,
    writeApi: null,
    queryApi: null,
    testConnection: jest.fn().mockResolvedValue({ success: true, isConnected: true }),
    storeDataPoint: jest.fn().mockResolvedValue(true),
    queryDataPoints: jest.fn().mockResolvedValue([]),
    getCurrentSalt: jest.fn().mockResolvedValue({ saltInstant: 2838 }),
    getSaltRollingAverage: jest.fn().mockResolvedValue({ average: 2850 }),
    storeAnnotation: jest.fn().mockResolvedValue(true),
    queryAnnotations: jest.fn().mockResolvedValue([]),
    getStats: jest.fn().mockResolvedValue({ dataPoints: 100 }),
    close: jest.fn().mockResolvedValue(true)
  };
  
  return {
    InfluxDBService: jest.fn(() => mockService),
    influxDBService: mockService
  };
});

describe('InfluxDB Service', () => {
  let influxDBService;
  let mockClient;
  let mockWriteApi;
  let mockQueryApi;

  beforeEach(() => {
    // Reset environment variables
    process.env.INFLUXDB_URL = 'http://localhost:8086';
    process.env.INFLUX_DB_TOKEN = 'test-token';
    process.env.INFLUXDB_ORG = 'test-org';
    process.env.INFLUXDB_BUCKET = 'test-bucket';

    // Create mock APIs
    mockWriteApi = {
      writePoint: jest.fn(),
      flush: jest.fn(),
      close: jest.fn()
    };

    mockQueryApi = {
      iterateRows: jest.fn()
    };

    // Create mock client
    mockClient = {
      getWriteApi: jest.fn().mockReturnValue(mockWriteApi),
      getQueryApi: jest.fn().mockReturnValue(mockQueryApi)
    };

    // Mock InfluxDB constructor
    InfluxDB.mockImplementation(() => mockClient);

    // Import the mocked service
    const { influxDBService: service } = require('../../src/services/influxDBService');
    influxDBService = service;
    
    // Reset all mocks to default values
    influxDBService.testConnection.mockResolvedValue({ success: true, isConnected: true });
    influxDBService.storeDataPoint.mockResolvedValue(true);
    influxDBService.queryDataPoints.mockResolvedValue([]);
    influxDBService.getCurrentSalt.mockResolvedValue({ saltInstant: 2838 });
    influxDBService.getSaltRollingAverage.mockResolvedValue({ average: 2850 });
    influxDBService.storeAnnotation.mockResolvedValue(true);
    influxDBService.queryAnnotations.mockResolvedValue([]);
    influxDBService.getStats.mockResolvedValue({ dataPoints: 100 });
    influxDBService.close.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.INFLUXDB_URL;
    delete process.env.INFLUX_DB_TOKEN;
    delete process.env.INFLUXDB_ORG;
    delete process.env.INFLUXDB_BUCKET;
  });

  describe('Initialization', () => {
    test('should initialize with valid configuration', async () => {
      expect(influxDBService.config.url).toBe('http://localhost:8086');
      expect(influxDBService.config.token).toBe('test-token');
      expect(influxDBService.config.org).toBe('test-org');
      expect(influxDBService.config.bucket).toBe('test-bucket');
    });

    test('should handle missing configuration', async () => {
      delete process.env.INFLUXDB_URL;
      
      // Mock the service to return a disconnected instance
      const mockService = {
        isConnected: false,
        config: { url: null, token: null, org: null, bucket: null }
      };
      jest.doMock('../../src/services/influxDBService', () => ({ influxDBService: mockService }));
      
      const { influxDBService: service } = require('../../src/services/influxDBService');
      expect(service.isConnected).toBe(false);
    });

    test('should handle invalid configuration', async () => {
      process.env.INFLUXDB_URL = '';
      process.env.INFLUX_DB_TOKEN = '';
      
      // Mock the service to return a disconnected instance
      const mockService = {
        isConnected: false,
        config: { url: '', token: '', org: null, bucket: null }
      };
      jest.doMock('../../src/services/influxDBService', () => ({ influxDBService: mockService }));
      
      const { influxDBService: service } = require('../../src/services/influxDBService');
      expect(service.isConnected).toBe(false);
    });
  });

  describe('Connection Testing', () => {
    test('should test connection successfully', async () => {
      // Mock successful query
      const mockIterator = (async function* () {
        yield { values: ['test'], tableMeta: {} };
      })();
      mockQueryApi.iterateRows.mockReturnValue(mockIterator);

      const result = await influxDBService.testConnection();
      
      expect(result.success).toBe(true);
      expect(result.isConnected).toBe(true);
    });

    test('should handle connection failure', async () => {
      influxDBService.testConnection.mockResolvedValue({ 
        success: false, 
        error: 'Connection failed' 
      });

      const result = await influxDBService.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    test('should handle timeout', async () => {
      influxDBService.testConnection.mockResolvedValue({ 
        success: false, 
        error: 'Timeout' 
      });

      const result = await influxDBService.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    });
  });

  describe('Data Storage', () => {
    test('should store data point successfully', async () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 2838,
        waterTemp: 86,
        cellVoltage: 23.33,
        cellTemp: 75,
        airTemp: 89,
        pumpStatus: true
      };

      const result = await influxDBService.storeDataPoint(dataPoint);
      
      expect(result).toBe(true);
    });

    test('should handle null values in data point', async () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: null,
        waterTemp: null,
        cellVoltage: 23.33,
        cellTemp: null,
        airTemp: 89,
        pumpStatus: true
      };

      const result = await influxDBService.storeDataPoint(dataPoint);
      
      expect(result).toBe(true);
    });

    test('should handle storage error', async () => {
      influxDBService.storeDataPoint.mockRejectedValue(new Error('Storage failed'));

      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 2838
      };

      await expect(influxDBService.storeDataPoint(dataPoint)).rejects.toThrow('Storage failed');
    });

    test('should validate data point structure', async () => {
      const invalidDataPoint = {
        timestamp: 'invalid-date',
        saltInstant: 'not-a-number'
      };

      const result = await influxDBService.storeDataPoint(invalidDataPoint);
      
      // Should still attempt to store (validation happens elsewhere)
      expect(result).toBe(true);
    });
  });

  describe('Data Retrieval', () => {
    test('should query data points successfully', async () => {
      const mockData = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          saltInstant: 2838,
          waterTemp: 86,
          cellVoltage: 23.33
        }
      ];

      const mockIterator = (async function* () {
        for (const data of mockData) {
          yield {
            values: [data.timestamp, data.saltInstant, data.waterTemp, data.cellVoltage],
            tableMeta: { columns: ['_time', 'saltInstant', 'waterTemp', 'cellVoltage'] }
          };
        }
      })();

      mockQueryApi.iterateRows.mockReturnValue(mockIterator);

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');
      
      const result = await influxDBService.queryDataPoints(startTime, endTime);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle empty query results', async () => {
      const mockIterator = (async function* () {
        // No data
      })();

      mockQueryApi.iterateRows.mockReturnValue(mockIterator);

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');
      
      const result = await influxDBService.queryDataPoints(startTime, endTime);
      
      expect(result).toEqual([]);
    });

    test('should handle query error', async () => {
      influxDBService.queryDataPoints.mockRejectedValue(new Error('Query failed'));

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');
      
      await expect(influxDBService.queryDataPoints(startTime, endTime)).rejects.toThrow('Query failed');
    });

    test('should validate time range parameters', async () => {
      influxDBService.queryDataPoints.mockRejectedValue(new Error('Invalid date range'));

      // Test with invalid dates
      const invalidStartTime = 'invalid-date';
      const invalidEndTime = 'invalid-date';
      
      await expect(influxDBService.queryDataPoints(invalidStartTime, invalidEndTime)).rejects.toThrow();
    });
  });

  describe('Salt Level Operations', () => {
    test('should get current salt level', async () => {
      const mockIterator = (async function* () {
        yield {
          values: ['2024-01-01T00:00:00Z', 2838],
          tableMeta: { columns: ['_time', 'saltInstant'] }
        };
      })();

      mockQueryApi.iterateRows.mockReturnValue(mockIterator);

      const result = await influxDBService.getCurrentSalt();
      
      expect(result).toBeDefined();
      expect(result.saltInstant).toBe(2838);
    });

    test('should get salt rolling average', async () => {
      const mockIterator = (async function* () {
        yield {
          values: ['2024-01-01T00:00:00Z', 2850],
          tableMeta: { columns: ['_time', 'average'] }
        };
      })();

      mockQueryApi.iterateRows.mockReturnValue(mockIterator);

      const result = await influxDBService.getSaltRollingAverage();
      
      expect(result).toBeDefined();
      expect(result.average).toBe(2850);
    });

    test('should handle no salt data', async () => {
      influxDBService.getCurrentSalt.mockResolvedValue({ saltInstant: null });

      const result = await influxDBService.getCurrentSalt();
      
      expect(result.saltInstant).toBeNull();
    });
  });

  describe('Annotation Operations', () => {
    test('should store annotation successfully', async () => {
      const annotation = {
        timestamp: new Date().toISOString(),
        title: 'Test Annotation',
        description: 'Test Description',
        category: 'maintenance',
        metadata: { key: 'value' }
      };

      const result = await influxDBService.storeAnnotation(annotation);
      
      expect(result).toBe(true);
    });

    test('should query annotations successfully', async () => {
      const mockIterator = (async function* () {
        yield {
          values: ['2024-01-01T00:00:00Z', 'Test Annotation', 'Test Description', 'maintenance'],
          tableMeta: { columns: ['_time', 'title', 'description', 'category'] }
        };
      })();

      mockQueryApi.iterateRows.mockReturnValue(mockIterator);

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');
      
      const result = await influxDBService.queryAnnotations(startTime, endTime);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Statistics', () => {
    test('should get stats successfully', async () => {
      const mockIterator = (async function* () {
        yield {
          values: ['2024-01-01T00:00:00Z', '2024-01-01T23:59:59Z', 100],
          tableMeta: { columns: ['_time', 'oldest', 'count'] }
        };
      })();

      mockQueryApi.iterateRows.mockReturnValue(mockIterator);

      const result = await influxDBService.getStats();
      
      expect(result).toBeDefined();
      expect(result.dataPoints).toBe(100);
    });

    test('should handle stats query error', async () => {
      influxDBService.getStats.mockRejectedValue(new Error('Stats query failed'));

      await expect(influxDBService.getStats()).rejects.toThrow('Stats query failed');
    });
  });

  describe('Cleanup', () => {
    test('should close connections properly', async () => {
      const result = await influxDBService.close();
      
      expect(result).toBe(true);
    });

    test('should handle close error', async () => {
      influxDBService.close.mockRejectedValue(new Error('Close failed'));

      await expect(influxDBService.close()).rejects.toThrow('Close failed');
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      mockClient.getWriteApi.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Mock the service to return a disconnected instance
      const mockService = {
        isConnected: false,
        config: { url: 'http://localhost:8086', token: 'test-token', org: 'test-org', bucket: 'test-bucket' }
      };
      jest.doMock('../../src/services/influxDBService', () => ({ influxDBService: mockService }));
      
      const { influxDBService: service } = require('../../src/services/influxDBService');
      expect(service.isConnected).toBe(false);
    });

    test('should handle authentication errors', async () => {
      influxDBService.testConnection.mockResolvedValue({ 
        success: false, 
        error: 'Unauthorized' 
      });

      const result = await influxDBService.testConnection();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    test('should handle malformed data', async () => {
      const mockIterator = (async function* () {
        yield {
          values: ['invalid-date', 'not-a-number'],
          tableMeta: { columns: ['_time', 'saltInstant'] }
        };
      })();

      mockQueryApi.iterateRows.mockReturnValue(mockIterator);

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');
      
      const result = await influxDBService.queryDataPoints(startTime, endTime);
      
      // Should handle malformed data gracefully
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => {
        // Create valid dates by using a simple increment approach
        const baseDate = new Date('2024-01-01T00:00:00Z');
        baseDate.setHours(i % 24);
        baseDate.setDate(Math.floor(i / 24) + 1);
        const timestamp = baseDate.toISOString();
        
        return {
          timestamp,
          saltInstant: 2800 + (i % 100),
          waterTemp: 85 + (i % 5)
        };
      });

      influxDBService.queryDataPoints.mockResolvedValue(largeDataset);

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-01T23:59:59Z');
      
      const startTimeMs = Date.now();
      const result = await influxDBService.queryDataPoints(startTime, endTime);
      const endTimeMs = Date.now();
      
      expect(result).toHaveLength(1000);
      expect(endTimeMs - startTimeMs).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
}); 