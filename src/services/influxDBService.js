const { InfluxDB, Point } = require('@influxdata/influxdb-client');

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

/**
 *
 */
class InfluxDBService {
  /**
   *
   */
  constructor() {
    this.client = null;
    this.writeApi = null;
    this.queryApi = null;
    this.isConnected = false;

    // Configuration from environment variables
    this.config = {
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN, // Updated to match Vercel env var
      org: process.env.INFLUXDB_ORG,
      bucket: process.env.INFLUXDB_BUCKET || 'pool_metrics'
    };

    this.initialize();
  }

  /**
   * Initialize InfluxDB connection
   */
  async initialize() {
    const initStartTime = Date.now();
    console.log('🔌 Initializing InfluxDB connection...');

    try {
      // Check if we have the required configuration
      if (!this.config.url || !this.config.token || !this.config.org || !this.config.bucket) {
        console.error('❌ InfluxDB configuration missing:', {
          hasUrl: !!this.config.url,
          hasToken: !!this.config.token,
          hasOrg: !!this.config.org,
          hasBucket: !!this.config.bucket
        });
        return false;
      }

      console.log(`🔌 Connecting to InfluxDB at ${this.config.url}...`);
      const connectionStartTime = Date.now();

      this.client = new InfluxDB({
        url: this.config.url,
        token: this.config.token,
        timeout: 10000
      });

      const connectionTime = Date.now() - connectionStartTime;
      console.log(`✅ InfluxDB client created in ${connectionTime}ms`);

      // Test the connection
      console.log('🔍 Testing InfluxDB connection...');
      const testStartTime = Date.now();

      this.queryApi = this.client.getQueryApi(this.config.org);
      this.writeApi = this.client.getWriteApi(this.config.org, this.config.bucket, 'ms');

      const testTime = Date.now() - testStartTime;
      console.log(`✅ InfluxDB APIs initialized in ${testTime}ms`);

      // Test a simple query to verify connection
      console.log('🔍 Testing InfluxDB query capability...');
      const queryTestStart = Date.now();

      const testQuery = `from(bucket: "${this.config.bucket}") |> range(start: -1m) |> limit(n: 1)`;
      let testResult = false;

      try {
        for await (const { values: _values, tableMeta: _tableMeta } of this.queryApi.iterateRows(testQuery)) {
          testResult = true;
          break;
        }
      } catch (queryError) {
        console.warn('⚠️ Test query failed (this might be normal if no data exists):', queryError.message);
      }

      const queryTestTime = Date.now() - queryTestStart;
      console.log(`✅ InfluxDB query test completed in ${queryTestTime}ms (success: ${testResult})`);

      this.isConnected = true;
      const totalInitTime = Date.now() - initStartTime;
      console.log(`🎉 InfluxDB initialization completed successfully in ${totalInitTime}ms`);

      return true;
    } catch (error) {
      const totalInitTime = Date.now() - initStartTime;
      console.error(`❌ InfluxDB initialization failed after ${totalInitTime}ms:`, error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Store a data point in InfluxDB
   * @param {object} dataPoint - Data point to store
   * @returns {Promise<boolean>} Success status
   */
  async storeDataPoint(dataPoint) {
    const writeStartTime = Date.now();
    console.log(`💾 Storing data point: ${dataPoint.timestamp}`);

    if (!this.isConnected) {
      console.warn('❌ InfluxDB not connected, skipping data point storage');
      return false;
    }

    try {
      // Validate data point
      const validationStart = Date.now();
      if (!dataPoint.timestamp) {
        console.error('❌ Data point missing timestamp');
        return false;
      }
      const validationTime = Date.now() - validationStart;

      // Create InfluxDB point
      const pointCreationStart = Date.now();
      const point = new Point('pool_metrics')
        .timestamp(new Date(dataPoint.timestamp));

      // Add fields conditionally to avoid null values
      if (dataPoint.saltInstant !== null && dataPoint.saltInstant !== undefined) {
        point.floatField('salt_instant', dataPoint.saltInstant);
      }
      if (dataPoint.cellTemp !== null && dataPoint.cellTemp !== undefined) {
        point.floatField('cell_temp', dataPoint.cellTemp);
      }
      if (dataPoint.cellVoltage !== null && dataPoint.cellVoltage !== undefined) {
        point.floatField('cell_voltage', dataPoint.cellVoltage);
      }
      if (dataPoint.waterTemp !== null && dataPoint.waterTemp !== undefined) {
        point.floatField('water_temp', dataPoint.waterTemp);
      }
      if (dataPoint.airTemp !== null && dataPoint.airTemp !== undefined) {
        point.floatField('air_temp', dataPoint.airTemp);
      }
      if (dataPoint.weatherTemp !== null && dataPoint.weatherTemp !== undefined) {
        point.floatField('weather_temp', dataPoint.weatherTemp);
      }
      if (dataPoint.pumpStatus !== null && dataPoint.pumpStatus !== undefined) {
        point.booleanField('pump_status', dataPoint.pumpStatus);
      }

      const pointCreationTime = Date.now() - pointCreationStart;
      console.log(`📝 Point created in ${pointCreationTime}ms with ${Object.keys(point.fields).length} fields`);

      // Write to InfluxDB
      const writeStart = Date.now();
      await this.writeApi.writePoint(point);
      const writeTime = Date.now() - writeStart;
      console.log(`✍️ Point written in ${writeTime}ms`);

      // Flush to ensure data is persisted
      const flushStart = Date.now();
      await this.writeApi.flush();
      const flushTime = Date.now() - flushStart;
      console.log(`🔄 Flush completed in ${flushTime}ms`);

      const totalTime = Date.now() - writeStartTime;
      console.log(`✅ Data point stored successfully in ${totalTime}ms (validation: ${validationTime}ms, creation: ${pointCreationTime}ms, write: ${writeTime}ms, flush: ${flushTime}ms)`);

      return true;
    } catch (error) {
      const totalTime = Date.now() - writeStartTime;
      console.error(`❌ Failed to store data point after ${totalTime}ms:`, error);
      return false;
    }
  }

  /**
   * Get the most recent salt value from InfluxDB
   * @returns {Promise<number|null>} Current salt value or null if not available
   */
  async getCurrentSalt() {
    if (!this.isConnected) {
      console.warn('InfluxDB not connected, cannot get current salt value');
      return null;
    }

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (1 * 60 * 60 * 1000)); // Last hour

      const fluxQuery = `
        from(bucket: "${this.config.bucket}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "pool_metrics")
          |> filter(fn: (r) => r._field == "salt_instant")
          |> filter(fn: (r) => r._value != null)
          |> last()
      `;

      let currentSalt = null;

      for await (const { values, tableMeta } of this.queryApi.iterateRows(fluxQuery)) {
        const o = tableMeta.toObject(values);
        if (o._value !== null && o._value !== undefined) {
          currentSalt = Math.round(o._value);
          break;
        }
      }

      console.log(`📊 Current salt value: ${currentSalt}`);
      return currentSalt;
    } catch (error) {
      console.error('Error getting current salt value:', error);
      return null;
    }
  }

  /**
   * Get 24-hour rolling average for salt levels
   * @returns {Promise<number|null>} Rolling average or null if no data
   */
  async getSaltRollingAverage() {
    if (!this.isConnected) {
      console.warn('InfluxDB not connected, cannot calculate rolling average');
      return null;
    }

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago

      // Use a simpler approach - get all salt values and calculate average
      const fluxQuery = `
        from(bucket: "${this.config.bucket}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "pool_metrics")
          |> filter(fn: (r) => r._field == "salt_instant")
          |> filter(fn: (r) => r._value != null)
          |> mean()
      `;

      let rollingAverage = null;

      for await (const { values, tableMeta } of this.queryApi.iterateRows(fluxQuery)) {
        const o = tableMeta.toObject(values);
        if (o._value !== null && o._value !== undefined) {
          rollingAverage = Math.round(o._value);
          break;
        }
      }

      console.log(`📊 Salt rolling average (24h): ${rollingAverage}`);
      return rollingAverage;
    } catch (error) {
      console.error('Error calculating salt rolling average:', error);
      return null;
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
   * Query data points from InfluxDB
   * @param {Date} startTime - Start time for query
   * @param {Date} endTime - End time for query
   * @returns {Promise<Array>} Array of data points
   */
  async queryDataPoints(startTime, endTime) {
    const queryStartTime = Date.now();
    console.log(`🔍 InfluxDB Query Start: ${startTime.toISOString()} to ${endTime.toISOString()}`);

    if (!this.isConnected) {
      console.warn('❌ InfluxDB not connected, cannot query data points');
      return [];
    }

    try {
      const fluxQuery = `
        from(bucket: "${this.config.bucket}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "pool_metrics")
      `;

      console.log(`📝 Executing Flux query: ${fluxQuery.substring(0, 100)}...`);
      const queryExecutionStart = Date.now();

      // Group data by timestamp and combine fields
      const dataByTimestamp = new Map();
      let rowCount = 0;

      for await (const { values, tableMeta } of this.queryApi.iterateRows(fluxQuery)) {
        const rowStart = Date.now();
        const o = tableMeta.toObject(values);
        const rowProcessTime = Date.now() - rowStart;

        const timestamp = o._time;
        const field = o._field;
        const value = o._value;

        if (!dataByTimestamp.has(timestamp)) {
          dataByTimestamp.set(timestamp, {
            timestamp,
            saltInstant: null,
            cellTemp: null,
            cellVoltage: null,
            waterTemp: null,
            airTemp: null,
            weatherTemp: null,
            pumpStatus: null
          });
        }

        const dataPoint = dataByTimestamp.get(timestamp);

        // Map field names to our data structure
        switch (field) {
        case 'salt_instant':
          dataPoint.saltInstant = value;
          break;
        case 'cell_temp':
          dataPoint.cellTemp = value;
          break;
        case 'cell_voltage':
          dataPoint.cellVoltage = value;
          break;
        case 'water_temp':
          dataPoint.waterTemp = value;
          break;
        case 'air_temp':
          dataPoint.airTemp = value;
          break;
        case 'weather_temp':
          dataPoint.weatherTemp = value;
          break;
        case 'pump_status':
          dataPoint.pumpStatus = value;
          break;
        }

        rowCount++;
        if (rowCount % 100 === 0) {
          console.log(`📊 Processed ${rowCount} rows, last row took ${rowProcessTime}ms`);
        }
      }

      // Convert map to array and sort by timestamp
      const dataPoints = Array.from(dataByTimestamp.values())
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      const queryExecutionTime = Date.now() - queryExecutionStart;
      const totalTime = Date.now() - queryStartTime;

      console.log('📊 InfluxDB Query Complete:');
      console.log(`   - Total time: ${totalTime}ms`);
      console.log(`   - Query execution: ${queryExecutionTime}ms`);
      console.log(`   - Data processing: ${totalTime - queryExecutionTime}ms`);
      console.log(`   - Raw rows processed: ${rowCount}`);
      console.log(`   - Combined data points: ${dataPoints.length}`);
      console.log(`   - Time range: ${Math.round((endTime - startTime) / (1000 * 60))} minutes`);

      if (dataPoints.length > 0) {
        const firstTimestamp = new Date(dataPoints[0].timestamp);
        const lastTimestamp = new Date(dataPoints[dataPoints.length - 1].timestamp);
        console.log(`   - Data range: ${firstTimestamp.toISOString()} to ${lastTimestamp.toISOString()}`);

        // Log the most recent data point for debugging
        const latest = dataPoints[dataPoints.length - 1];
        console.log('   - Latest data point:', {
          timestamp: latest.timestamp,
          saltInstant: latest.saltInstant,
          waterTemp: latest.waterTemp,
          cellVoltage: latest.cellVoltage,
          pumpStatus: latest.pumpStatus,
          weatherTemp: latest.weatherTemp
        });
      }

      return dataPoints;
    } catch (error) {
      const totalTime = Date.now() - queryStartTime;
      console.error(`❌ InfluxDB Query Error after ${totalTime}ms:`, error);
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

      for await (const { values, tableMeta } of this.queryApi.iterateRows(fluxQuery)) {
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
      for await (const { values, tableMeta } of this.queryApi.iterateRows(fluxQuery)) {
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
   * Test InfluxDB connection and configuration
   * @returns {Promise<object>} Test results
   */
  async testConnection() {
    console.log('🧪 Testing InfluxDB connection...');

    const results = {
      configCheck: {
        url: !!this.config.url,
        token: !!this.config.token,
        org: !!this.config.org,
        bucket: this.config.bucket
      },
      connectionStatus: this.isConnected,
      clientExists: !!this.client,
      writeApiExists: !!this.writeApi,
      queryApiExists: !!this.queryApi
    };

    console.log('📋 Test results:', results);

    if (this.isConnected && this.writeApi) {
      try {
        console.log('🧪 Testing write operation...');
        const testPoint = new Point('connection_test')
          .timestamp(new Date())
          .stringField('test', 'connection_test')
          .tag('source', 'test');

        await this.writeApi.writePoint(testPoint);
        await this.writeApi.flush();
        console.log('✅ Write test successful');
        results.writeTest = true;
      } catch (error) {
        console.error('❌ Write test failed:', error);
        results.writeTest = false;
        results.writeError = error.message;
      }
    }

    return results;
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

  /**
   * Store a weather alert as a range annotation
   * @param {object} alertData - Weather alert data
   * @param {string} alertData.id - Alert ID
   * @param {string} alertData.event - Event type (e.g., 'Severe Thunderstorm Warning')
   * @param {string} alertData.severity - Alert severity
   * @param {string} alertData.urgency - Alert urgency
   * @param {string} alertData.certainty - Alert certainty
   * @param {string} alertData.description - Alert description
   * @param {string} alertData.instruction - Alert instructions
   * @param {string} alertData.startTime - Alert start time (ISO string)
   * @param {string} alertData.endTime - Alert end time (ISO string)
   * @param {object} alertData.geometry - Alert geometry data
   * @returns {Promise<boolean>} Success status
   */
  async storeWeatherAlert(alertData) {
    if (!this.isConnected) {
      console.warn('InfluxDB not connected, skipping weather alert storage');
      return false;
    }

    try {
      // Store the alert start
      const startPoint = new Point('weather_alerts')
        .timestamp(new Date(alertData.startTime))
        .stringField('alert_id', alertData.id)
        .stringField('event', alertData.event)
        .stringField('severity', alertData.severity)
        .stringField('urgency', alertData.urgency)
        .stringField('certainty', alertData.certainty)
        .stringField('description', alertData.description)
        .stringField('instruction', alertData.instruction)
        .stringField('status', 'start')
        .stringField('geometry', JSON.stringify(alertData.geometry || {}));

      // Store the alert end
      const endPoint = new Point('weather_alerts')
        .timestamp(new Date(alertData.endTime))
        .stringField('alert_id', alertData.id)
        .stringField('event', alertData.event)
        .stringField('severity', alertData.severity)
        .stringField('urgency', alertData.urgency)
        .stringField('certainty', alertData.certainty)
        .stringField('description', alertData.description)
        .stringField('instruction', alertData.instruction)
        .stringField('status', 'end')
        .stringField('geometry', JSON.stringify(alertData.geometry || {}));

      await this.writeApi.writePoint(startPoint);
      await this.writeApi.writePoint(endPoint);
      await this.writeApi.flush();

      console.log(`✅ Weather alert stored: ${alertData.event} (${alertData.id})`);
      return true;
    } catch (error) {
      console.error('Failed to store weather alert:', error);
      return false;
    }
  }

  /**
   * Query weather alerts within a time range
   * @param {Date} startTime - Start time for query
   * @param {Date} endTime - End time for query
   * @returns {Promise<Array>} Array of weather alert ranges
   */
  async queryWeatherAlerts(startTime, endTime) {
    if (!this.isConnected) {
      return [];
    }

    try {
      const fluxQuery = `
        from(bucket: "${this.config.bucket}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "weather_alerts")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"])
      `;

      const alertStarts = new Map();
      const alertEnds = new Map();
      const results = [];

      for await (const { values, tableMeta } of this.queryApi.iterateRows(fluxQuery)) {
        const o = tableMeta.toObject(values);
        const alertId = o.alert_id;
        const status = o.status;

        if (status === 'start') {
          alertStarts.set(alertId, {
            id: alertId,
            event: o.event,
            severity: o.severity,
            urgency: o.urgency,
            certainty: o.certainty,
            description: o.description,
            instruction: o.instruction,
            startTime: o._time,
            geometry: o.geometry ? JSON.parse(o.geometry) : {}
          });
        } else if (status === 'end') {
          alertEnds.set(alertId, o._time);
        }
      }

      // Combine start and end times to create range annotations
      for (const [alertId, startData] of alertStarts) {
        const endTime = alertEnds.get(alertId);
        if (endTime) {
          results.push({
            ...startData,
            endTime,
            duration: new Date(endTime).getTime() - new Date(startData.startTime).getTime()
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to query weather alerts:', error);
      return [];
    }
  }

  /**
   * Get currently active weather alerts
   * @returns {Promise<Array>} Array of currently active alerts
   */
  async getActiveWeatherAlerts() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const alerts = await this.queryWeatherAlerts(oneHourAgo, now);

    // Filter for alerts that are currently active
    return alerts.filter(alert => {
      const alertStart = new Date(alert.startTime);
      const alertEnd = new Date(alert.endTime);
      return alertStart <= now && alertEnd >= now;
    });
  }

  /**
   * Check if there are any active weather alerts
   * @returns {Promise<boolean>} True if there are active alerts
   */
  async hasActiveWeatherAlerts() {
    const activeAlerts = await this.getActiveWeatherAlerts();
    return activeAlerts.length > 0;
  }

  /**
   * Get weather alert statistics
   * @param {Date} startTime - Start time for statistics
   * @param {Date} endTime - End time for statistics
   * @returns {Promise<object>} Alert statistics
   */
  async getWeatherAlertStats(startTime, endTime) {
    const alerts = await this.queryWeatherAlerts(startTime, endTime);

    const stats = {
      totalAlerts: alerts.length,
      bySeverity: {},
      byEvent: {},
      totalDuration: 0,
      averageDuration: 0
    };

    alerts.forEach(alert => {
      // Count by severity
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;

      // Count by event type
      stats.byEvent[alert.event] = (stats.byEvent[alert.event] || 0) + 1;

      // Sum durations
      stats.totalDuration += alert.duration;
    });

    if (alerts.length > 0) {
      stats.averageDuration = stats.totalDuration / alerts.length;
    }

    return stats;
  }
}

// Create singleton instance
const influxDBService = new InfluxDBService();

module.exports = {
  InfluxDBService,
  influxDBService
};
