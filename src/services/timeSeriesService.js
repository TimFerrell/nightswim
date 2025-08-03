/**
 * @typedef {object} TimeSeriesPoint
 * @property {string} timestamp - ISO timestamp
 * @property {number|null} saltInstant - Chlorinator salt instant value
 * @property {number|null} cellTemp - Cell temperature value
 * @property {number|null} cellVoltage - Cell voltage value
 * @property {number|null} waterTemp - Water temperature value
 */

/**
 * Simple in-memory time series storage
 * In production, this should be replaced with a proper database
 */
class TimeSeriesService {
  constructor() {
    /** @type {TimeSeriesPoint[]} */
    this.dataPoints = [];
    this.maxPoints = 1000; // Keep last 1000 data points
  }

  /**
   * Add a new data point
   * @param {TimeSeriesPoint} dataPoint - The data point to add
   */
  addDataPoint(dataPoint) {
    this.dataPoints.push(dataPoint);

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
    return this.dataPoints.filter(point => new Date(point.timestamp) > cutoffTime);
  }

  /**
   * Get all data points
   * @returns {TimeSeriesPoint[]} All data points
   */
  getAllDataPoints() {
    return [...this.dataPoints];
  }

  /**
   * Clear old data points (older than specified hours)
   * @param {number} hours - Keep data points newer than this many hours
   */
  clearOldData(hours = 24) {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    this.dataPoints = this.dataPoints.filter(point => new Date(point.timestamp) > cutoffTime);
  }
}

// Create a singleton instance
const timeSeriesService = new TimeSeriesService();

module.exports = timeSeriesService;
