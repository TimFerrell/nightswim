/**
 * Modern API Routes using New Architecture
 * These routes demonstrate the new domain-driven approach
 */

const express = require('express');
const { PoolDataController } = require('./pool-data-controller');
const { CronController } = require('./cron-controller');

const router = express.Router();

// Pool data endpoints (new architecture)
router.get('/v2/data', PoolDataController.getCurrentData);
router.get('/v2/timeseries', PoolDataController.getTimeSeries);
router.get('/v2/status', PoolDataController.getSystemStatus);
router.get('/v2/metrics/:metric/stats', PoolDataController.getMetricStats);

// Cron endpoints (new architecture) - these would typically be POST requests
router.post('/v2/collect', CronController.collectPoolData);
router.get('/v2/collect/stats', CronController.getCollectionStats);
router.post('/v2/collect/trigger', CronController.triggerCollection);
router.delete('/v2/collect/data', CronController.clearData);

// Health check endpoint
router.get('/v2/health', (req, res) => {
  res.json({
    status: 'healthy',
    architecture: 'domain-driven',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
