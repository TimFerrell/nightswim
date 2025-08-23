/**
 * Cron API Routes - New Architecture
 * Separated cron endpoints for better organization
 */

const express = require('express');
const { CronController } = require('./cron-controller');

const router = express.Router();

// Data collection endpoints
router.post('/v2/collect-data', CronController.collectPoolData);
router.get('/v2/collection-stats', CronController.getCollectionStats);
router.post('/v2/trigger-collection', CronController.triggerCollection);
router.delete('/v2/clear-data', CronController.clearData);

// Legacy endpoint mappings for backward compatibility
router.post('/collect-data', CronController.collectPoolData);

module.exports = router;