const express = require('express');

// New architecture imports (for future migration)
// const { envConfig } = require('../config');
// const { PoolDataCollector } = require('../domains/pool');
// const { timeSeriesService, influxDBClient } = require('../domains/monitoring');

// Legacy services (to be migrated gradually)
const sessionManager = require('../services/sessionManager');
const poolDataService = require('../services/poolDataService');
const { influxDBService } = require('../services/influxDBService');
const weatherService = require('../services/weatherService');
const weatherAlertService = require('../services/weatherAlertService');
const credentials = require('../utils/credentials');

/** @type {import('express').Router} */
const router = express.Router();

// Initialize weather alert service
const weatherAlerts = new weatherAlertService();

// Initialize the service when the module loads
(async () => {
  try {
    await weatherAlerts.initialize();
  } catch (error) {
    console.error('Failed to initialize weather alert service:', error);
  }
})();

/**
 * Weather alert cron job endpoint
 * Runs every 15 minutes via Vercel cron to check for new weather alerts
 */
router.get('/check-alerts', async (req, res) => {
  try {
    console.log('⚠️ Alert cron job: Checking for weather alerts...');

    // Check for new weather alerts and store them
    const alertResult = await weatherAlerts.checkAndStoreAlerts();

    // Get current active alerts for response
    const activeAlerts = await weatherAlerts.getActiveAlerts();

    console.log(`✅ Alert cron job: ${alertResult.newAlertsStored} new alerts stored, ${activeAlerts.length} currently active`);

    res.json({
      success: true,
      message: 'Weather alert check completed',
      timestamp: new Date().toISOString(),
      alertCheck: alertResult,
      activeAlerts: {
        count: activeAlerts.length,
        alerts: activeAlerts.map(alert => ({
          id: alert.id,
          event: alert.event,
          severity: alert.severity,
          urgency: alert.urgency,
          startTime: alert.startTime,
          endTime: alert.endTime
        }))
      }
    });

  } catch (error) {
    console.error('❌ Alert cron job: Weather alert check failed:', error);
    res.status(500).json({
      error: 'Weather alert check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Cron job endpoint for automated data collection
 * Runs every 5 minutes via Vercel cron
 */
router.get('/collect-data', async (req, res) => {
  try {
    console.log('🕐 Cron job: Starting automated data collection...');

    // Create a new session for the cron job
    const sessionId = `cron-${Date.now()}`;
    const session = sessionManager.getSession(sessionId);

    // Authenticate using credentials
    const creds = credentials.getAndValidateCredentials();
    if (!creds) {
      console.error('❌ Cron job: No valid credentials available');
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'No valid credentials available',
        timestamp: new Date().toISOString()
      });
    }

    const authResult = await session.authenticate(creds.username, creds.password);

    if (!authResult.success) {
      console.error('❌ Cron job: Authentication failed:', authResult.message);
      return res.status(401).json({
        error: 'Authentication failed',
        message: authResult.message,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch all pool data (this will automatically store in InfluxDB)
    const poolData = await poolDataService.fetchAllPoolData(session);

    // Debug: Check if data was stored in InfluxDB
    console.log('🔍 Pool data collection completed, checking InfluxDB storage...');
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (5 * 60 * 1000)); // Last 5 minutes
    const recentData = await influxDBService.queryDataPoints(startTime, endTime);
    console.log(`📊 Recent data points in InfluxDB: ${recentData.length}`);
    if (recentData.length > 0) {
      console.log('📝 Most recent data point:', recentData[recentData.length - 1]);
    }

    // Check for weather alerts (non-blocking)
    let alertInfo = null;
    try {
      const hasAlerts = await weatherAlerts.hasActiveAlerts();
      if (hasAlerts) {
        const activeAlerts = await weatherAlerts.getActiveAlerts();
        alertInfo = {
          hasActiveAlerts: true,
          alertCount: activeAlerts.length,
          mostSevereAlert: activeAlerts.length > 0 ? activeAlerts[0].event : null
        };
        console.log(`⚠️ Active weather alerts detected: ${activeAlerts.length} alerts`);
      }
    } catch (alertError) {
      console.warn('⚠️ Weather alert check failed during data collection:', alertError.message);
    }

    console.log('✅ Cron job: Data collection completed successfully');

    res.json({
      success: true,
      message: 'Data collection completed',
      timestamp: new Date().toISOString(),
      dataPoints: {
        saltInstant: poolData.chlorinator?.salt?.instant || null,
        cellTemp: poolData.chlorinator?.cell?.temperature?.value || null,
        cellVoltage: poolData.chlorinator?.cell?.voltage || null,
        waterTemp: poolData.dashboard?.temperature?.actual || null
      },
      weatherAlerts: alertInfo
    });

  } catch (error) {
    console.error('❌ Cron job: Data collection failed:', error);
    res.status(500).json({
      error: 'Data collection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Weather-only cron job endpoint for frequent weather updates
 * Runs every 2 minutes via Vercel cron
 */
router.get('/collect-weather', async (req, res) => {
  try {
    console.log('🌤️ Weather cron job: Starting weather data collection...');

    // Fetch current weather data
    const weatherData = await weatherService.getCurrentWeather();

    if (!weatherData) {
      console.error('❌ Weather cron job: Failed to fetch weather data');
      return res.status(500).json({
        error: 'Weather data fetch failed',
        timestamp: new Date().toISOString()
      });
    }

    // Store weather data in InfluxDB
    const timeSeriesPoint = {
      timestamp: new Date().toISOString(),
      weatherTemp: weatherData.temperature,
      weatherHumidity: weatherData.humidity || null,
      weatherSource: weatherData.source || 'unknown'
    };

    await influxDBService.storeDataPoint(timeSeriesPoint);

    console.log(`✅ Weather cron job: Weather data stored successfully (${weatherData.temperature}°F from ${weatherData.source})`);

    res.json({
      success: true,
      message: 'Weather data collection completed',
      timestamp: new Date().toISOString(),
      weather: {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        source: weatherData.source
      }
    });

  } catch (error) {
    console.error('❌ Weather cron job: Weather collection failed:', error);
    res.status(500).json({
      error: 'Weather collection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Consolidated cron endpoint for all tasks
router.get('/collect-all', async (req, res) => {
  console.log('🚀 Starting consolidated cron job - all tasks');
  const startTime = Date.now();

  try {
    // Get credentials
    const creds = credentials.getAndValidateCredentials();
    if (!creds) {
      console.error('❌ Failed to get credentials');
      return res.status(500).json({ error: 'Failed to get credentials' });
    }

    // Create session for the cron job
    const sessionId = `cron-consolidated-${Date.now()}`;
    const session = sessionManager.getSession(sessionId);

    // Authenticate
    const authResult = await session.authenticate(creds.username, creds.password);
    if (!authResult.success) {
      console.error('❌ Authentication failed for consolidated cron job');
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Task 1: Collect pool data (daily)
    console.log('📊 Task 1: Collecting pool data...');
    try {
      const _poolData = await poolDataService.fetchAllPoolData(session);
      console.log('✅ Pool data collection completed');
    } catch (error) {
      console.error('❌ Pool data collection failed:', error.message);
    }

    // Task 2: Collect weather data (daily)
    console.log('🌤️ Task 2: Collecting weather data...');
    try {
      const _weatherData = await weatherService.getCurrentWeather();
      console.log('✅ Weather data collection completed');
    } catch (error) {
      console.error('❌ Weather data collection failed:', error.message);
    }

    // Task 3: Check weather alerts (daily)
    console.log('⚠️ Task 3: Checking weather alerts...');
    try {
      const alertResult = await weatherAlerts.checkAndStoreAlerts();
      console.log(`✅ Weather alert check completed: ${alertResult.newAlertsStored} new alerts`);
    } catch (error) {
      console.error('❌ Weather alert check failed:', error.message);
    }

    const duration = Date.now() - startTime;
    console.log(`🎉 Consolidated cron job completed in ${duration}ms`);

    res.json({
      success: true,
      message: 'Daily consolidated cron job completed',
      duration: `${duration}ms`,
      tasks: ['pool-data', 'weather-data', 'weather-alerts'],
      schedule: 'Daily at 12:00 PM UTC'
    });

  } catch (error) {
    console.error('❌ Consolidated cron job failed:', error);
    res.status(500).json({
      error: 'Consolidated cron job failed',
      message: error.message
    });
  }
});

module.exports = router;
