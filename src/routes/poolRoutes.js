const express = require('express');
const sessionManager = require('../services/sessionManager');
const poolDataService = require('../services/poolDataService');
const timeSeriesService = require('../services/timeSeriesService');
const influxDBService = require('../services/influxDBService');
const pumpStateTracker = require('../services/pumpStateTracker');
const credentials = require('../utils/credentials');

/** @type {import('express').Router} */
const router = express.Router();

// Get all Hayward data in a single JSON payload
router.get('/data', async (req, res) => {
  try {
    // Ensure we have a session ID (Express will create one if it doesn't exist)
    if (!req.sessionID) {
      req.session = {};
    }

    // Check both Express session and our custom session
    const expressSessionAuthenticated = req.session && req.session.authenticated;
    const haywardSessionId = req.session && req.session.haywardSessionId;
    let session = sessionManager.getSession(haywardSessionId || req.sessionID);

    // If not authenticated, automatically authenticate
    if (!expressSessionAuthenticated || !session || !session.authenticated) {
      console.log('🔐 Auto-authenticating for pool data request...');

      // Create a new session
      const sessionId = req.sessionID;
      session = sessionManager.getSession(sessionId);

      // Authenticate using hardcoded credentials
      const authResult = await session.authenticate(credentials.username, credentials.password);

      if (!authResult.success) {
        return res.status(401).json({ error: `Authentication failed: ${authResult.message}` });
      }

      // Store the session
      sessionManager.setSession(sessionId, session);

      // Mark session as authenticated in Express session
      req.session.authenticated = true;
      req.session.haywardSessionId = sessionId;

      console.log('✅ Auto-authentication successful');
    }

    // Fetch all pool data
    const poolData = await poolDataService.fetchAllPoolData(session);

    res.json({
      success: true,
      data: poolData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Pool data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pool data' });
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

module.exports = router;
