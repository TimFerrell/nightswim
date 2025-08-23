/**
 * Time Series Service
 * Manages in-memory time series data with performance optimizations
 */

class TimeSeriesService {
  constructor(maxPoints = 10000) {
    this.dataPoints = [];
    this.maxPoints = maxPoints;
    this.indexMap = new Map(); // For faster timestamp lookups
  }

  /**
   * Add a data point to the time series
   */
  async addDataPoint(dataPoint) {
    if (!dataPoint || !dataPoint.timestamp) {
      console.warn('⚠️ Invalid data point:', dataPoint);
      return false;
    }

    try {
      const timestamp = new Date(dataPoint.timestamp).getTime();

      // Check for duplicates
      if (this.indexMap.has(timestamp)) {
        console.log(`📊 Updating existing data point at ${dataPoint.timestamp}`);
        const index = this.indexMap.get(timestamp);
        this.dataPoints[index] = { ...dataPoint, timestamp };
      } else {
        // Add new data point
        this.dataPoints.push({ ...dataPoint, timestamp });
        this.indexMap.set(timestamp, this.dataPoints.length - 1);
      }

      // Maintain size limit
      this.enforceMaxPoints();

      // Keep data sorted by timestamp
      this.sortDataPoints();

      console.log(`📊 Time series now has ${this.dataPoints.length} data points`);
      return true;
    } catch (error) {
      console.error('❌ Error adding data point:', error);
      return false;
    }
  }

  /**
   * Get data points for the last N hours
   */
  getDataPoints(hours = 24) {
    if (hours <= 0) {
      return this.dataPoints.slice(); // Return all data
    }

    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.dataPoints.filter(point => point.timestamp >= cutoffTime);
  }

  /**
   * Get the latest data point
   */
  getLatestData() {
    if (this.dataPoints.length === 0) {
      return null;
    }

    // Data is kept sorted, so the last item is the newest
    return this.dataPoints[this.dataPoints.length - 1];
  }

  /**
   * Get statistics for a specific metric
   */
  getStatistics(metric, hours = 24) {
    const dataPoints = this.getDataPoints(hours);
    const values = dataPoints
      .map(point => point[metric])
      .filter(value => value !== null && value !== undefined && !isNaN(value));

    if (values.length === 0) {
      return {
        count: 0,
        min: null,
        max: null,
        avg: null,
        latest: null
      };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const latest = values[values.length - 1];

    return {
      count: values.length,
      min: parseFloat(min.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      avg: parseFloat(avg.toFixed(2)),
      latest: parseFloat(latest.toFixed(2))
    };
  }

  /**
   * Clear all data
   */
  clearData() {
    this.dataPoints = [];
    this.indexMap.clear();
    console.log('🗑️ Time series data cleared');
  }

  /**
   * Get current data count
   */
  getDataCount() {
    return this.dataPoints.length;
  }

  /**
   * Enforce maximum points limit with LRU eviction
   */
  enforceMaxPoints() {
    if (this.dataPoints.length <= this.maxPoints) {
      return;
    }

    const excessCount = this.dataPoints.length - this.maxPoints;
    console.log(`🔄 Removing ${excessCount} old data points to maintain limit of ${this.maxPoints}`);

    // Remove oldest data points
    const removedPoints = this.dataPoints.splice(0, excessCount);

    // Update index map
    this.rebuildIndexMap();

    console.log(`📊 Removed ${removedPoints.length} old data points`);
  }

  /**
   * Sort data points by timestamp
   */
  sortDataPoints() {
    this.dataPoints.sort((a, b) => a.timestamp - b.timestamp);
    this.rebuildIndexMap();
  }

  /**
   * Rebuild the index map after sorting or removing items
   */
  rebuildIndexMap() {
    this.indexMap.clear();
    this.dataPoints.forEach((point, index) => {
      this.indexMap.set(point.timestamp, index);
    });
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const pointSize = JSON.stringify(this.dataPoints[0] || {}).length;
    const totalSize = this.dataPoints.length * pointSize;
    const maxSize = this.maxPoints * pointSize;

    return {
      dataPoints: this.dataPoints.length,
      maxPoints: this.maxPoints,
      estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`,
      maxEstimatedSize: `${(maxSize / 1024).toFixed(2)} KB`,
      utilizationPercent: ((this.dataPoints.length / this.maxPoints) * 100).toFixed(1)
    };
  }
}

// Create singleton instance
const timeSeriesService = new TimeSeriesService();

module.exports = { TimeSeriesService, timeSeriesService };
