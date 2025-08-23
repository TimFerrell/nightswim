/**
 * InfluxDB Service Tests
 * Tests for InfluxDB connection and data operations
 */

const { InfluxDBService, influxDBService } = require('../../src/services/influxDBService');

// Mock InfluxDB client
jest.mock('@influxdata/influxdb-client', () => ({
  InfluxDB: jest.fn(),
  Point: jest.fn().mockImplementation(() => ({
    timestamp: jest.fn().mockReturnThis(),
    floatField: jest.fn().mockReturnThis(),
    booleanField: jest.fn().mockReturnThis(),
    stringField: jest.fn().mockReturnThis(),
    fields: {}
  })),
  WriteApi: jest.fn(),
  QueryApi: jest.fn()
}));

describe('InfluxDBService', () => {
  let service;
  let mockWriteApi;
  let mockQueryApi;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock write API
    mockWriteApi = {
      writePoint: jest.fn(),
      flush: jest.fn(),
      close: jest.fn()
    };

    // Create mock query API
    mockQueryApi = {
      iterateRows: jest.fn()
    };

    // Mock InfluxDB constructor
    const { InfluxDB } = require('@influxdata/influxdb-client');
    InfluxDB.mockImplementation(() => ({
      getWriteApi: jest.fn().mockReturnValue(mockWriteApi),
      getQueryApi: jest.fn().mockReturnValue(mockQueryApi)
    }));

    service = new InfluxDBService();
  });

  describe('storeDataPoint', () => {
    beforeEach(async () => {
      // Mock successful connection
      service.isConnected = true;
    });

    it('should successfully store a data point', async () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 3000,
        cellTemp: 85.5,
        cellVoltage: 25.5,
        waterTemp: 82.0,
        airTemp: 75.0,
        pumpStatus: true,
        weatherTemp: 76.0,
        weatherHumidity: 65.0
      };

      // Mock successful write operations
      mockWriteApi.writePoint.mockResolvedValue();
      mockWriteApi.flush.mockResolvedValue();

      const result = await service.storeDataPoint(dataPoint);

      expect(result).toBe(true);
      expect(mockWriteApi.writePoint).toHaveBeenCalledTimes(1);
      expect(mockWriteApi.flush).toHaveBeenCalledTimes(1);
    });

    it('should handle missing timestamp gracefully', async () => {
      const dataPoint = {
        saltInstant: 3000,
        cellTemp: 85.5
      };

      const result = await service.storeDataPoint(dataPoint);

      expect(result).toBe(false);
      expect(mockWriteApi.writePoint).not.toHaveBeenCalled();
    });

    it('should handle null values correctly', async () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: null,
        cellTemp: null,
        waterTemp: null,
        pumpStatus: null
      };

      // Mock successful write operations
      mockWriteApi.writePoint.mockResolvedValue();
      mockWriteApi.flush.mockResolvedValue();

      const result = await service.storeDataPoint(dataPoint);

      expect(result).toBe(true);
      expect(mockWriteApi.writePoint).toHaveBeenCalledTimes(1);
    });

    it('should handle write API errors', async () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 3000
      };

      // Mock write error
      mockWriteApi.writePoint.mockRejectedValue(new Error('Write failed'));

      const result = await service.storeDataPoint(dataPoint);

      expect(result).toBe(false);
    });

    it('should handle flush errors', async () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 3000
      };

      // Mock successful write but failed flush
      mockWriteApi.writePoint.mockResolvedValue();
      mockWriteApi.flush.mockRejectedValue(new Error('Flush failed'));

      const result = await service.storeDataPoint(dataPoint);

      expect(result).toBe(false);
    });

    it('should not attempt storage when not connected', async () => {
      service.isConnected = false;

      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 3000
      };

      const result = await service.storeDataPoint(dataPoint);

      expect(result).toBe(false);
      expect(mockWriteApi.writePoint).not.toHaveBeenCalled();
    });
  });

  describe('queryDataPoints', () => {
    beforeEach(async () => {
      // Mock successful connection
      service.isConnected = true;
    });

    it('should return empty array when not connected', async () => {
      service.isConnected = false;

      const result = await service.queryDataPoints(new Date(), new Date());

      expect(result).toEqual([]);
    });

    it('should handle query errors gracefully', async () => {
      // Mock query error
      mockQueryApi.iterateRows.mockRejectedValue(new Error('Query failed'));

      const result = await service.queryDataPoints(new Date(), new Date());

      expect(result).toEqual([]);
    });
  });

  describe('connection management', () => {
    it('should handle initialization failures', async () => {
      const { InfluxDB } = require('@influxdata/influxdb-client');
      InfluxDB.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const newService = new InfluxDBService();
      const result = await newService.initialize();

      expect(result).toBe(false);
      expect(newService.isConnected).toBe(false);
    });

    it('should close write API on shutdown', async () => {
      service.isConnected = true;
      service.writeApi = mockWriteApi;

      await service.close();

      expect(mockWriteApi.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(influxDBService).toBeInstanceOf(InfluxDBService);
      expect(influxDBService).toBeDefined();
    });
  });
});
