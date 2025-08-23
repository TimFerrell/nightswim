/**
 * Tests for PoolData entity
 */

const { PoolData } = require('../../../../src/domains/pool/entities/pool-data');

describe('PoolData Entity', () => {
  describe('constructor', () => {
    it('should create a valid PoolData instance with timestamp', () => {
      const data = {
        dashboard: { temperature: { actual: 78.5 } },
        chlorinator: { salt: { instant: 3200 }, cell: { voltage: 12.5 } },
        filter: { status: true }
      };

      const poolData = new PoolData(data);

      expect(poolData.dashboard.temperature.actual).toBe(78.5);
      expect(poolData.chlorinator.salt.instant).toBe(3200);
      expect(poolData.filter.status).toBe(true);
      expect(poolData.chlorinator.cell.voltage).toBe(12.5);
      expect(poolData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should use provided timestamp when given', () => {
      const testTimestamp = '2024-01-01T12:00:00.000Z';
      const data = {
        dashboard: { temperature: { actual: 78.5 } },
        timestamp: testTimestamp
      };

      const poolData = new PoolData(data);

      expect(poolData.timestamp).toBe(testTimestamp);
    });
  });

  describe('isValid', () => {
    it('should return true for valid data with timestamp', () => {
      const poolData = new PoolData({
        dashboard: { temperature: { actual: 78.5 } },
        timestamp: '2024-01-01T12:00:00.000Z'
      });

      expect(poolData.isValid()).toBe(true);
    });

    it('should return true for empty data with auto-generated timestamp', () => {
      const poolData = new PoolData({});

      expect(poolData.isValid()).toBe(true);
    });

    it('should return false with invalid timestamp', () => {
      const poolData = new PoolData({ timestamp: 'invalid-timestamp' });

      expect(poolData.isValid()).toBe(false);
    });
  });

  describe('toTimeSeriesPoint', () => {
    it('should convert to time series format', () => {
      const poolData = new PoolData({
        dashboard: {
          temperature: { actual: 78.5 },
          airTemperature: 75.2
        },
        chlorinator: {
          salt: { instant: 3200 },
          cell: { voltage: 12.5, temperature: { value: 85.0 } }
        },
        filter: { status: true },
        weather: { temperature: 76.0 }
      });

      const timeSeriesPoint = poolData.toTimeSeriesPoint();

      expect(timeSeriesPoint).toHaveProperty('timestamp');
      expect(timeSeriesPoint.waterTemp).toBe(78.5);
      expect(timeSeriesPoint.saltInstant).toBe(3200);
      expect(timeSeriesPoint.pumpStatus).toBe(true);
      expect(timeSeriesPoint.cellVoltage).toBe(12.5);
      expect(timeSeriesPoint.cellTemp).toBe(85.0);
      expect(timeSeriesPoint.airTemp).toBe(75.2);
      expect(timeSeriesPoint.weatherTemp).toBe(76.0);
    });

    it('should handle null values', () => {
      const poolData = new PoolData({
        chlorinator: { salt: { instant: 3200 } }
      });

      const timeSeriesPoint = poolData.toTimeSeriesPoint();

      expect(timeSeriesPoint.waterTemp).toBe(null);
      expect(timeSeriesPoint.saltInstant).toBe(3200);
      expect(timeSeriesPoint.cellVoltage).toBe(null);
    });
  });

  describe('fromTimeSeriesPoint', () => {
    it('should create PoolData from time series point', () => {
      const timeSeriesPoint = {
        timestamp: '2024-01-01T12:00:00.000Z',
        waterTemp: 78.5,
        saltInstant: 3200,
        pumpStatus: true,
        cellVoltage: 12.5,
        cellTemp: 85.0,
        airTemp: 75.2
      };

      const poolData = PoolData.fromTimeSeriesPoint(timeSeriesPoint);

      expect(poolData.timestamp).toBe('2024-01-01T12:00:00.000Z');
      expect(poolData.dashboard.temperature.actual).toBe(78.5);
      expect(poolData.dashboard.airTemperature).toBe(75.2);
      expect(poolData.chlorinator.salt.instant).toBe(3200);
      expect(poolData.filter.status).toBe(true);
      expect(poolData.chlorinator.cell.voltage).toBe(12.5);
      expect(poolData.chlorinator.cell.temperature.value).toBe(85.0);
    });
  });
});
