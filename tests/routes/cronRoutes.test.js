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

// Mock services
jest.mock('../../src/services/sessionManager', () => ({
  createSession: jest.fn(),
  destroySession: jest.fn()
}));
jest.mock('../../src/services/poolDataService', () => ({
  fetchAllPoolData: jest.fn(),
  getMostRecentData: jest.fn()
}));
jest.mock('../../src/services/influxDBService', () => ({
  influxDBService: {
    storeDataPoint: jest.fn(),
    queryDataPoints: jest.fn(),
    testConnection: jest.fn()
  }
}));
jest.mock('../../src/services/weatherService', () => ({
  getCurrentWeather: jest.fn(),
  getWeatherAlerts: jest.fn()
}));
jest.mock('../../src/services/weatherAlertService', () => ({
  checkWeatherAlerts: jest.fn(),
  storeWeatherAlerts: jest.fn()
}));
jest.mock('../../src/utils/credentials', () => ({
  getAndValidateCredentials: jest.fn()
}));

const sessionManager = require('../../src/services/sessionManager');
const poolDataService = require('../../src/services/poolDataService');
const { influxDBService } = require('../../src/services/influxDBService');
const weatherService = require('../../src/services/weatherService');
const weatherAlertService = require('../../src/services/weatherAlertService');
const credentials = require('../../src/utils/credentials');

