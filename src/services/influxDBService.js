const { InfluxDB, Point, WriteApi } = require('@influxdata/influxdb-client');

/**
 * @typedef {object} TimeSeriesPoint
 * @property {string} timestamp - ISO timestamp
 * @property {number|null} saltInstant - Chlorinator salt instant value
 * @property {number|null} cellTemp - Cell temperature value
 * @property {number|null} cellVoltage - Cell voltage value
 * @property {number|null} waterTemp - Water temperature value
 */

/**
 * @typedef {object} Annotation
 * @property {string} timestamp - ISO timestamp
 * @property {string} title - Annotation title
 * @property {string} description - Annotation description
 * @property {string} category - Annotation category (e.g., 'maintenance', 'event', 'note')
 * @property {object} metadata - Additional metadata
 */

class InfluxDBService {
  constructor() {
    this.client = null;
    this.writeApi = null;
    this.queryApi = null;
    this.isConnected = false;
    
    // Configuration from environment variables
    this.config = {
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUXDB_TOKEN,
      org: process.env.INFLUXDB_ORG,
      bucket: process.env.INFLUXDB_BUCKET || 'pool_metrics'
    };
    
    this.initialize();
  }

  /**
   * Initialize InfluxDB connection
   */
  initialize() {
    if (!this.config.url || !this.config.token || !this.config.org) {
      console.warn('InfluxDB configuration missing. Time series storage disabled.');
      return;
    }

    try {
      this.client = new InfluxDB({
        url: this.config.url,
        token: this.config.token
      });

      this.writeApi = this.client.getWriteApi(this.config.org, this.config.bucket, 'ms');
      this.queryApi = this.client.getQueryApi(this.config.org);
      this.isConnected = true;

      console.log('InfluxDB connected successfully');
    } catch (error) {
      console.error('InfluxDB connection failed:', error);
      this.isConnected = false;
    }
  }

  /**
   * Store a time series data point
   * @param {TimeSeriesPoint} dataPoint - The data point to store
   * @returns {Promise<boolean>} Success status
   */
  async storeDataPoint(dataPoint) {
    if (!this.isConnected) {
      console.warn('InfluxDB not connected, skipping data point storage');
      return false;
    }

    try {
      const point = new Point('pool_metrics')
        .timestamp(new Date(dataPoint.timestamp))
        .floatField('salt_instant', dataPoint.saltInstant)
        .floatField('cell_temp', dataPoint.cellTemp)
        .floatField('cell_voltage', dataPoint.cellVoltage)
        .floatField('water_temp', dataPoint.waterTemp)
        .tag('source', 'hayward_omnilogic');

      await this.writeApi.writePoint(point);
      await this.writeApi.flush();
      
      return true;
    } catch (error) {
      console.error('Failed to store data point:', error);
      return false;
    }
  }

  /**
   * Store an annotation/event
   * @param {Annotation} annotation - The annotation to store
   * @returns {Promise<boolean>} Success status
   */
  async storeAnnotation(annotation) {
    if (!this.isConnected) {
      console.warn('InfluxDB not connected, skipping annotation storage');
      return false;
    }

    try {
      const point = new Point('pool_annotations')
        .timestamp(new Date(annotation.timestamp))
        .stringField('title', annotation.title)
        .stringField('description', annotation.description)
        .stringField('category', annotation.category)
        .stringField('metadata', JSON.stringify(annotation.metadata || {}));

      await this.writeApi.writePoint(point);
      await this.writeApi.flush();
      
      return true;
    } catch (error) {
      console.error('Failed to store annotation:', error);
      return false;
    }
  }

  /**
   * Query time series data for a specific time range
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Promise<TimeSeriesPoint[]>} Array of data points
   */
  async queryDataPoints(startTime, endTime) {
    if (!this.isConnected) {
      console.warn('InfluxDB not connected, returning empty dataset');
      return [];
    }

    try {
      const fluxQuery = `
        from(bucket: "${this.config.bucket}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "pool_metrics")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"])
      `;

      const results = [];
      
      for await (const {values, tableMeta} of this.queryApi.iterateRows(fluxQuery)) {
        const o = tableMeta.toObject(values);
        results.push({
          timestamp: o._time,
          saltInstant: o.salt_instant || null,
          cellTemp: o.cell_temp || null,
          cellVoltage: o.cell_voltage || null,
          waterTemp: o.water_temp || null
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to query data points:', error);
      return [];
    }
  }

  /**
   * Query annotations for a specific time range
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time
   * @returns {Promise<Annotation[]>} Array of annotations
   */
  async queryAnnotations(startTime, endTime) {
    if (!this.isConnected) {
      return [];
    }

    try {
      const fluxQuery = `
        from(bucket: "${this.config.bucket}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "pool_annotations")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"])
      `;

      const results = [];
      
      for await (const {values, tableMeta} of this.queryApi.iterateRows(fluxQuery)) {
        const o = tableMeta.toObject(values);
        results.push({
          timestamp: o._time,
          title: o.title || '',
          description: o.description || '',
          category: o.category || '',
          metadata: o.metadata ? JSON.parse(o.metadata) : {}
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to query annotations:', error);
      return [];
    }
  }

  /**
   * Get statistics about stored data
   * @returns {Promise<object>} Statistics object
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const fluxQuery = `
        from(bucket: "${this.config.bucket}")
          |> range(start: ${oneDayAgo.toISOString()}, stop: ${now.toISOString()})
          |> filter(fn: (r) => r._measurement == "pool_metrics")
          |> count()
      `;

      let dataPointCount = 0;
      for await (const {values, tableMeta} of this.queryApi.iterateRows(fluxQuery)) {
        const o = tableMeta.toObject(values);
        dataPointCount = o._value;
      }

      return {
        connected: true,
        dataPointCount,
        retentionDays: 30, // InfluxDB Cloud default
        bucket: this.config.bucket
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Close the connection
   */
  async close() {
    if (this.writeApi) {
      await this.writeApi.close();
    }
    if (this.client) {
      this.client.close();
    }
  }
}

// Create singleton instance
const influxDBService = new InfluxDBService();

module.exports = influxDBService; 