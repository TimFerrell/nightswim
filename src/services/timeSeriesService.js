/**
 * @typedef {object} TimeSeriesPoint
 * @property {string} timestamp - ISO timestamp
 * @property {number|null} saltInstant - Chlorinator salt instant value
 * @property {number|null} cellTemp - Cell temperature value
 * @property {number|null} cellVoltage - Cell voltage value
 * @property {number|null} waterTemp - Water temperature value
 */

/**
 * Backend time series storage with 24-hour retention
 * Stores data in memory with automatic cleanup of old entries
 */
class TimeSeriesService {
  constructor() {
    /** @type {TimeSeriesPoint[]} */
    this.dataPoints = [];
    this.retentionHours = 24; // Keep 24 hours of data
    this.maxPoints = 1440; // Maximum points (24 hours * 60 minutes)
    
    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // 1 hour
    
    // Initial cleanup
    this.cleanupOldData();
  }

    /**
   * Add a new data point
   * @param {TimeSeriesPoint} dataPoint - The data point to add
   */
  addDataPoint(dataPoint) {
    // Ensure timestamp is valid
    if (!dataPoint.timestamp) {
      dataPoint.timestamp = new Date().toISOString();
    }
    
    this.dataPoints.push(dataPoint);
    
    // Sort by timestamp to maintain chronological order
    this.dataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Remove duplicates (same timestamp)
    this.dataPoints = this.dataPoints.filter((point, index, array) => {
      if (index === 0) return true;
      return point.timestamp !== array[index - 1].timestamp;
    });
    
    // Keep only the last maxPoints
    if (this.dataPoints.length > this.maxPoints) {
      this.dataPoints = this.dataPoints.slice(-this.maxPoints);
    }
  }

  /**
   * Get data points for the last N hours
   * @param {number} hours - Number of hours to retrieve
   * @returns {TimeSeriesPoint[]} Array of data points
   */
  getDataPoints(hours = 24) {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const filteredPoints = this.dataPoints.filter(point => new Date(point.timestamp) > cutoffTime);
    
    // Return data in chronological order
    return filteredPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Get all data points
   * @returns {TimeSeriesPoint[]} All data points
   */
  getAllDataPoints() {
    return [...this.dataPoints];
  }

  /**
   * Clear old data points (older than retention period)
   * Automatically called by the cleanup interval
   */
  cleanupOldData() {
    const cutoffTime = new Date(Date.now() - (this.retentionHours * 60 * 60 * 1000));
    const beforeCount = this.dataPoints.length;
    this.dataPoints = this.dataPoints.filter(point => new Date(point.timestamp) > cutoffTime);
    const afterCount = this.dataPoints.length;
    
    if (beforeCount !== afterCount) {
      console.log(`TimeSeriesService: Cleaned up ${beforeCount - afterCount} old data points`);
    }
  }

  /**
   * Get statistics about the stored data
   * @returns {object} Statistics about the data
   */
  getStats() {
    const now = new Date();
    const oldestPoint = this.dataPoints.length > 0 ? new Date(this.dataPoints[0].timestamp) : null;
    const newestPoint = this.dataPoints.length > 0 ? new Date(this.dataPoints[this.dataPoints.length - 1].timestamp) : null;
    
    return {
      totalPoints: this.dataPoints.length,
      retentionHours: this.retentionHours,
      maxPoints: this.maxPoints,
      oldestTimestamp: oldestPoint,
      newestTimestamp: newestPoint,
      dataAgeHours: oldestPoint ? (now - oldestPoint) / (1000 * 60 * 60) : 0
    };
  }
}

// Create a singleton instance
const timeSeriesService = new TimeSeriesService();

module.exports = timeSeriesService;
