const timeSeriesService = require('../src/services/timeSeriesService');

describe('TimeSeriesService', () => {
  beforeEach(() => {
    // Clear data before each test
    timeSeriesService.dataPoints = [];
  });

  test('should add data points correctly', () => {
    const dataPoint = {
      timestamp: new Date().toISOString(),
      saltInstant: 3000,
      cellTemp: 75,
      cellVoltage: 24.5,
      waterTemp: 82
    };

    timeSeriesService.addDataPoint(dataPoint);
    expect(timeSeriesService.dataPoints).toHaveLength(1);
    expect(timeSeriesService.dataPoints[0]).toEqual(dataPoint);
  });

  test('should limit data points to maxPoints', () => {
    const maxPoints = timeSeriesService.maxPoints;
    
    // Add more than maxPoints
    for (let i = 0; i < maxPoints + 10; i++) {
      timeSeriesService.addDataPoint({
        timestamp: new Date(Date.now() + i * 1000).toISOString(), // Ensure unique timestamps
        saltInstant: i,
        cellTemp: i,
        cellVoltage: i,
        waterTemp: i
      });
    }

    expect(timeSeriesService.dataPoints).toHaveLength(maxPoints);
    expect(timeSeriesService.dataPoints[0].saltInstant).toBe(10); // Should keep the last 1440
  });

  test('should get data points for specified hours', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    timeSeriesService.addDataPoint({
      timestamp: now.toISOString(),
      saltInstant: 3000,
      cellTemp: 75,
      cellVoltage: 24.5,
      waterTemp: 82
    });

    timeSeriesService.addDataPoint({
      timestamp: oneHourAgo.toISOString(),
      saltInstant: 2900,
      cellTemp: 74,
      cellVoltage: 24.0,
      waterTemp: 81
    });

    timeSeriesService.addDataPoint({
      timestamp: twoHoursAgo.toISOString(),
      saltInstant: 2800,
      cellTemp: 73,
      cellVoltage: 23.5,
      waterTemp: 80
    });

    const recentData = timeSeriesService.getDataPoints(1.5); // Last 1.5 hours
    expect(recentData).toHaveLength(2);
    // Data should be sorted chronologically (oldest first)
    expect(recentData[0].saltInstant).toBe(2900); // oneHourAgo
    expect(recentData[1].saltInstant).toBe(3000); // now
  });

  test('should get statistics correctly', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    timeSeriesService.addDataPoint({
      timestamp: now.toISOString(),
      saltInstant: 3000,
      cellTemp: 75,
      cellVoltage: 24.5,
      waterTemp: 82
    });

    timeSeriesService.addDataPoint({
      timestamp: oneHourAgo.toISOString(),
      saltInstant: 2900,
      cellTemp: 74,
      cellVoltage: 24.0,
      waterTemp: 81
    });

    const stats = timeSeriesService.getStats();
    
    expect(stats.totalPoints).toBe(2);
    expect(stats.retentionHours).toBe(24);
    expect(stats.maxPoints).toBe(1440);
    expect(stats.oldestTimestamp).toBeInstanceOf(Date);
    expect(stats.newestTimestamp).toBeInstanceOf(Date);
    expect(stats.dataAgeHours).toBeGreaterThan(0);
  });

  test('should handle duplicate timestamps', () => {
    const timestamp = new Date().toISOString();
    
    timeSeriesService.addDataPoint({
      timestamp,
      saltInstant: 3000,
      cellTemp: 75,
      cellVoltage: 24.5,
      waterTemp: 82
    });

    timeSeriesService.addDataPoint({
      timestamp, // Same timestamp
      saltInstant: 3100,
      cellTemp: 76,
      cellVoltage: 25.0,
      waterTemp: 83
    });

    // Should only keep one data point with the same timestamp
    expect(timeSeriesService.dataPoints).toHaveLength(1);
  });

  test('should sort data points chronologically', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Add in reverse order
    timeSeriesService.addDataPoint({
      timestamp: now.toISOString(),
      saltInstant: 3000,
      cellTemp: 75,
      cellVoltage: 24.5,
      waterTemp: 82
    });

    timeSeriesService.addDataPoint({
      timestamp: oneHourAgo.toISOString(),
      saltInstant: 2900,
      cellTemp: 74,
      cellVoltage: 24.0,
      waterTemp: 81
    });

    // Should be sorted chronologically
    expect(timeSeriesService.dataPoints[0].saltInstant).toBe(2900);
    expect(timeSeriesService.dataPoints[1].saltInstant).toBe(3000);
  });
}); 