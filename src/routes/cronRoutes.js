const express = require('express');
const sessionManager = require('../services/sessionManager');
const poolDataService = require('../services/poolDataService');
const credentials = require('../utils/credentials');

/** @type {import('express').Router} */
const router = express.Router();

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
    const authResult = await session.authenticate(credentials.username, credentials.password);
    
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
      }
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

module.exports = router; 