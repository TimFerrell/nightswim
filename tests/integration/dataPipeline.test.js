/**
 * Integration test for the complete data pipeline
 * Tests the full flow from data collection to InfluxDB storage to API retrieval
 */

// Mock cheerio to avoid ES module issues
jest.mock('cheerio', () => ({
  load: jest.fn(() => ({
    text: jest.fn(() => ''),
    attr: jest.fn(() => null),
    length: 0,
    each: jest.fn(),
    find: jest.fn(() => ({ each: jest.fn(), length: 0 }))
  }))
}));

const request = require('supertest');
const express = require('express');

// Mock external services but keep internal logic intact
jest.mock('../../src/services/HaywardSession');
jest.mock('../../src/services/weatherService');
jest.mock('../../src/services/weatherAlertService');

const HaywardSession = require('../../src/services/HaywardSession');
const weatherService = require('../../src/services/weatherService');
const weatherAlertService = require('../../src/services/weatherAlertService');

describe('Data Pipeline Integration', () => {
  let app;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Hayward session with realistic HTML responses
    HaywardSession.mockImplementation(() => ({
      authenticate: jest.fn().mockResolvedValue(true),
      makeRequest: jest.fn().mockImplementation((url) => {
        // Return different HTML based on the endpoint
        if (url.includes('dashboard')) {
          return Promise.resolve({
            data: `
              <html>
                <body>
                  <div id="lblTempActual">82°F</div>
                  <div id="lblTempTarget">80°F</div>
                  <div id="divfilterStatus">ON</div>
                  <div id="divPump">Filter Pump Running</div>
                  <div id="lblAirTemp">75°F</div>
                </body>
              </html>
            `
          });
        } else if (url.includes('chlorinator')) {
          return Promise.resolve({
            data: `
              <html>
                <body>
                  <div id="lbCellTemp">85.6°F</div>
                  <div id="lbCellVoltage">23.01</div>
                  <div id="lbCellCurrent">4.89</div>
                  <div id="lbCellType">T-15</div>
                  <div class="boxchlppm">salt level 2897 ppm</div>
                </body>
              </html>
            `
          });
        } else if (url.includes('filter')) {
          return Promise.resolve({
            data: `
              <html>
                <body>
                  <div id="divfilterStatus">ON</div>
                </body>
              </html>
            `
          });
        }
        return Promise.resolve({ data: '<html><body></body></html>' });

      })
    }));

    // Mock weather service
    weatherService.getCurrentWeather.mockResolvedValue({
      temperature: 76,
      humidity: 65,
      description: 'Partly cloudy',
      source: 'OpenMeteo',
      timestamp: new Date().toISOString()
    });

    // Mock weather alert service
    weatherAlertService.mockImplementation(() => ({
      hasActiveAlerts: jest.fn().mockResolvedValue(false),
      getActiveAlerts: jest.fn().mockResolvedValue([]),
      initialize: jest.fn().mockResolvedValue(true)
    }));

    // Create Express app
    app = express();
    app.use(express.json());

    // Import routes
    const poolRoutes = require('../../src/routes/poolRoutes');
    const cronRoutes = require('../../src/routes/cronRoutes');

    app.use('/api/pool', poolRoutes);
    app.use('/api/cron', cronRoutes);
  });

  describe.skip('End-to-End Data Pipeline', () => {
    it('should collect, store, and retrieve data successfully', async () => {
      // Step 1: Trigger data collection via cron
      const collectionResponse = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      expect(collectionResponse.body.success).toBe(true);
      expect(collectionResponse.body.dataPoints).toBeDefined();
      expect(collectionResponse.body.dataPoints.cellTemp).toBe(85.6);
      expect(collectionResponse.body.dataPoints.cellVoltage).toBe(23.01);
      expect(collectionResponse.body.dataPoints.waterTemp).toBe(82);
      expect(collectionResponse.body.dataPoints.saltInstant).toBe(2897);

      // Step 2: Verify data is available via API
      const dataResponse = await request(app)
        .get('/api/pool/data')
        .expect(200);

      expect(dataResponse.body.success).toBe(true);
      expect(dataResponse.body.data).toBeDefined();
      expect(dataResponse.body.data.chlorinator).toBeDefined();
      expect(dataResponse.body.data.dashboard).toBeDefined();
      expect(dataResponse.body.data.weather).toBeDefined();

      // Step 3: Verify time series data is available
      const timeSeriesResponse = await request(app)
        .get('/api/pool/timeseries?hours=1')
        .expect(200);

      expect(timeSeriesResponse.body.success).toBe(true);
      expect(timeSeriesResponse.body.data).toBeDefined();
      expect(Array.isArray(timeSeriesResponse.body.data)).toBe(true);
      expect(timeSeriesResponse.body.data.length).toBeGreaterThan(0);

      // Step 4: Verify the most recent data point matches what was collected
      const latestDataPoint = timeSeriesResponse.body.data[timeSeriesResponse.body.data.length - 1];
      expect(latestDataPoint.cellTemp).toBe(85.6);
      expect(latestDataPoint.cellVoltage).toBe(23.01);
      expect(latestDataPoint.waterTemp).toBe(82);
      expect(latestDataPoint.saltInstant).toBe(2897);
      expect(latestDataPoint.weatherTemp).toBe(76);
      expect(latestDataPoint.weatherHumidity).toBe(65);
    });

    it('should handle missing data gracefully', async () => {
      // Mock session to return empty/invalid HTML
      HaywardSession.mockImplementation(() => ({
        authenticate: jest.fn().mockResolvedValue(true),
        makeRequest: jest.fn().mockResolvedValue({
          data: '<html><body></body></html>'
        })
      }));

      // Step 1: Trigger data collection
      const collectionResponse = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      expect(collectionResponse.body.success).toBe(true);
      expect(collectionResponse.body.dataPoints).toBeDefined();

      // Should handle null values gracefully
      expect(collectionResponse.body.dataPoints.saltInstant).toBeNull();
      expect(collectionResponse.body.dataPoints.cellTemp).toBeNull();
      expect(collectionResponse.body.dataPoints.waterTemp).toBeNull();

      // Step 2: Verify API still returns data structure
      const dataResponse = await request(app)
        .get('/api/pool/data')
        .expect(200);

      expect(dataResponse.body.success).toBe(true);
      expect(dataResponse.body.data).toBeDefined();
    });

    it('should maintain data consistency across multiple collections', async () => {
      // Step 1: First data collection
      const collection1 = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      expect(collection1.body.success).toBe(true);

      // Step 2: Second data collection (simulate cron running again)
      const collection2 = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      expect(collection2.body.success).toBe(true);

      // Step 3: Verify time series has multiple data points
      const timeSeriesResponse = await request(app)
        .get('/api/pool/timeseries?hours=1')
        .expect(200);

      expect(timeSeriesResponse.body.success).toBe(true);
      expect(timeSeriesResponse.body.data.length).toBeGreaterThanOrEqual(2);

      // Step 4: Verify data points are properly timestamped and ordered
      const dataPoints = timeSeriesResponse.body.data;
      for (let i = 1; i < dataPoints.length; i++) {
        const currentTime = new Date(dataPoints[i].timestamp);
        const previousTime = new Date(dataPoints[i - 1].timestamp);
        expect(currentTime.getTime()).toBeGreaterThan(previousTime.getTime());
      }
    });

    it('should handle concurrent data collection requests', async () => {
      // Simulate multiple concurrent cron jobs
      const promises = Array(3).fill().map(() =>
        request(app)
          .post('/api/cron/collect-data')
          .expect(200)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.body.success).toBe(true);
        expect(result.body.dataPoints).toBeDefined();
      });

      // Verify data is still consistent
      const timeSeriesResponse = await request(app)
        .get('/api/pool/timeseries?hours=1')
        .expect(200);

      expect(timeSeriesResponse.body.success).toBe(true);
      expect(timeSeriesResponse.body.data.length).toBeGreaterThan(0);
    });

    it('should handle service failures gracefully', async () => {
      // Mock Hayward session to fail
      HaywardSession.mockImplementation(() => ({
        authenticate: jest.fn().mockRejectedValue(new Error('Authentication failed')),
        makeRequest: jest.fn().mockRejectedValue(new Error('Request failed'))
      }));

      // Data collection should fail gracefully
      const collectionResponse = await request(app)
        .post('/api/cron/collect-data')
        .expect(500);

      expect(collectionResponse.body.success).toBe(false);
      expect(collectionResponse.body.error).toContain('Authentication failed');

      // API should still return a response (even if empty)
      const dataResponse = await request(app)
        .get('/api/pool/data')
        .expect(200);

      expect(dataResponse.body.success).toBe(true);
    });
  });

  describe.skip('Data Validation', () => {
    it('should validate data types and ranges', async () => {
      const collectionResponse = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      const dataPoints = collectionResponse.body.dataPoints;

      // Validate data types
      expect(typeof dataPoints.cellTemp).toBe('number');
      expect(typeof dataPoints.cellVoltage).toBe('number');
      expect(typeof dataPoints.waterTemp).toBe('number');
      expect(typeof dataPoints.saltInstant).toBe('number');

      // Validate reasonable ranges
      expect(dataPoints.cellTemp).toBeGreaterThan(0);
      expect(dataPoints.cellTemp).toBeLessThan(200);
      expect(dataPoints.cellVoltage).toBeGreaterThan(0);
      expect(dataPoints.cellVoltage).toBeLessThan(50);
      expect(dataPoints.waterTemp).toBeGreaterThan(0);
      expect(dataPoints.waterTemp).toBeLessThan(120);
      expect(dataPoints.saltInstant).toBeGreaterThan(0);
      expect(dataPoints.saltInstant).toBeLessThan(10000);
    });

    it('should handle timestamp consistency', async () => {
      const collectionResponse = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      const timestamp = new Date(collectionResponse.body.timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - timestamp.getTime());

      // Timestamp should be within 10 seconds of now
      expect(timeDiff).toBeLessThan(10000);
    });
  });

  describe.skip('Performance', () => {
    it('should complete data collection within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle rapid successive requests', async () => {
      const startTime = Date.now();

      // Make 5 rapid requests
      const promises = Array(5).fill().map(() =>
        request(app)
          .post('/api/cron/collect-data')
          .expect(200)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All should succeed
      results.forEach(result => {
        expect(result.body.success).toBe(true);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds for 5 requests
    });
  });
});
