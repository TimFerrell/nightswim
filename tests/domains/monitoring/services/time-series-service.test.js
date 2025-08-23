/**
 * Tests for new architecture TimeSeriesService
 */

const { timeSeriesService } = require('../../../../src/domains/monitoring');

describe('TimeSeriesService (New Architecture)', () => {
  beforeEach(() => {
    // Clear data before each test
    timeSeriesService.clearData();
  });

  describe('addDataPoint', () => {
    it('should add a data point successfully', async () => {
      const dataPoint = {
        timestamp: '2024-01-01T12:00:00.000Z',
        waterTemp: 78.5,
        saltInstant: 3200
      };

      await timeSeriesService.addDataPoint(dataPoint);
      
      const stats = timeSeriesService.getMemoryStats();
      expect(stats.dataPoints).toBe(1);
    });

    it('should handle data points without timestamps', async () => {
      const dataPoint = {
        waterTemp: 78.5,
        saltInstant: 3200
      };

      // This should return false since timestamp is required
      const result = await timeSeriesService.addDataPoint(dataPoint);
      expect(result).toBe(false);
    });
  });

  describe('getLatestData', () => {
    it('should return null when no data exists', () => {
      const latest = timeSeriesService.getLatestData();
      expect(latest).toBe(null);
    });

    it('should return the latest data point', async () => {
      const dataPoint1 = {
        timestamp: '2024-01-01T12:00:00.000Z',
        waterTemp: 78.5
      };
      const dataPoint2 = {
        timestamp: '2024-01-01T13:00:00.000Z',
        waterTemp: 79.0
      };

      await timeSeriesService.addDataPoint(dataPoint1);
      await timeSeriesService.addDataPoint(dataPoint2);
      
      const latest = timeSeriesService.getLatestData();
      expect(latest.waterTemp).toBe(79.0);
      expect(latest.timestamp).toBe(new Date('2024-01-01T13:00:00.000Z').getTime());
    });
  });

  describe('getMemoryStats', () => {
    it('should return correct memory statistics', async () => {
      const dataPoint = {
        timestamp: '2024-01-01T12:00:00.000Z',
        waterTemp: 78.5
      };

      await timeSeriesService.addDataPoint(dataPoint);
      
      const stats = timeSeriesService.getMemoryStats();
      expect(stats).toHaveProperty('dataPoints');
      expect(stats).toHaveProperty('maxPoints');
      expect(stats.dataPoints).toBe(1);
    });
  });

  describe('clearData', () => {
    it('should clear all data points', async () => {
      const dataPoint = {
        timestamp: '2024-01-01T12:00:00.000Z',
        waterTemp: 78.5
      };

      await timeSeriesService.addDataPoint(dataPoint);
      expect(timeSeriesService.getDataCount()).toBe(1);
      
      timeSeriesService.clearData();
      expect(timeSeriesService.getDataCount()).toBe(0);
    });
  });
});