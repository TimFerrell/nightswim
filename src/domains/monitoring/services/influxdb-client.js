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
    this.initializationPromise = null;

    this.config = envConfig.getInfluxDBConfig();
  }

  /**
   * Ensure client is initialized (thread-safe)
   */
  async ensureInitialized() {
    // If already connected, return immediately
    if (this.isConnected && this.queryApi) return true;

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = this.initialize();
    const result = await this.initializationPromise;

    // Keep the promise for subsequent calls until we're definitely connected
    if (!this.isConnected) {
      this.initializationPromise = null;
    }

    return result;
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
    // Ensure client is initialized
    await this.ensureInitialized();

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
   * Query home environment data using the provided Flux query
   * Returns temperature, humidity, and feels-like data
   */
  async queryHomeEnvironmentData(hours = 24, limit = 1000) {
    // Ensure client is initialized
    await this.ensureInitialized();

    if (!this.isConnected || !this.queryApi) {
      console.log('⚠️ InfluxDB not connected, returning empty array');
      return [];
    }

    try {
      // USE THE WORKING QUERY FROM INFLUX DASHBOARD
      const query = `
        // Source data: temperature and humidity sensors
        src =
          from(bucket: "pool-data")
            |> range(start: -${hours}h)
            |> filter(fn: (r) => r._measurement == "pool_metrics")
            |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity")
            |> keep(columns: ["_time", "_value", "sensor"])

        // Normalize to Temp(F) and Humidity(%)
        norm =
          src
            |> map(fn: (r) => ({
                r with
                _field: if r.sensor == "pool_temperature" then "Temp (F)" else "Humidity (%)",
                _value:
                  if r.sensor == "pool_temperature" then
                    (if r._value > 60.0 then r._value else r._value * 9.0 / 5.0 + 32.0)
                  else
                    (if r._value <= 1.5 then r._value * 100.0 else r._value)
              }))
            |> keep(columns: ["_time", "_field", "_value"])

        // Smooth each series
        smoothed =
          norm
            |> group(columns: ["_field"])
            |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
            |> movingAverage(n: 3)

        // Pivot to compute Feels-Like from smoothed Temp/Humidity
        wide =
          smoothed
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> map(fn: (r) => ({
                r with
                "Temp (F)": if r["Temp (F)"] < -20.0 then -20.0 else (if r["Temp (F)"] > 140.0 then 140.0 else r["Temp (F)"]),
                "Humidity (%)": if r["Humidity (%)"] < 0.0 then 0.0 else (if r["Humidity (%)"] > 100.0 then 100.0 else r["Humidity (%)"])
              }))
            |> map(fn: (r) => ({
                r with
                "Feels-Like (F)":
                  if r["Temp (F)"] < 80.0 then
                    0.5 * (r["Temp (F)"] + 61.0 + ((r["Temp (F)"] - 68.0) * 1.2) + (r["Humidity (%)"] * 0.094))
                  else
                    -42.379 +
                    2.04901523 * r["Temp (F)"] +
                    10.14333127 * r["Humidity (%)"] -
                    0.22475541 * r["Temp (F)"] * r["Humidity (%)"] -
                    0.00683783 * r["Temp (F)"] * r["Temp (F)"] -
                    0.05481717 * r["Humidity (%)"] * r["Humidity (%)"] +
                    0.00122874 * r["Temp (F)"] * r["Temp (F)"] * r["Humidity (%)"] +
                    0.00085282 * r["Temp (F)"] * r["Humidity (%)"] * r["Humidity (%)"] -
                    0.00000199 * r["Temp (F)"] * r["Temp (F)"] * r["Humidity (%)"] * r["Humidity (%)"]
              }))

        // Return the wide format for our application
        wide
          |> sort(columns: ["_time"])
          |> limit(n: ${limit})
      `;

      console.log('🏠 Executing WORKING home environment query for', hours, 'hours');

      const dataPoints = [];
      let rowCount = 0;
      const _queryResult = this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          rowCount++;
          const dataPoint = tableMeta.toObject(row);
          console.log(`🏠 Raw data point ${rowCount}:`, JSON.stringify(dataPoint, null, 2));
          dataPoints.push(this.transformWorkingHomeEnvironmentPoint(dataPoint));
        },
        error: (error) => {
          console.error('❌ Home environment query error:', error);
        },
        complete: () => {
          console.log(`🏠 Query complete: processed ${rowCount} raw rows, created ${dataPoints.length} data points`);
        }
      });

      await _queryResult;
      return dataPoints;
    } catch (error) {
      console.error('❌ Error querying home environment data:', error.message);
      return [];
    }
  }

  /**
   * Get home environment statistics
   */
  async getHomeEnvironmentStats(hours = 24) {
    // Ensure client is initialized
    await this.ensureInitialized();

    if (!this.isConnected || !this.queryApi) {
      return null;
    }

    try {
      const data = await this.queryHomeEnvironmentData(hours);
      if (data.length === 0) {
        return null;
      }

      // Calculate statistics for each metric
      const stats = {
        temperature: this.calculateStats(data.map(d => d.temperature).filter(v => v !== null)),
        humidity: this.calculateStats(data.map(d => d.humidity).filter(v => v !== null)),
        feelsLike: this.calculateStats(data.map(d => d.feelsLike).filter(v => v !== null))
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting home environment stats:', error.message);
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
   * Transform home environment InfluxDB point to our data format
   */
  transformHomeEnvironmentPoint(influxPoint) {
    return {
      timestamp: influxPoint._time,
      field: influxPoint._field,
      value: influxPoint._value
    };
  }

  /**
   * Group home environment data by timestamp
   */
  groupHomeEnvironmentData(dataPoints) {
    const grouped = {};

    // Group by timestamp
    dataPoints.forEach(point => {
      if (!grouped[point.timestamp]) {
        grouped[point.timestamp] = {
          timestamp: point.timestamp,
          temperature: null,
          humidity: null,
          feelsLike: null
        };
      }

      // Map field names to our data structure
      switch (point.field) {
      case 'Temp (F)':
        grouped[point.timestamp].temperature = point.value;
        break;
      case 'Humidity (%)':
        grouped[point.timestamp].humidity = point.value;
        break;
      case 'Feels-Like (F)':
        grouped[point.timestamp].feelsLike = point.value;
        break;
      }
    });

    // Convert to array and sort by timestamp
    return Object.values(grouped).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Transform working home environment InfluxDB point to our data format
   */
  transformWorkingHomeEnvironmentPoint(influxPoint) {
    return {
      timestamp: influxPoint._time,
      temperature: influxPoint['Temp (F)'],
      humidity: influxPoint['Humidity (%)'],
      feelsLike: influxPoint['Feels-Like (F)']
    };
  }

  /**
   * Transform simple home environment InfluxDB point to our data format
   */
  transformHomeEnvironmentPointSimple(influxPoint) {
    return {
      timestamp: influxPoint._time,
      sensor: influxPoint.sensor,
      value: influxPoint._value
    };
  }

  /**
   * Group simple home environment data by timestamp
   */
  groupHomeEnvironmentDataSimple(dataPoints) {
    const grouped = {};

    // Group by timestamp
    dataPoints.forEach(point => {
      if (!grouped[point.timestamp]) {
        grouped[point.timestamp] = {
          timestamp: point.timestamp,
          temperature: null,
          humidity: null,
          feelsLike: null
        };
      }

      // Map sensor names to our data structure
      switch (point.sensor) {
      case 'pool_temperature':
        grouped[point.timestamp].temperature = point.value;
        break;
      case 'pool_humidity':
        grouped[point.timestamp].humidity = point.value;
        break;
      }
    });

    // Convert to array and sort by timestamp
    return Object.values(grouped).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Calculate basic statistics for an array of values
   */
  calculateStats(values) {
    if (values.length === 0) {
      return { min: null, max: null, avg: null };
    }

    const validValues = values.filter(v => v !== null && !isNaN(v));
    if (validValues.length === 0) {
      return { min: null, max: null, avg: null };
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;

    return {
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      avg: Math.round(avg * 10) / 10
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
