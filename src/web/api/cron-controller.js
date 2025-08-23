/**
 * Cron Controller - New Architecture
 * Handles scheduled data collection using domain services
 */

const { envConfig } = require('../../config');
const { PoolDataCollector } = require('../../domains/pool');
const { timeSeriesService, influxDBClient } = require('../../domains/monitoring');

class CronController {
  /**
   * Collect pool data using new architecture
   */
  static async collectPoolData(req, res) {
    console.log('🕐 [New Architecture] Starting scheduled pool data collection...');
    const startTime = Date.now();

    try {
      // Get pool credentials from environment
      const poolCredentials = envConfig.getPoolCredentials();
      
      if (!poolCredentials.username || !poolCredentials.password) {
        console.error('❌ [New Architecture] Pool credentials not configured');
        return res.status(500).json({
          success: false,
          error: 'Configuration error',
          message: 'Pool credentials not configured'
        });
      }

      // Create data collector
      const collector = new PoolDataCollector(poolCredentials);
      
      // Collect all pool data
      console.log('📊 [New Architecture] Collecting pool data...');
      const poolData = await collector.collectAllData();
      
      if (!poolData || !poolData.isValid()) {
        throw new Error('Invalid pool data collected');
      }

      // Convert to time series point
      const timeSeriesPoint = poolData.toTimeSeriesPoint();
      
      // Store in memory time series
      console.log('💾 [New Architecture] Storing data in memory time series...');
      await timeSeriesService.addDataPoint(timeSeriesPoint);
      
      // Store in InfluxDB
      console.log('💾 [New Architecture] Storing data in InfluxDB...');
      const influxResult = await influxDBClient.storeDataPoint(timeSeriesPoint);
      
      if (!influxResult) {
        console.warn('⚠️ [New Architecture] InfluxDB storage failed, but memory storage succeeded');
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ [New Architecture] Pool data collection completed successfully in ${totalTime}ms`);

      // Provide detailed response
      return res.json({
        success: true,
        message: 'Pool data collected successfully',
        data: {
          timestamp: poolData.timestamp,
          metrics: {
            waterTemp: timeSeriesPoint.waterTemp,
            saltLevel: timeSeriesPoint.saltInstant,
            pumpStatus: timeSeriesPoint.pumpStatus,
            cellVoltage: timeSeriesPoint.cellVoltage
          },
          storage: {
            memory: true,
            influxdb: influxResult,
            totalDataPoints: timeSeriesService.getDataCount()
          },
          performance: {
            collectionTime: totalTime,
            architecture: 'domain-driven'
          }
        }
      });

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('❌ [New Architecture] Pool data collection failed:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Collection failed',
        message: error.message,
        performance: {
          collectionTime: totalTime,
          architecture: 'domain-driven'
        }
      });
    }
  }

  /**
   * Get collection statistics
   */
  static async getCollectionStats(req, res) {
    try {
      const memoryStats = timeSeriesService.getMemoryStats();
      const influxStatus = influxDBClient.getConnectionStatus();
      const latestData = timeSeriesService.getLatestData();

      return res.json({
        success: true,
        statistics: {
          memory: memoryStats,
          influxdb: influxStatus,
          lastCollection: latestData?.timestamp || null,
          dataQuality: {
            hasRecentData: latestData ? (Date.now() - new Date(latestData.timestamp).getTime()) < 3600000 : false,
            completeness: this.calculateDataCompleteness(latestData)
          },
          architecture: 'domain-driven'
        }
      });

    } catch (error) {
      console.error('❌ [New Architecture] Error getting collection stats:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Stats retrieval failed',
        message: error.message
      });
    }
  }

  /**
   * Manual data collection trigger (for testing)
   */
  static async triggerCollection(req, res) {
    console.log('🚀 [New Architecture] Manual data collection triggered');
    
    // Reuse the main collection logic
    return await CronController.collectPoolData(req, res);
  }

  /**
   * Clear collected data (for testing/maintenance)
   */
  static async clearData(req, res) {
    try {
      const beforeCount = timeSeriesService.getDataCount();
      
      timeSeriesService.clearData();
      
      console.log(`🗑️ [New Architecture] Cleared ${beforeCount} data points from memory`);
      
      return res.json({
        success: true,
        message: `Cleared ${beforeCount} data points from memory`,
        note: 'InfluxDB data was not affected',
        architecture: 'domain-driven'
      });

    } catch (error) {
      console.error('❌ [New Architecture] Error clearing data:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Clear data failed',
        message: error.message
      });
    }
  }

  // Helper method to calculate data completeness
  static calculateDataCompleteness(dataPoint) {
    if (!dataPoint) return 0;
    
    const requiredFields = ['waterTemp', 'saltInstant', 'pumpStatus', 'cellVoltage'];
    const presentFields = requiredFields.filter(field => 
      dataPoint[field] !== null && dataPoint[field] !== undefined
    );
    
    return Math.round((presentFields.length / requiredFields.length) * 100);
  }
}

module.exports = { CronController };