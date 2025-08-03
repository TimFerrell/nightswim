const express = require('express');
const sessionManager = require('../services/sessionManager');
const poolDataService = require('../services/poolDataService');
const timeSeriesService = require('../services/timeSeriesService');
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

    res.json(poolData);

  } catch (error) {
    console.error('Pool data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pool data' });
  }
});

// Get time series data for charts
router.get('/timeseries', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const dataPoints = timeSeriesService.getDataPoints(hours);
    const stats = timeSeriesService.getStats();
 
    res.json({
      success: true,
      data: dataPoints,
      hours,
      stats
    });
  } catch (error) {
    console.error('Time series data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
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

module.exports = router;