describe.skip('Cron Routes', () => {
  let app;
  let router;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock successful credentials
    credentials.getAndValidateCredentials.mockReturnValue({
      username: 'test@example.com',
      password: 'testpassword'
    });

    // Mock successful session
    sessionManager.createSession.mockResolvedValue({
      authenticate: jest.fn().mockResolvedValue(true)
    });

    // Mock successful data collection
    poolDataService.fetchAllPoolData.mockResolvedValue({
      timestamp: new Date().toISOString(),
      chlorinator: {
        salt: { instant: 3000 },
        cell: { temperature: { value: 85 }, voltage: 25.5 }
      },
      dashboard: {
        temperature: { actual: 82 },
        airTemperature: 75
      },
      filter: { status: true },
      weather: { temperature: 76, humidity: 65 }
    });

    // Mock successful InfluxDB operations
    influxDBService.queryDataPoints.mockResolvedValue([
      {
        timestamp: new Date().toISOString(),
        saltInstant: 3000,
        cellTemp: 85,
        cellVoltage: 25.5,
        waterTemp: 82,
        airTemp: 75,
        pumpStatus: true,
        weatherTemp: 76,
        weatherHumidity: 65
      }
    ]);

    // Mock weather alert service
    weatherAlertService.mockImplementation(() => ({
      hasActiveAlerts: jest.fn().mockResolvedValue(false),
      getActiveAlerts: jest.fn().mockResolvedValue([]),
      initialize: jest.fn().mockResolvedValue(true)
    }));

    // Create Express app
    app = express();
    app.use(express.json());

    // Import and use the router
    router = require('../../src/routes/cronRoutes');
    app.use('/api/cron', router);
  });

  describe('POST /collect-data', () => {
    it('should collect and store pool data successfully', async () => {
      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Data collection completed');
      expect(response.body.dataPoints).toBeDefined();
      expect(response.body.dataPoints.saltInstant).toBe(3000);
      expect(response.body.dataPoints.cellTemp).toBe(85);
      expect(response.body.dataPoints.cellVoltage).toBe(25.5);
      expect(response.body.dataPoints.waterTemp).toBe(82);

      // Verify services were called
      expect(credentials.getAndValidateCredentials).toHaveBeenCalledTimes(1);
      expect(sessionManager.createSession).toHaveBeenCalledTimes(1);
      expect(poolDataService.fetchAllPoolData).toHaveBeenCalledTimes(1);
      expect(influxDBService.queryDataPoints).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication failures gracefully', async () => {
      credentials.getAndValidateCredentials.mockReturnValue(null);

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should handle session creation failures', async () => {
      sessionManager.createSession.mockRejectedValue(new Error('Session creation failed'));

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Session creation failed');
    });

    it('should handle data collection failures', async () => {
      poolDataService.fetchAllPoolData.mockRejectedValue(new Error('Data collection failed'));

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Data collection failed');
    });

    it('should handle InfluxDB query failures gracefully', async () => {
      influxDBService.queryDataPoints.mockRejectedValue(new Error('InfluxDB query failed'));

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      // Should still succeed even if InfluxDB query fails
      expect(response.body.success).toBe(true);
      expect(response.body.dataPoints).toBeDefined();
    });

    it('should include weather alert information when available', async () => {
      const mockWeatherAlerts = new weatherAlertService();
      mockWeatherAlerts.hasActiveAlerts.mockResolvedValue(true);
      mockWeatherAlerts.getActiveAlerts.mockResolvedValue([
        {
          id: 'test-alert-1',
          event: 'Severe Thunderstorm Warning',
          severity: 'severe',
          urgency: 'immediate',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString()
        }
      ]);

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.weatherAlerts).toBeDefined();
      expect(response.body.weatherAlerts.hasActiveAlerts).toBe(true);
      expect(response.body.weatherAlerts.alertCount).toBe(1);
    });

    it('should handle weather alert service failures gracefully', async () => {
      const mockWeatherAlerts = new weatherAlertService();
      mockWeatherAlerts.hasActiveAlerts.mockRejectedValue(new Error('Weather alert service failed'));

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      // Should still succeed even if weather alert service fails
      expect(response.body.success).toBe(true);
      expect(response.body.weatherAlerts).toBeNull();
    });
  });

  describe('POST /collect-weather', () => {
    beforeEach(() => {
      weatherService.getCurrentWeather.mockResolvedValue({
        temperature: 76,
        humidity: 65,
        description: 'Partly cloudy',
        source: 'OpenMeteo',
        timestamp: new Date().toISOString()
      });
    });

    it('should collect weather data successfully', async () => {
      const response = await request(app)
        .post('/api/cron/collect-weather')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Weather data collected');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.temperature).toBe(76);
      expect(response.body.data.humidity).toBe(65);
      expect(response.body.data.description).toBe('Partly cloudy');
      expect(response.body.data.source).toBe('OpenMeteo');

      expect(weatherService.getCurrentWeather).toHaveBeenCalledTimes(1);
    });

    it('should handle weather service failures', async () => {
      weatherService.getCurrentWeather.mockRejectedValue(new Error('Weather service failed'));

      const response = await request(app)
        .post('/api/cron/collect-weather')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Weather service failed');
    });
  });

  describe('POST /check-alerts', () => {
    beforeEach(() => {
      const mockWeatherAlerts = new weatherAlertService();
      mockWeatherAlerts.checkAndStoreAlerts = jest.fn().mockResolvedValue({
        newAlertsStored: 2,
        totalAlertsChecked: 5
      });
      mockWeatherAlerts.getActiveAlerts = jest.fn().mockResolvedValue([
        {
          id: 'test-alert-1',
          event: 'Severe Thunderstorm Warning',
          severity: 'severe',
          urgency: 'immediate',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString()
        }
      ]);
    });

    it('should check and store weather alerts successfully', async () => {
      const response = await request(app)
        .post('/api/cron/check-alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Weather alert check completed');
      expect(response.body.alertCheck).toBeDefined();
      expect(response.body.alertCheck.newAlertsStored).toBe(2);
      expect(response.body.alertCheck.totalAlertsChecked).toBe(5);
      expect(response.body.activeAlerts).toBeDefined();
      expect(response.body.activeAlerts.count).toBe(1);
    });

    it('should handle weather alert service failures', async () => {
      const mockWeatherAlerts = new weatherAlertService();
      mockWeatherAlerts.checkAndStoreAlerts.mockRejectedValue(new Error('Alert service failed'));

      const response = await request(app)
        .post('/api/cron/check-alerts')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Alert service failed');
    });
  });

  describe('Error handling', () => {
    it('should handle missing credentials', async () => {
      credentials.getAndValidateCredentials.mockReturnValue(null);

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should handle malformed request data', async () => {
      const response = await request(app)
        .post('/api/cron/collect-data')
        .send({ invalid: 'data' })
        .expect(200); // Should still work as it doesn't use request body

      expect(response.body.success).toBe(true);
    });

    it('should handle service initialization failures', async () => {
      const mockWeatherAlerts = new weatherAlertService();
      mockWeatherAlerts.initialize.mockRejectedValue(new Error('Initialization failed'));

      const response = await request(app)
        .post('/api/cron/collect-data')
        .expect(200);

      // Should still succeed even if weather alert service fails to initialize
      expect(response.body.success).toBe(true);
    });
  });
});
