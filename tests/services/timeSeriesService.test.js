/**
 * Time Series Service Tests
 * Tests for in-memory time series data management
 */

const timeSeriesService = require('../../src/services/timeSeriesService');

describe('TimeSeriesService', () => {
  let service;

  beforeEach(() => {
    service = timeSeriesService;
    // Clear any existing data
    if (service.clearData) {
      service.clearData();
    }
  });

  afterEach(() => {
    // Clear data after each test
    if (service.clearData) {
      service.clearData();
    }
  });

  describe('addDataPoint', () => {
    test('should add data points correctly', () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 2838,
        waterTemp: 86,
        cellVoltage: 23.33,
        cellTemp: 75,
        airTemp: 89,
        pumpStatus: true
      };

      service.addDataPoint(dataPoint);
      const dataPoints = service.getDataPoints();

      expect(dataPoints).toHaveLength(1);
      expect(dataPoints[0]).toEqual(dataPoint);
    });

    test('should limit data points to maxPoints', () => {
      // Clear existing data
      service.clearData();

      // Add more than the default maxPoints (1440)
      for (let i = 0; i < 1450; i++) {
        const dataPoint = {
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          saltInstant: 2800 + i,
          waterTemp: 85 + (i % 5),
          cellVoltage: 23 + (i % 2),
          cellTemp: 75 + (i % 3),
          airTemp: 88 + (i % 4),
          pumpStatus: i % 2 === 0
        };
        service.addDataPoint(dataPoint);
      }

      const dataPoints = service.getDataPoints();
      expect(dataPoints).toHaveLength(1440); // Default maxPoints
      expect(dataPoints[0].saltInstant).toBe(2810); // Should be the 10th point
    });

    test('should handle duplicate timestamps', () => {
      const timestamp = new Date().toISOString();
      const dataPoint1 = {
        timestamp,
        saltInstant: 2838,
        waterTemp: 86
      };
      const dataPoint2 = {
        timestamp,
        saltInstant: 2840,
        waterTemp: 87
      };

      service.addDataPoint(dataPoint1);
      service.addDataPoint(dataPoint2);

      const dataPoints = service.getDataPoints();
      expect(dataPoints).toHaveLength(1);
      expect(dataPoints[0].saltInstant).toBe(2838); // Should use the first occurrence
    });

    test('should sort data points chronologically', () => {
      const now = new Date();
      const dataPoint1 = {
        timestamp: new Date(now.getTime() + 2000).toISOString(),
        saltInstant: 2838
      };
      const dataPoint2 = {
        timestamp: new Date(now.getTime() + 1000).toISOString(),
        saltInstant: 2840
      };

      service.addDataPoint(dataPoint1);
      service.addDataPoint(dataPoint2);

      const dataPoints = service.getDataPoints();
      expect(dataPoints).toHaveLength(2);
      expect(new Date(dataPoints[0].timestamp).getTime()).toBeLessThan(
        new Date(dataPoints[1].timestamp).getTime()
      );
    });
  });

  describe('getDataPoints', () => {
    test('should return empty array when no data', () => {
      const dataPoints = service.getDataPoints();
      expect(dataPoints).toEqual([]);
    });

    test('should return all data points', () => {
      const dataPoint1 = {
        timestamp: new Date().toISOString(),
        saltInstant: 2838
      };
      const dataPoint2 = {
        timestamp: new Date(Date.now() + 1000).toISOString(),
        saltInstant: 2840
      };

      service.addDataPoint(dataPoint1);
      service.addDataPoint(dataPoint2);

      const dataPoints = service.getDataPoints();
      expect(dataPoints).toHaveLength(2);
    });

    test('should get data points for specified hours', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

      const dataPoint1 = { timestamp: now.toISOString(), saltInstant: 2838 };
      const dataPoint2 = { timestamp: oneHourAgo.toISOString(), saltInstant: 2840 };
      const dataPoint3 = { timestamp: twoHoursAgo.toISOString(), saltInstant: 2842 };
      const dataPoint4 = { timestamp: threeHoursAgo.toISOString(), saltInstant: 2844 };

      service.addDataPoint(dataPoint1);
      service.addDataPoint(dataPoint2);
      service.addDataPoint(dataPoint3);
      service.addDataPoint(dataPoint4);

      const recentData = service.getDataPoints(2); // Last 2 hours
      expect(recentData).toHaveLength(2);
      expect(recentData[0].saltInstant).toBe(2840); // Oldest first (chronological order)
      expect(recentData[1].saltInstant).toBe(2838); // Newest last
    });
  });

  describe('getLatestData', () => {
    test('should return null when no data', () => {
      const latestData = service.getLatestData();
      expect(latestData).toBeNull();
    });

    test('should return the most recent data point', () => {
      const now = new Date();
      const dataPoint1 = {
        timestamp: new Date(now.getTime() - 1000).toISOString(),
        saltInstant: 2838
      };
      const dataPoint2 = {
        timestamp: now.toISOString(),
        saltInstant: 2840
      };

      service.addDataPoint(dataPoint1);
      service.addDataPoint(dataPoint2);

      const latestData = service.getLatestData();
      expect(latestData.saltInstant).toBe(2840);
    });
  });

  describe('getStatistics', () => {
    test('should return statistics correctly', () => {
      const now = new Date();
      const dataPoint1 = {
        timestamp: new Date(now.getTime() - 2000).toISOString(),
        saltInstant: 2838,
        waterTemp: 86
      };
      const dataPoint2 = {
        timestamp: new Date(now.getTime() - 1000).toISOString(),
        saltInstant: 2840,
        waterTemp: 87
      };
      const dataPoint3 = {
        timestamp: now.toISOString(),
        saltInstant: 2842,
        waterTemp: 88
      };

      service.addDataPoint(dataPoint1);
      service.addDataPoint(dataPoint2);
      service.addDataPoint(dataPoint3);

      const stats = service.getStats();
      expect(stats.totalPoints).toBe(3);
      expect(stats.oldestTimestamp.toISOString()).toBe(dataPoint1.timestamp);
      expect(stats.newestTimestamp.toISOString()).toBe(dataPoint3.timestamp);
    });

    test('should handle empty data', () => {
      const stats = service.getStats();
      expect(stats.totalPoints).toBe(0);
      expect(stats.oldestTimestamp).toBeNull();
      expect(stats.newestTimestamp).toBeNull();
    });
  });

  describe('clearData', () => {
    test('should clear all data', () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 2838
      };

      service.addDataPoint(dataPoint);
      expect(service.getDataPoints()).toHaveLength(1);

      service.clearData();
      expect(service.getDataPoints()).toHaveLength(0);
    });
  });

  describe('Data Validation', () => {
    test('should handle null values in data points', () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: null,
        waterTemp: null,
        cellVoltage: 23.33,
        cellTemp: null,
        airTemp: 89,
        pumpStatus: true
      };

      service.addDataPoint(dataPoint);
      const dataPoints = service.getDataPoints();

      expect(dataPoints).toHaveLength(1);
      expect(dataPoints[0].saltInstant).toBeNull();
      expect(dataPoints[0].waterTemp).toBeNull();
      expect(dataPoints[0].cellVoltage).toBe(23.33);
    });

    test('should handle missing fields', () => {
      const dataPoint = {
        timestamp: new Date().toISOString(),
        saltInstant: 2838
        // Missing other fields
      };

      service.addDataPoint(dataPoint);
      const dataPoints = service.getDataPoints();

      expect(dataPoints).toHaveLength(1);
      expect(dataPoints[0].saltInstant).toBe(2838);
      expect(dataPoints[0].waterTemp).toBeUndefined();
    });
  });

  describe('Performance', () => {
    test('should handle large datasets efficiently', () => {
      const startTime = Date.now();

      // Add 1000 data points
      for (let i = 0; i < 1000; i++) {
        const dataPoint = {
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          saltInstant: 2800 + (i % 100),
          waterTemp: 85 + (i % 5),
          cellVoltage: 23 + (i % 2),
          cellTemp: 75 + (i % 3),
          airTemp: 88 + (i % 4),
          pumpStatus: i % 2 === 0
        };
        service.addDataPoint(dataPoint);
      }

      const endTime = Date.now();
      const dataPoints = service.getDataPoints();

      expect(dataPoints).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should maintain performance with frequent updates', () => {
      const startTime = Date.now();

      // Simulate frequent updates
      for (let i = 0; i < 100; i++) {
        const dataPoint = {
          timestamp: new Date().toISOString(),
          saltInstant: 2800 + i,
          waterTemp: 85 + (i % 5)
        };
        service.addDataPoint(dataPoint);

        // Get data points frequently
        service.getDataPoints();
        service.getLatestData();
        service.getStats();
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
