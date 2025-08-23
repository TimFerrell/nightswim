/**
 * InfluxDB Client Service
 * Handles all InfluxDB operations with connection management
 */

const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const { envConfig } = require('../../../config');

class InfluxDBClient {
  constructor() {
    this.client = null;
    this.writeApi = null;
    this.queryApi = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;

    this.config = envConfig.getInfluxDBConfig();
    this.initialize();
  }

  /**
   * Initialize InfluxDB connection
   */
  async initialize() {
    try {
      console.log('📊 Initializing InfluxDB client...');

      if (!this.config.url || !this.config.token) {
        console.warn('⚠️ InfluxDB configuration missing');
        return false;
      }

      this.client = new InfluxDB({
        url: this.config.url,
        token: this.config.token
      });

      this.writeApi = this.client.getWriteApi(this.config.org, this.config.bucket);
      this.queryApi = this.client.getQueryApi(this.config.org);

      // Test connection
      const connected = await this.testConnection();
      if (connected) {
        this.isConnected = true;
        console.log('✅ InfluxDB client initialized successfully');
        return true;
      }
      console.error('❌ InfluxDB connection test failed');
      return false;

    } catch (error) {
      console.error('❌ InfluxDB initialization error:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Store a data point in InfluxDB
   */
  async storeDataPoint(dataPoint) {
    if (!this.isConnected || !this.writeApi) {
      console.log('⚠️ InfluxDB not connected, skipping storage');
      return false;
    }

    try {
      const timestamp = dataPoint.timestamp ? new Date(dataPoint.timestamp) : new Date();

      const point = new Point('pool_data')
        .timestamp(timestamp)
        .floatField('saltInstant', this.ensureNumeric(dataPoint.saltInstant))
        .floatField('cellTemp', this.ensureNumeric(dataPoint.cellTemp))
        .floatField('cellVoltage', this.ensureNumeric(dataPoint.cellVoltage))
        .floatField('waterTemp', this.ensureNumeric(dataPoint.waterTemp))
        .floatField('airTemp', this.ensureNumeric(dataPoint.airTemp))
        .booleanField('pumpStatus', dataPoint.pumpStatus)
        .floatField('weatherTemp', this.ensureNumeric(dataPoint.weatherTemp))
        .floatField('weatherHumidity', this.ensureNumeric(dataPoint.weatherHumidity));

      this.writeApi.writePoint(point);
      await this.writeApi.flush();

      console.log('💾 Data point stored in InfluxDB successfully');
      return true;
    } catch (error) {
      console.error('❌ Error storing data point:', error.message);
      return false;
    }
  }

  /**
   * Query data points from InfluxDB
   */
  async queryDataPoints(hours = 24, limit = 1000) {
    if (!this.isConnected || !this.queryApi) {
      console.log('⚠️ InfluxDB not connected, returning empty array');
      return [];
    }

    try {
      const query = `
        from(bucket: "${this.config.bucket}")
          |> range(start: -${hours}h)
          |> filter(fn: (r) => r._measurement == "pool_data")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"], desc: false)
          |> limit(n: ${limit})
      `;

      const dataPoints = [];
      const _queryResult = this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const dataPoint = tableMeta.toObject(row);
          dataPoints.push(this.transformInfluxPoint(dataPoint));
        },
        error: (error) => {
          console.error('❌ Query error:', error);
        },
        complete: () => {
          console.log(`📊 Retrieved ${dataPoints.length} data points from InfluxDB`);
        }
      });

      await _queryResult;
      return dataPoints;
    } catch (error) {
      console.error('❌ Error querying data points:', error.message);
      return [];
    }
  }

  /**
   * Get statistics from InfluxDB
   */
  async getStats(metric, hours = 24) {
    if (!this.isConnected || !this.queryApi) {
      return null;
    }

    try {
      const query = `
        from(bucket: "${this.config.bucket}")
          |> range(start: -${hours}h)
          |> filter(fn: (r) => r._measurement == "pool_data" and r._field == "${metric}")
          |> group()
          |> aggregateWindow(every: 1h, fn: mean, createEmpty: false)
          |> yield(name: "hourly_average")
      `;

      const stats = [];
      const _queryResult = this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          const point = tableMeta.toObject(row);
          stats.push({
            timestamp: point._time,
            value: point._value
          });
        },
        error: (error) => {
          console.error('❌ Stats query error:', error);
        },
        complete: () => {
          console.log(`📊 Retrieved stats for ${metric}: ${stats.length} points`);
        }
      });

      await _queryResult;
      return stats;
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      return null;
    }
  }

  /**
   * Test InfluxDB connection
   */
  async testConnection() {
    try {
      if (!this.client) {
        return false;
      }

      // Simple query to test connection
      const query = `from(bucket: "${this.config.bucket}") |> range(start: -1m) |> limit(n: 1)`;

      return new Promise((resolve) => {
        let hasData = false;

        const _queryResult = this.queryApi.queryRows(query, {
          next: () => { hasData = true; },
          error: () => resolve(false),
          complete: () => resolve(true) // Connection works even if no data
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!hasData) resolve(true); // Assume connection is good if no immediate error
        }, 5000);
      });
    } catch (error) {
      console.error('❌ Connection test error:', error.message);
      return false;
    }
  }

  /**
   * Close InfluxDB connection
   */
  async close() {
    try {
      if (this.writeApi) {
        await this.writeApi.close();
        this.writeApi = null;
      }

      if (this.client) {
        this.client = null;
      }

      this.isConnected = false;
      console.log('📊 InfluxDB client closed');
    } catch (error) {
      console.error('❌ Error closing InfluxDB client:', error.message);
    }
  }

  /**
   * Ensure numeric values are valid
   */
  ensureNumeric(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }
    return parseFloat(value);
  }

  /**
   * Transform InfluxDB point to our data format
   */
  transformInfluxPoint(influxPoint) {
    return {
      timestamp: influxPoint._time,
      saltInstant: influxPoint.saltInstant,
      cellTemp: influxPoint.cellTemp,
      cellVoltage: influxPoint.cellVoltage,
      waterTemp: influxPoint.waterTemp,
      airTemp: influxPoint.airTemp,
      pumpStatus: influxPoint.pumpStatus,
      weatherTemp: influxPoint.weatherTemp,
      weatherHumidity: influxPoint.weatherHumidity
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      attempts: this.connectionAttempts,
      config: {
        url: this.config.url ? this.config.url.replace(/\/\/[^@]+@/, '//***:***@') : null,
        org: this.config.org,
        bucket: this.config.bucket
      }
    };
  }
}

// Create singleton instance
const influxDBClient = new InfluxDBClient();

module.exports = { InfluxDBClient, influxDBClient };
