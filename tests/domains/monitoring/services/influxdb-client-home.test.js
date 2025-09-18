/**
 * InfluxDB Client Home Environment Tests
 * Tests for home environment data querying functionality
 */

const { InfluxDBClient } = require('../../../../src/domains/monitoring/services/influxdb-client');

// Mock InfluxDB client
jest.mock('@influxdata/influxdb-client', () => ({
  InfluxDB: jest.fn(),
  Point: jest.fn().mockImplementation(() => ({
    timestamp: jest.fn().mockReturnThis(),
    floatField: jest.fn().mockReturnThis(),
    booleanField: jest.fn().mockReturnThis(),
    stringField: jest.fn().mockReturnThis(),
    fields: {}
  }))
}));

// Mock config
jest.mock('../../../../src/config', () => ({
  envConfig: {
    getInfluxDBConfig: jest.fn(() => ({
      url: 'https://test.influxdb.com',
      token: 'test-token',
      org: 'test-org',
      bucket: 'test-bucket'
    }))
  }
}));

describe('InfluxDBClient - Home Environment', () => {
  let client;
  let mockQueryApi;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock query API
    mockQueryApi = {
      queryRows: jest.fn()
    };

    // Mock InfluxDB constructor
    const { InfluxDB } = require('@influxdata/influxdb-client');
    InfluxDB.mockImplementation(() => ({
      getWriteApi: jest.fn(),
      getQueryApi: jest.fn().mockReturnValue(mockQueryApi)
    }));

    client = new InfluxDBClient();
    client.isConnected = true;
    client.queryApi = mockQueryApi;
  });

  describe('queryHomeEnvironmentData', () => {
    it('should return empty array when not connected', async () => {
      client.isConnected = false;

      const result = await client.queryHomeEnvironmentData(24);

      expect(result).toEqual([]);
    });

    it('should execute Flux query and return grouped data', async () => {
      const mockData = [
        { _time: '2025-01-01T10:00:00Z', _field: 'Temp (F)', _value: 72.5 },
        { _time: '2025-01-01T10:00:00Z', _field: 'Humidity (%)', _value: 45.2 },
        { _time: '2025-01-01T10:00:00Z', _field: 'Feels-Like (F)', _value: 74.1 },
        { _time: '2025-01-01T11:00:00Z', _field: 'Temp (F)', _value: 73.0 },
        { _time: '2025-01-01T11:00:00Z', _field: 'Humidity (%)', _value: 46.0 },
        { _time: '2025-01-01T11:00:00Z', _field: 'Feels-Like (F)', _value: 74.8 }
      ];

      mockQueryApi.queryRows.mockImplementation((query, callbacks) => {
        mockData.forEach(point => {
          const mockRow = { _time: point._time, _field: point._field, _value: point._value };
          callbacks.next(mockRow, { toObject: () => mockRow });
        });
        callbacks.complete();
        return Promise.resolve();
      });

      const result = await client.queryHomeEnvironmentData(24, 100);

      expect(mockQueryApi.queryRows).toHaveBeenCalledWith(
        expect.stringContaining('pool_metrics'),
        expect.objectContaining({
          next: expect.any(Function),
          error: expect.any(Function),
          complete: expect.any(Function)
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: '2025-01-01T10:00:00Z',
        temperature: 72.5,
        humidity: 45.2,
        feelsLike: 74.1
      });
      expect(result[1]).toEqual({
        timestamp: '2025-01-01T11:00:00Z',
        temperature: 73.0,
        humidity: 46.0,
        feelsLike: 74.8
      });
    });

    it('should handle query errors gracefully', async () => {
      mockQueryApi.queryRows.mockImplementation((query, callbacks) => {
        callbacks.error(new Error('Query failed'));
        return Promise.resolve();
      });

      const result = await client.queryHomeEnvironmentData(24);

      expect(result).toEqual([]);
    });

    it('should handle missing data gracefully', async () => {
      mockQueryApi.queryRows.mockImplementation((query, callbacks) => {
        callbacks.complete();
        return Promise.resolve();
      });

      const result = await client.queryHomeEnvironmentData(24);

      expect(result).toEqual([]);
    });
  });

  describe('getHomeEnvironmentStats', () => {
    it('should return null when not connected', async () => {
      client.isConnected = false;

      const result = await client.getHomeEnvironmentStats(24);

      expect(result).toBeNull();
    });

    it('should calculate statistics from data', async () => {
      const mockData = [
        { timestamp: '2025-01-01T10:00:00Z', temperature: 70.0, humidity: 40.0, feelsLike: 72.0 },
        { timestamp: '2025-01-01T11:00:00Z', temperature: 75.0, humidity: 50.0, feelsLike: 77.0 },
        { timestamp: '2025-01-01T12:00:00Z', temperature: 80.0, humidity: 60.0, feelsLike: 82.0 }
      ];

      // Mock the queryHomeEnvironmentData method
      jest.spyOn(client, 'queryHomeEnvironmentData').mockResolvedValue(mockData);

      const result = await client.getHomeEnvironmentStats(24);

      expect(result).toEqual({
        temperature: { min: 70.0, max: 80.0, avg: 75.0 },
        humidity: { min: 40.0, max: 60.0, avg: 50.0 },
        feelsLike: { min: 72.0, max: 82.0, avg: 77.0 }
      });
    });

    it('should return null when no data available', async () => {
      jest.spyOn(client, 'queryHomeEnvironmentData').mockResolvedValue([]);

      const result = await client.getHomeEnvironmentStats(24);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(client, 'queryHomeEnvironmentData').mockRejectedValue(new Error('Query failed'));

      const result = await client.getHomeEnvironmentStats(24);

      expect(result).toBeNull();
    });
  });

  describe('groupHomeEnvironmentData', () => {
    it('should group data points by timestamp', () => {
      const dataPoints = [
        { timestamp: '2025-01-01T10:00:00Z', field: 'Temp (F)', value: 72.5 },
        { timestamp: '2025-01-01T10:00:00Z', field: 'Humidity (%)', value: 45.2 },
        { timestamp: '2025-01-01T10:00:00Z', field: 'Feels-Like (F)', value: 74.1 },
        { timestamp: '2025-01-01T11:00:00Z', field: 'Temp (F)', value: 73.0 },
        { timestamp: '2025-01-01T11:00:00Z', field: 'Humidity (%)', value: 46.0 },
        { timestamp: '2025-01-01T11:00:00Z', field: 'Feels-Like (F)', value: 74.8 }
      ];

      const result = client.groupHomeEnvironmentData(dataPoints);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        timestamp: '2025-01-01T10:00:00Z',
        temperature: 72.5,
        humidity: 45.2,
        feelsLike: 74.1
      });
      expect(result[1]).toEqual({
        timestamp: '2025-01-01T11:00:00Z',
        temperature: 73.0,
        humidity: 46.0,
        feelsLike: 74.8
      });
    });

    it('should handle missing fields gracefully', () => {
      const dataPoints = [
        { timestamp: '2025-01-01T10:00:00Z', field: 'Temp (F)', value: 72.5 },
        { timestamp: '2025-01-01T10:00:00Z', field: 'Humidity (%)', value: 45.2 }
        // Missing Feels-Like data
      ];

      const result = client.groupHomeEnvironmentData(dataPoints);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        timestamp: '2025-01-01T10:00:00Z',
        temperature: 72.5,
        humidity: 45.2,
        feelsLike: null
      });
    });
  });

  describe('calculateStats', () => {
    it('should calculate min, max, and average', () => {
      const values = [70.0, 75.0, 80.0, 85.0, 90.0];

      const result = client.calculateStats(values);

      expect(result).toEqual({
        min: 70.0,
        max: 90.0,
        avg: 80.0
      });
    });

    it('should handle empty array', () => {
      const result = client.calculateStats([]);

      expect(result).toEqual({
        min: null,
        max: null,
        avg: null
      });
    });

    it('should handle null values', () => {
      const values = [70.0, null, 80.0, null, 90.0];

      const result = client.calculateStats(values);

      expect(result).toEqual({
        min: 70.0,
        max: 90.0,
        avg: 80.0
      });
    });

    it('should round values to 1 decimal place', () => {
      const values = [70.123, 75.456, 80.789];

      const result = client.calculateStats(values);

      expect(result).toEqual({
        min: 70.1,
        max: 80.8,
        avg: 75.5
      });
    });
  });
});
