const express = require('express');
const influxDBService = require('../services/influxDBService');
const timeSeriesService = require('../services/timeSeriesService');
const pumpStateTracker = require('../services/pumpStateTracker');

/** @type {import('express').Router} */
const router = express.Router();

// Get current pool data from InfluxDB (fastest response)
router.get('/data', async (req, res) => {
  try {
    console.log('📊 Fetching current pool data...');
    const startTime = Date.now();

    // First, try to get data from in-memory storage (immediate access)
    const { getMostRecentPoolData } = require('../services/poolDataService');
    const inMemoryData = getMostRecentPoolData();
    
    if (inMemoryData) {
      console.log('📦 Returning in-memory pool data (immediate access)');
      const loadTime = Date.now() - startTime;
      console.log(`✅ Pool data loaded from memory in ${loadTime}ms`);
      
      res.json({
        success: true,
        data: inMemoryData,
        timestamp: new Date().toISOString(),
        source: 'memory'
      });
      return;
    }

    // Fallback to time series data if no in-memory data available
    console.log('📊 No in-memory data, fetching from time series...');
    const timeSeriesResponse = await fetch(`${req.protocol}://${req.get('host')}/api/pool/timeseries?hours=1`);
    if (!timeSeriesResponse.ok) {
      throw new Error('Failed to fetch time series data');
    }
    
    const timeSeriesResult = await timeSeriesResponse.json();
    if (!timeSeriesResult.success || !timeSeriesResult.data || timeSeriesResult.data.length === 0) {
      return res.status(404).json({ 
        error: 'No data available',
        message: 'Pool data not yet collected. Check cron job status.'
      });
    }

    // Get the most recent data point
    const latestData = timeSeriesResult.data[timeSeriesResult.data.length - 1];
    
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

    const loadTime = Date.now() - startTime;
    console.log(`✅ Pool data loaded from time series in ${loadTime}ms`);

    res.json({
      success: true,
      data: poolData,
      timestamp: new Date().toISOString(),
      source: 'timeseries'
    });

  } catch (error) {
    console.error('Pool data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pool data from InfluxDB' });
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
    const influxDBService = require('../services/influxDBService');
    
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

module.exports = router;
