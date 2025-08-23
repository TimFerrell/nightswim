const express = require('express');
const { influxDBService } = require('../services/influxDBService');
const timeSeriesService = require('../services/timeSeriesService');
const pumpStateTracker = require('../services/pumpStateTracker');
const weatherAlertService = require('../services/weatherAlertService');
const weatherService = require('../services/weatherService');
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

// Get current pool data from InfluxDB (fastest response)
router.get('/data', async (req, res) => {
  const requestStartTime = Date.now();
  console.log('🚀 /api/pool/data request started');
  
  try {
    console.log('📊 Fetching current pool data from InfluxDB...');
    const startTime = Date.now();

    // Get the most recent data point from InfluxDB
    const endTime = new Date();
    const queryStartTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000)); // Last 24 hours instead of 1 hour
    
    console.log(`🔍 Querying InfluxDB for data from ${queryStartTime.toISOString()} to ${endTime.toISOString()}`);
    const influxQueryStart = Date.now();
    
    const dataPoints = await influxDBService.queryDataPoints(queryStartTime, endTime);
    
    const influxQueryTime = Date.now() - influxQueryStart;
    console.log(`📊 InfluxDB query completed in ${influxQueryTime}ms, returned ${dataPoints.length} data points`);
    
    if (dataPoints.length === 0) {
      const totalTime = Date.now() - requestStartTime;
      console.log(`❌ No data available after ${totalTime}ms`);
      return res.status(200).json({ 
        success: true,
        data: {
          chlorinator: { salt: { instant: null }, cell: { voltage: null, temperature: { value: null } } },
          dashboard: { temperature: { actual: null } },
          filter: { status: null },
          weather: { temperature: null }
        },
        source: 'influxdb',
        message: 'No data available yet',
        performance: { totalTime }
      });
    }

    // Get the most recent data point with valid data
    const dataProcessingStart = Date.now();
    
    // Get the most recent data point for current values
    const mostRecentData = dataPoints[dataPoints.length - 1];
    
    // Find the best data point for flow-dependent sensors (salt, water temp)
    let bestFlowData = null;
    let bestFlowScore = -1;
    
    for (let i = dataPoints.length - 1; i >= 0; i--) {
      const point = dataPoints[i];
      // Calculate a score based on flow-dependent sensors
      let score = 0;
      if (point.saltInstant !== null) score += 1;
      if (point.waterTemp !== null) score += 1;
      
      // Prefer more recent data for flow-dependent sensors
      const pointAge = Date.now() - new Date(point.timestamp).getTime();
      const isRecent = pointAge < (2 * 60 * 60 * 1000); // 2 hours
      if (isRecent) score += 0.5;
      
      if (score > bestFlowScore) {
        bestFlowScore = score;
        bestFlowData = point;
      }
    }
    
    // Find the most recent non-null values for pump status and cell voltage
    let mostRecentPumpStatus = null;
    let mostRecentCellVoltage = null;
    let mostRecentCellTemp = null;
    
    for (let i = dataPoints.length - 1; i >= 0; i--) {
      const point = dataPoints[i];
      if (mostRecentPumpStatus === null && point.pumpStatus !== null) {
        mostRecentPumpStatus = point.pumpStatus;
      }
      if (mostRecentCellVoltage === null && point.cellVoltage !== null) {
        mostRecentCellVoltage = point.cellVoltage;
      }
      if (mostRecentCellTemp === null && point.cellTemp !== null) {
        mostRecentCellTemp = point.cellTemp;
      }
      // Break if we found all the values we need
      if (mostRecentPumpStatus !== null && mostRecentCellVoltage !== null && mostRecentCellTemp !== null) {
        break;
      }
    }
    
    // Combine most recent data with best flow data and most recent sensor values
    const latestData = {
      ...mostRecentData,
      // Use best available flow-dependent sensor data
      saltInstant: bestFlowData?.saltInstant ?? mostRecentData.saltInstant,
      waterTemp: bestFlowData?.waterTemp ?? mostRecentData.waterTemp,
      // Use most recent non-null values for sensors that don't depend on flow
      pumpStatus: mostRecentPumpStatus ?? mostRecentData.pumpStatus,
      cellVoltage: mostRecentCellVoltage ?? mostRecentData.cellVoltage,
      cellTemp: mostRecentCellTemp ?? mostRecentData.cellTemp
    };
    
    // If no valid data found, use the most recent point
    if (!latestData && dataPoints.length > 0) {
      latestData = dataPoints[dataPoints.length - 1];
    }
    
    console.log(`📊 Selected data point:`, {
      timestamp: latestData.timestamp,
      saltInstant: latestData.saltInstant,
      waterTemp: latestData.waterTemp,
      cellVoltage: latestData.cellVoltage,
      pumpStatus: latestData.pumpStatus,
      weatherTemp: latestData.weatherTemp,
      isValid: latestData.saltInstant !== null || latestData.waterTemp !== null || latestData.cellVoltage !== null || latestData.cellTemp !== null
    });
    
    // Format the response to match expected structure
    const poolData = {
      timestamp: latestData.timestamp,
      dashboard: {
        temperature: {
          actual: latestData.waterTemp,
          unit: '°F'
        },
        airTemperature: latestData.airTemp
      },
      chlorinator: {
        salt: {
          instant: latestData.saltInstant,
          unit: 'PPM'
        },
        cell: {
          voltage: latestData.cellVoltage,
          temperature: {
            value: latestData.cellTemp,
            unit: '°F'
          }
        }
      },
      filter: {
        status: latestData.pumpStatus
      },
      weather: {
        temperature: latestData.weatherTemp,
        unit: '°F'
      }
    };

    const dataProcessingTime = Date.now() - dataProcessingStart;
    const totalTime = Date.now() - requestStartTime;
    
    console.log(`📊 Data processing completed in ${dataProcessingTime}ms`);
    console.log(`✅ Pool data loaded from InfluxDB in ${totalTime}ms`);
    console.log(`📈 Response data:`, {
      salt: poolData.chlorinator.salt.instant,
      waterTemp: poolData.dashboard.temperature.actual,
      cellVoltage: poolData.chlorinator.cell.voltage,
      pumpStatus: poolData.filter.status,
      weatherTemp: poolData.weather.temperature
    });

    res.json({
      success: true,
      data: poolData,
      timestamp: new Date().toISOString(),
      source: 'influxdb',
      performance: {
        totalTime,
        influxQueryTime,
        dataProcessingTime
      }
    });

  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`❌ Pool data fetch error after ${totalTime}ms:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch pool data from InfluxDB',
      performance: { totalTime }
    });
  }
});

// Get time series data for charts (sources from InfluxDB)
router.get('/timeseries', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    
    // Try to get data from InfluxDB first
    const dataPoints = await influxDBService.queryDataPoints(startTime, endTime);
    const stats = await influxDBService.getStats();
    
    // If InfluxDB is not available, fall back to in-memory storage
    if (dataPoints.length === 0) {
      console.log('InfluxDB data not available, falling back to in-memory storage');
      const fallbackData = timeSeriesService.getDataPoints(hours);
      const fallbackStats = timeSeriesService.getStats();
      
      return res.json({
        success: true,
        data: fallbackData,
        hours,
        stats: fallbackStats,
        source: 'memory'
      });
    }
    
    res.json({
      success: true,
      data: dataPoints,
      hours,
      stats,
      source: 'influxdb'
    });
  } catch (error) {
    console.error('Time series data fetch error:', error);
    
    // Fall back to in-memory storage on error
    try {
      const hours = parseInt(req.query.hours) || 24;
      const dataPoints = timeSeriesService.getDataPoints(hours);
      const stats = timeSeriesService.getStats();
      
      res.json({
        success: true,
        data: dataPoints,
        hours,
        stats,
        source: 'memory'
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Failed to fetch time series data' });
    }
  }
});

// Get time series statistics
router.get('/timeseries/stats', (req, res) => {
  try {
    const stats = timeSeriesService.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Time series stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch time series statistics' });
  }
});

// Get persistent time series data from InfluxDB
router.get('/timeseries/persistent', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    
    const dataPoints = await influxDBService.queryDataPoints(startTime, endTime);
    const stats = await influxDBService.getStats();
    
    res.json({
      success: true,
      data: dataPoints,
      hours,
      stats
    });
  } catch (error) {
    console.error('Persistent time series data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch persistent time series data' });
  }
});

// Get annotations from InfluxDB
router.get('/annotations', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    
    const annotations = await influxDBService.queryAnnotations(startTime, endTime);
    
    res.json({
      success: true,
      data: annotations,
      hours
    });
  } catch (error) {
    console.error('Annotations fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

// Store a new annotation
router.post('/annotations', async (req, res) => {
  try {
    const { timestamp, title, description, category, metadata } = req.body;
    
    if (!timestamp || !title) {
      return res.status(400).json({ error: 'Timestamp and title are required' });
    }
    
    const annotation = {
      timestamp,
      title,
      description: description || '',
      category: category || 'note',
      metadata: metadata || {}
    };
    
    const success = await influxDBService.storeAnnotation(annotation);
    
    if (success) {
      res.json({
        success: true,
        message: 'Annotation stored successfully',
        annotation
      });
    } else {
      res.status(500).json({ error: 'Failed to store annotation' });
    }
  } catch (error) {
    console.error('Annotation storage error:', error);
    res.status(500).json({ error: 'Failed to store annotation' });
  }
});

// Get InfluxDB statistics
router.get('/influxdb/stats', async (req, res) => {
  try {
    const stats = await influxDBService.getStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('InfluxDB stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch InfluxDB statistics' });
  }
});

// Get pump state information and recent annotations
router.get('/pump/state', async (req, res) => {
  try {
    const currentState = pumpStateTracker.getCurrentState();
    
    // Get recent pump-related annotations
    const hours = parseInt(req.query.hours) || 24;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    
    const annotations = await influxDBService.queryAnnotations(startTime, endTime);
    const pumpAnnotations = annotations.filter(ann => 
      ann.category === 'pump_state_change' || 
      ann.title?.includes('Pump') ||
      ann.description?.includes('pump')
    );
    
    res.json({
      success: true,
      currentState,
      pumpAnnotations,
      hours
    });
  } catch (error) {
    console.error('Pump state fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pump state information' });
  }
});

// Get 24-hour rolling average for salt levels
router.get('/salt/average', async (req, res) => {
  try {
    // Use the time series endpoint that we know works
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000));
    
    // Get data from the time series endpoint
    const timeSeriesResponse = await fetch(`${req.protocol}://${req.get('host')}/api/pool/timeseries?hours=24`);
    if (!timeSeriesResponse.ok) {
      throw new Error('Failed to fetch time series data');
    }
    
    const timeSeriesResult = await timeSeriesResponse.json();
    if (!timeSeriesResult.success || !timeSeriesResult.data) {
      throw new Error('Invalid time series response');
    }
    
    // Filter for salt data and calculate average
    const saltDataPoints = timeSeriesResult.data.filter(dp => dp.saltInstant !== null && dp.saltInstant !== undefined);
    
    let rollingAverage = null;
    if (saltDataPoints.length > 0) {
      const sum = saltDataPoints.reduce((acc, dp) => acc + dp.saltInstant, 0);
      rollingAverage = Math.round(sum / saltDataPoints.length);
    }
    
    // Get current salt value
    const currentSalt = saltDataPoints.length > 0 ? saltDataPoints[saltDataPoints.length - 1].saltInstant : null;
    
    // Calculate trend: current value vs value from 24 hours ago
    let trend = null;
    if (saltDataPoints.length > 0) {
      // Get the oldest data point (closest to 24 hours ago)
      const oldestSalt = saltDataPoints[0].saltInstant;
      if (currentSalt !== null && oldestSalt !== null) {
        trend = currentSalt - oldestSalt;
      }
    }
    
    res.json({
      success: true,
      rollingAverage,
      currentSalt,
      trend,
      dataPointsCount: saltDataPoints.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Salt average fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch salt rolling average',
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint for salt average calculation
router.get('/salt/debug', async (req, res) => {
  try {
    // Test the connection
    const isConnected = influxDBService.isConnected;
    
    // Get raw data points
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000));
    const dataPoints = await influxDBService.queryDataPoints(startTime, endTime);
    
    // Filter for salt data
    const saltDataPoints = dataPoints.filter(dp => dp.saltInstant !== null && dp.saltInstant !== undefined);
    
    // Calculate average manually
    let manualAverage = null;
    if (saltDataPoints.length > 0) {
      const sum = saltDataPoints.reduce((acc, dp) => acc + dp.saltInstant, 0);
      manualAverage = Math.round(sum / saltDataPoints.length);
    }
    
    res.json({
      success: true,
      isConnected,
      totalDataPoints: dataPoints.length,
      saltDataPoints: saltDataPoints.length,
      manualAverage,
      sampleSaltValues: saltDataPoints.slice(0, 5).map(dp => ({ timestamp: dp.timestamp, saltInstant: dp.saltInstant })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Salt debug error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to see raw InfluxDB data
router.get('/debug-influxdb', async (req, res) => {
  try {
    console.log('🔍 Debug: Querying raw InfluxDB data...');
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000)); // Last 24 hours
    
    // Simple query to see all data
    const fluxQuery = `
      from(bucket: "${influxDBService.config.bucket}")
        |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
        |> filter(fn: (r) => r._measurement == "pool_metrics")
        |> limit(n: 10)
    `;
    
    console.log('🔍 Debug query:', fluxQuery);
    
    const dataPoints = [];
    for await (const {values, tableMeta} of influxDBService.queryApi.iterateRows(fluxQuery)) {
      const o = tableMeta.toObject(values);
      dataPoints.push(o);
    }
    
    console.log(`🔍 Debug: Found ${dataPoints.length} raw data points`);
    
    res.json({
      success: true,
      query: fluxQuery,
      dataPoints: dataPoints,
      count: dataPoints.length
    });
    
  } catch (error) {
    console.error('❌ Debug query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Weather Alert Endpoints

// Get currently active weather alerts
router.get('/alerts', async (req, res) => {
  try {
    console.log('⚠️ Fetching active weather alerts...');
    
    const dashboardAlerts = await weatherAlerts.getDashboardAlerts();
    
    res.json({
      success: true,
      data: dashboardAlerts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather alerts fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch weather alerts',
      timestamp: new Date().toISOString()
    });
  }
});

// Get weather alert history
router.get('/alerts/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    console.log(`⚠️ Fetching weather alert history for last ${hours} hours...`);
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    
    const alerts = await influxDBService.queryWeatherAlerts(startTime, endTime);
    const stats = await influxDBService.getWeatherAlertStats(startTime, endTime);
    
    res.json({
      success: true,
      data: {
        alerts: alerts,
        stats: stats,
        timeRange: {
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          hours: hours
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather alert history fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch weather alert history',
      timestamp: new Date().toISOString()
    });
  }
});

// Get weather alert statistics
router.get('/alerts/stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    console.log(`📊 Fetching weather alert statistics for last ${hours} hours...`);
    
    const stats = await weatherAlerts.getAlertStats(hours);
    
    res.json({
      success: true,
      data: stats,
      timeRange: {
        hours: hours,
        endTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather alert stats fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch weather alert statistics',
      timestamp: new Date().toISOString()
    });
  }
});

// Get weather time series data
router.get('/weather/timeseries', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    console.log(`📊 Fetching weather time series data for last ${days} days...`);
    
    const historicalData = await weatherService.getHistoricalWeather(days);
    
    if (!historicalData) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch weather time series data',
        timestamp: new Date().toISOString()
      });
    }
    
    // Combine historical weather data with alert count from the last 7 days
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (7 * 24 * 60 * 60 * 1000));
    const alertStats = await influxDBService.getWeatherAlertStats(startTime, endTime);
    
    res.json({
      success: true,
      data: {
        ...historicalData,
        alertCount7d: alertStats ? alertStats.totalAlerts : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Weather time series fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch weather time series data',
      timestamp: new Date().toISOString()
    });
  }
});

// Check if there are active weather alerts
router.get('/alerts/active', async (req, res) => {
  try {
    const hasAlerts = await weatherAlerts.hasActiveAlerts();
    
    res.json({
      success: true,
      data: {
        hasActiveAlerts: hasAlerts,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Active alerts check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check active alerts',
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for generating mock data (development only)
router.get('/test/mock-data', async (req, res) => {
  try {
    console.log('🧪 Generating mock pool data for testing...');
    
    // Generate mock data point
    const mockData = {
      timestamp: new Date().toISOString(),
      saltInstant: 3200 + Math.floor(Math.random() * 200), // Random salt between 3200-3400
      waterTemp: 82 + Math.floor(Math.random() * 6), // Random temp between 82-88
      cellVoltage: 23.5 + Math.random() * 2, // Random voltage between 23.5-25.5
      cellTemp: 85 + Math.floor(Math.random() * 5), // Random cell temp between 85-90
      pumpStatus: Math.random() > 0.3, // 70% chance pump is on
      weatherTemp: 75 + Math.floor(Math.random() * 10) // Random weather temp between 75-85
    };
    
    // Store mock data in InfluxDB
    await influxDBService.storeDataPoint(mockData);
    
    console.log('✅ Mock data stored successfully');
    
    res.json({
      success: true,
      message: 'Mock data generated and stored',
      data: mockData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating mock data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate mock data',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check credential status (development only)
router.get('/debug/credentials', async (req, res) => {
  try {
    const credStatus = credentials.logCredentialStatus(true);
    const envVars = {
      HAYWARD_USERNAME: process.env.HAYWARD_USERNAME ? '[SET]' : '[NOT SET]',
      HAYWARD_PASSWORD: process.env.HAYWARD_PASSWORD ? '[SET]' : '[NOT SET]'
    };
    
    res.json({
      success: true,
      credentialStatus: credStatus,
      environmentVariables: envVars,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error checking credentials:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check credentials',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
