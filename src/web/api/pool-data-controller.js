/**
 * Pool Data API Controller
 * Modern API controller using new domain architecture
 */

const { timeSeriesService, influxDBClient } = require('../../domains/monitoring');
const { PoolData } = require('../../domains/pool');

class PoolDataController {
  /**
   * Get current pool data
   */
  static async getCurrentData(req, res) {
    const requestStartTime = Date.now();
    console.log('🚀 [New Architecture] /api/pool/data request started');

    try {
      // Try to get data from InfluxDB first
      const influxData = await influxDBClient.queryDataPoints(24, 1);
      
      if (influxData.length > 0) {
        const latestData = influxData[influxData.length - 1];
        const poolData = PoolData.fromTimeSeriesPoint(latestData);
        
        const totalTime = Date.now() - requestStartTime;
        console.log(`✅ [New Architecture] Data retrieved in ${totalTime}ms`);
        
        return res.json({
          success: true,
          data: poolData.toJSON(),
          source: 'influxdb',
          timestamp: poolData.timestamp,
          responseTime: totalTime
        });
      }

      // Fall back to in-memory time series
      const memoryData = timeSeriesService.getLatestData();
      if (memoryData) {
        const poolData = PoolData.fromTimeSeriesPoint(memoryData);
        
        const totalTime = Date.now() - requestStartTime;
        console.log(`✅ [New Architecture] Data retrieved from memory in ${totalTime}ms`);
        
        return res.json({
          success: true,
          data: poolData.toJSON(),
          source: 'memory',
          timestamp: poolData.timestamp,
          responseTime: totalTime
        });
      }

      // No data available
      const totalTime = Date.now() - requestStartTime;
      console.log(`❌ [New Architecture] No data available after ${totalTime}ms`);
      
      return res.status(200).json({
        success: false,
        error: 'No data available',
        message: 'Pool data not yet collected. Please check back later.',
        responseTime: totalTime
      });

    } catch (error) {
      const totalTime = Date.now() - requestStartTime;
      console.error('❌ [New Architecture] Error fetching pool data:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve pool data',
        responseTime: totalTime
      });
    }
  }

  /**
   * Get time series data
   */
  static async getTimeSeries(req, res) {
    try {
      const hours = parseInt(req.query.hours) || 24;
      const limit = parseInt(req.query.limit) || 1000;

      console.log(`📊 [New Architecture] Fetching time series data: ${hours}h, limit: ${limit}`);

      // Try InfluxDB first
      const influxData = await influxDBClient.queryDataPoints(hours, limit);
      
      if (influxData.length > 0) {
        return res.json({
          success: true,
          data: influxData,
          source: 'influxdb',
          count: influxData.length,
          hours,
          limit
        });
      }

      // Fall back to memory
      const memoryData = timeSeriesService.getDataPoints(hours);
      
      return res.json({
        success: true,
        data: memoryData.slice(0, limit),
        source: 'memory',
        count: Math.min(memoryData.length, limit),
        hours,
        limit
      });

    } catch (error) {
      console.error('❌ [New Architecture] Error fetching time series:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve time series data'
      });
    }
  }

  /**
   * Get system status
   */
  static async getSystemStatus(req, res) {
    try {
      const influxStatus = influxDBClient.getConnectionStatus();
      const memoryStats = timeSeriesService.getMemoryStats();

      return res.json({
        success: true,
        status: {
          influxdb: influxStatus.connected ? 'connected' : 'disconnected',
          memory: {
            dataPoints: memoryStats.dataPoints,
            utilization: memoryStats.utilizationPercent + '%',
            size: memoryStats.estimatedSize
          },
          lastDataUpdate: timeSeriesService.getLatestData()?.timestamp || null,
          uptime: process.uptime(),
          architecture: 'domain-driven'
        }
      });

    } catch (error) {
      console.error('❌ [New Architecture] Error getting system status:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve system status'
      });
    }
  }

  /**
   * Get statistics for a specific metric
   */
  static async getMetricStats(req, res) {
    try {
      const { metric } = req.params;
      const hours = parseInt(req.query.hours) || 24;

      const stats = timeSeriesService.getStatistics(metric, hours);
      
      return res.json({
        success: true,
        metric,
        hours,
        statistics: stats
      });

    } catch (error) {
      console.error('❌ [New Architecture] Error getting metric stats:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve metric statistics'
      });
    }
  }
}

module.exports = { PoolDataController };