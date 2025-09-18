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
          const transformedPoint = this.transformWorkingHomeEnvironmentPoint(dataPoint);
          console.log(`🏠 Transformed data point ${rowCount}:`, JSON.stringify(transformedPoint, null, 2));
          dataPoints.push(transformedPoint);
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

  /**
   * Comprehensive permission and access diagnostics
   */
  async runPermissionDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      connection: null,
      tokenValidation: null,
      bucketAccess: null,
      dataAccess: null,
      permissionTests: []
    };

    try {
      // Ensure client is initialized
      await this.ensureInitialized();

      // 1. Connection Status
      diagnostics.connection = {
        isConnected: this.isConnected,
        hasQueryApi: !!this.queryApi,
        hasWriteApi: !!this.writeApi,
        config: this.getConnectionStatus().config
      };

      if (!this.isConnected || !this.queryApi) {
        diagnostics.error = 'InfluxDB client not properly initialized';
        return diagnostics;
      }

      // 2. Token Validation - Test basic connectivity
      try {
        const tokenTestQuery = 'from(bucket: "_monitoring") |> range(start: -1h) |> limit(n: 1)';
        const tokenTestStart = Date.now();

        let tokenTestSuccess = false;
        await this.queryApi.queryRows(tokenTestQuery, {
          next: () => { tokenTestSuccess = true; },
          error: (error) => {
            console.log('Token test error (expected for _monitoring):', error.message);
          },
          complete: () => {}
        });

        diagnostics.tokenValidation = {
          success: true,
          testTime: Date.now() - tokenTestStart,
          canAccessSystemBuckets: tokenTestSuccess,
          message: 'Token authentication successful'
        };
      } catch (error) {
        diagnostics.tokenValidation = {
          success: false,
          error: error.message,
          message: 'Token authentication failed'
        };
      }

      // 3. Bucket Access Tests
      const bucketTests = [
        { name: 'pool-data', description: 'Primary data bucket' },
        { name: '_monitoring', description: 'System monitoring bucket' },
        { name: '_tasks', description: 'System tasks bucket' }
      ];

      diagnostics.bucketAccess = { tests: [] };

      for (const bucketTest of bucketTests) {
        try {
          const bucketQuery = `from(bucket: "${bucketTest.name}") |> range(start: -1h) |> limit(n: 1)`;
          const bucketTestStart = Date.now();

          let bucketAccessible = false;
          let errorMessage = null;

          await this.queryApi.queryRows(bucketQuery, {
            next: () => { bucketAccessible = true; },
            error: (error) => {
              errorMessage = error.message;
            },
            complete: () => {}
          });

          diagnostics.bucketAccess.tests.push({
            bucket: bucketTest.name,
            description: bucketTest.description,
            accessible: bucketAccessible,
            testTime: Date.now() - bucketTestStart,
            error: errorMessage
          });

        } catch (error) {
          diagnostics.bucketAccess.tests.push({
            bucket: bucketTest.name,
            description: bucketTest.description,
            accessible: false,
            error: error.message
          });
        }
      }

      // 4. Data Access Tests
      const dataTests = [
        {
          name: 'Basic Data Query',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> limit(n: 5)`,
          description: 'Basic data access with 30-day range'
        },
        {
          name: 'Pool Metrics Query',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "pool_metrics") |> limit(n: 5)`,
          description: 'Pool metrics measurement access'
        },
        {
          name: 'Temperature Sensor Query',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> filter(fn: (r) => r.sensor == "pool_temperature") |> limit(n: 5)`,
          description: 'Temperature sensor data access'
        },
        {
          name: 'Home Environment Query',
          query: `from(bucket: "${this.config.bucket}") |> range(start: 2025-09-17T11:50:00Z, stop: 2025-09-17T12:50:00Z) |> filter(fn: (r) => r._measurement == "pool_metrics") |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity") |> limit(n: 5)`,
          description: 'Home environment data access (exact time range)'
        }
      ];

      diagnostics.dataAccess = { tests: [] };

      for (const dataTest of dataTests) {
        try {
          const dataTestStart = Date.now();
          const results = [];

          await this.queryApi.queryRows(dataTest.query, {
            next: (row, tableMeta) => {
              results.push(tableMeta.toObject(row));
            },
            error: (error) => {
              console.log(`Data test error for ${dataTest.name}:`, error.message);
            },
            complete: () => {}
          });

          diagnostics.dataAccess.tests.push({
            name: dataTest.name,
            description: dataTest.description,
            success: true,
            resultCount: results.length,
            testTime: Date.now() - dataTestStart,
            sampleResults: results.slice(0, 2),
            query: dataTest.query
          });

        } catch (error) {
          diagnostics.dataAccess.tests.push({
            name: dataTest.name,
            description: dataTest.description,
            success: false,
            error: error.message,
            query: dataTest.query
          });
        }
      }

      // 5. Permission Analysis
      const permissionAnalysis = this.analyzePermissions(diagnostics);
      diagnostics.permissionAnalysis = permissionAnalysis;

    } catch (error) {
      diagnostics.error = error.message;
      diagnostics.stack = error.stack;
    }

    return diagnostics;
  }

  /**
   * Analyze permission diagnostics to provide insights
   */
  analyzePermissions(diagnostics) {
    const analysis = {
      overallStatus: 'unknown',
      issues: [],
      recommendations: [],
      tokenPermissions: 'unknown'
    };

    // Check token validation
    if (diagnostics.tokenValidation && diagnostics.tokenValidation.success) {
      analysis.tokenPermissions = 'valid';
    } else {
      analysis.tokenPermissions = 'invalid';
      analysis.issues.push('Token authentication failed');
      analysis.recommendations.push('Verify INFLUX_DB_TOKEN environment variable');
    }

    // Check bucket access
    if (diagnostics.bucketAccess && diagnostics.bucketAccess.tests) {
      const poolDataAccess = diagnostics.bucketAccess.tests.find(t => t.bucket === 'pool-data');
      if (poolDataAccess && poolDataAccess.accessible) {
        analysis.bucketAccess = 'accessible';
      } else {
        analysis.bucketAccess = 'inaccessible';
        analysis.issues.push('Cannot access pool-data bucket');
        analysis.recommendations.push('Check bucket permissions for the token');
      }
    }

    // Check data access
    if (diagnostics.dataAccess && diagnostics.dataAccess.tests) {
      const basicDataTest = diagnostics.dataAccess.tests.find(t => t.name === 'Basic Data Query');
      if (basicDataTest && basicDataTest.success && basicDataTest.resultCount > 0) {
        analysis.dataAccess = 'accessible';
        analysis.overallStatus = 'working';
      } else if (basicDataTest && basicDataTest.success && basicDataTest.resultCount === 0) {
        analysis.dataAccess = 'accessible_but_empty';
        analysis.overallStatus = 'no_data';
        analysis.issues.push('Bucket accessible but contains no data');
        analysis.recommendations.push('Check if data is being written to the bucket');
      } else {
        analysis.dataAccess = 'inaccessible';
        analysis.overallStatus = 'permission_issue';
        analysis.issues.push('Cannot read data from bucket');
        analysis.recommendations.push('Verify read permissions for the token');
      }
    }

    return analysis;
  }

  /**
   * Test token permissions with minimal queries
   */
  async testTokenPermissions() {
    const tests = {
      timestamp: new Date().toISOString(),
      results: []
    };

    try {
      await this.ensureInitialized();

      if (!this.isConnected || !this.queryApi) {
        tests.error = 'Client not initialized';
        return tests;
      }

      // Test 1: System bucket access (usually requires admin permissions)
      try {
        const systemQuery = 'from(bucket: "_monitoring") |> range(start: -1h) |> limit(n: 1)';
        let systemAccessible = false;

        await this.queryApi.queryRows(systemQuery, {
          next: () => { systemAccessible = true; },
          error: () => {},
          complete: () => {}
        });

        tests.results.push({
          test: 'System Bucket Access',
          success: systemAccessible,
          permission: systemAccessible ? 'admin' : 'limited',
          description: systemAccessible ? 'Token has admin permissions' : 'Token has limited permissions'
        });
      } catch (error) {
        tests.results.push({
          test: 'System Bucket Access',
          success: false,
          error: error.message,
          permission: 'unknown'
        });
      }

      // Test 2: Bucket listing (requires read permissions)
      try {
        const bucketQuery = `buckets() |> filter(fn: (r) => r.name == "${this.config.bucket}")`;
        const bucketResults = [];

        await this.queryApi.queryRows(bucketQuery, {
          next: (row, tableMeta) => {
            bucketResults.push(tableMeta.toObject(row));
          },
          error: () => {},
          complete: () => {}
        });

        tests.results.push({
          test: 'Bucket Listing',
          success: bucketResults.length > 0,
          bucketExists: bucketResults.length > 0,
          permission: bucketResults.length > 0 ? 'read' : 'no_read',
          description: bucketResults.length > 0 ? 'Can list buckets' : 'Cannot list buckets'
        });
      } catch (error) {
        tests.results.push({
          test: 'Bucket Listing',
          success: false,
          error: error.message,
          permission: 'unknown'
        });
      }

      // Test 3: Data reading (requires read permissions on specific bucket)
      try {
        const dataQuery = `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> limit(n: 1)`;
        const dataResults = [];

        await this.queryApi.queryRows(dataQuery, {
          next: (row, tableMeta) => {
            dataResults.push(tableMeta.toObject(row));
          },
          error: () => {},
          complete: () => {}
        });

        tests.results.push({
          test: 'Data Reading',
          success: true,
          dataFound: dataResults.length > 0,
          permission: 'read',
          description: dataResults.length > 0 ? 'Can read data from bucket' : 'Can access bucket but no data found'
        });
      } catch (error) {
        tests.results.push({
          test: 'Data Reading',
          success: false,
          error: error.message,
          permission: 'no_read',
          description: 'Cannot read data from bucket'
        });
      }

    } catch (error) {
      tests.error = error.message;
    }

    return tests;
  }

  /**
   * Comprehensive data transformation validation
   */
  async validateDataTransformation() {
    const results = {
      timestamp: new Date().toISOString(),
      connectionStatus: null,
      rawDataTests: [],
      transformationTests: [],
      queryValidation: [],
      overallStatus: 'unknown'
    };

    try {
      await this.ensureInitialized();

      if (!this.isConnected || !this.queryApi) {
        results.connectionStatus = { connected: false, error: 'Not initialized' };
        results.overallStatus = 'not_connected';
        return results;
      }

      results.connectionStatus = {
        connected: true,
        config: {
          url: this.config.url,
          org: this.config.org,
          bucket: this.config.bucket,
          tokenLength: this.config.token ? this.config.token.length : 0
        }
      };

      // Test 1: Raw data queries with different time ranges
      const timeRanges = [
        { name: 'Last 1 hour', query: '-1h' },
        { name: 'Last 24 hours', query: '-24h' },
        { name: 'Last 7 days', query: '-7d' },
        { name: 'Last 30 days', query: '-30d' },
        { name: 'Specific date range (2025-09-17)', query: '2025-09-17T00:00:00Z, 2025-09-17T23:59:59Z' }
      ];

      for (const timeRange of timeRanges) {
        try {
          const query = `from(bucket: "${this.config.bucket}") |> range(start: ${timeRange.query}) |> limit(n: 5)`;
          const startTime = Date.now();
          const rawData = [];

          await this.queryApi.queryRows(query, {
            next: (row, tableMeta) => {
              rawData.push(tableMeta.toObject(row));
            },
            error: (error) => {
              console.log(`Raw data test error for ${timeRange.name}:`, error.message);
            },
            complete: () => {}
          });

          results.rawDataTests.push({
            timeRange: timeRange.name,
            query: timeRange.query,
            success: true,
            resultCount: rawData.length,
            testTime: Date.now() - startTime,
            sampleData: rawData.slice(0, 2),
            fields: rawData.length > 0 ? Object.keys(rawData[0]) : []
          });
        } catch (error) {
          results.rawDataTests.push({
            timeRange: timeRange.name,
            query: timeRange.query,
            success: false,
            error: error.message
          });
        }
      }

      // Test 2: Transformation validation with mock data
      const mockInfluxData = [
        {
          _time: '2025-09-17T12:00:00Z',
          'Temp (F)': 72.5,
          'Humidity (%)': 65.2,
          'Feels-Like (F)': 74.1
        },
        {
          _time: '2025-09-17T12:01:00Z',
          'Temp (F)': 73.0,
          'Humidity (%)': 64.8,
          'Feels-Like (F)': 74.6
        }
      ];

      for (const mockData of mockInfluxData) {
        try {
          const transformed = this.transformWorkingHomeEnvironmentPoint(mockData);
          results.transformationTests.push({
            input: mockData,
            output: transformed,
            success: true,
            validation: {
              hasTimestamp: !!transformed.timestamp,
              hasTemperature: transformed.temperature !== undefined,
              hasHumidity: transformed.humidity !== undefined,
              hasFeelsLike: transformed.feelsLike !== undefined,
              temperatureValid: typeof transformed.temperature === 'number',
              humidityValid: typeof transformed.humidity === 'number',
              feelsLikeValid: typeof transformed.feelsLike === 'number'
            }
          });
        } catch (error) {
          results.transformationTests.push({
            input: mockData,
            success: false,
            error: error.message
          });
        }
      }

      // Test 3: Query validation - test the exact query used in production
      const productionQueries = [
        {
          name: 'Home Environment Query (1h)',
          query: this.buildHomeEnvironmentQuery(1),
          description: 'The exact query used by /api/home/environment'
        },
        {
          name: 'Home Environment Query (24h)',
          query: this.buildHomeEnvironmentQuery(24),
          description: 'The exact query used by /api/home/timeseries'
        }
      ];

      for (const queryTest of productionQueries) {
        try {
          const startTime = Date.now();
          const queryResults = [];

          await this.queryApi.queryRows(queryTest.query, {
            next: (row, tableMeta) => {
              queryResults.push(tableMeta.toObject(row));
            },
            error: (error) => {
              console.log(`Production query error for ${queryTest.name}:`, error.message);
            },
            complete: () => {}
          });

          // Test transformation on real results
          const transformedResults = queryResults.map(row => this.transformWorkingHomeEnvironmentPoint(row));

          results.queryValidation.push({
            name: queryTest.name,
            description: queryTest.description,
            success: true,
            testTime: Date.now() - startTime,
            rawResultCount: queryResults.length,
            transformedResultCount: transformedResults.length,
            sampleRawData: queryResults.slice(0, 2),
            sampleTransformedData: transformedResults.slice(0, 2),
            query: queryTest.query
          });
        } catch (error) {
          results.queryValidation.push({
            name: queryTest.name,
            description: queryTest.description,
            success: false,
            error: error.message,
            query: queryTest.query
          });
        }
      }

      // Determine overall status
      const hasRawData = results.rawDataTests.some(test => test.success && test.resultCount > 0);
      const hasWorkingTransformation = results.transformationTests.every(test => test.success);
      const hasWorkingQueries = results.queryValidation.some(test => test.success);

      if (hasRawData && hasWorkingTransformation && hasWorkingQueries) {
        results.overallStatus = 'fully_working';
      } else if (hasWorkingTransformation && hasWorkingQueries) {
        results.overallStatus = 'working_no_data';
      } else if (hasWorkingTransformation) {
        results.overallStatus = 'transformation_works_query_fails';
      } else {
        results.overallStatus = 'transformation_fails';
      }

    } catch (error) {
      results.error = error.message;
      results.stack = error.stack;
      results.overallStatus = 'error';
    }

    return results;
  }

  /**
   * Build the home environment query (extracted for testing)
   */
  buildHomeEnvironmentQuery(hours) {
    return `
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
                  r._value
            }))

      // Pivot to get Temp and Humidity in same row
      pivoted =
        norm
          |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")

      // Calculate Feels-Like temperature
      result =
        pivoted
          |> map(fn: (r) => ({
              r with
              "Feels-Like (F)":
                if exists r."Temp (F)" and exists r."Humidity (%)" then
                  1.8 * (0.5 * (r."Temp (F)" + 61.0 + ((r."Temp (F)" - 68.0) * 1.2) + (r."Humidity (%)" * 0.094))) - 32.0
                else
                  r."Feels-Like (F)"
            }))
          |> keep(columns: ["_time", "Temp (F)", "Humidity (%)", "Feels-Like (F)"])
    `;
  }

  /**
   * Deep dive into data structure and schema
   */
  async deepDataAnalysis() {
    const results = {
      timestamp: new Date().toISOString(),
      bucketAnalysis: null,
      measurementAnalysis: null,
      fieldAnalysis: null,
      tagAnalysis: null,
      sampleDataAnalysis: null,
      overallStatus: 'unknown'
    };

    try {
      await this.ensureInitialized();

      if (!this.isConnected || !this.queryApi) {
        results.overallStatus = 'not_connected';
        return results;
      }

      // 1. Bucket Analysis
      try {
        const bucketQuery = 'buckets()';
        const buckets = [];

        await this.queryApi.queryRows(bucketQuery, {
          next: (row, tableMeta) => {
            buckets.push(tableMeta.toObject(row));
          },
          error: (error) => {
            console.log('Bucket analysis error:', error.message);
          },
          complete: () => {}
        });

        results.bucketAnalysis = {
          success: true,
          totalBuckets: buckets.length,
          buckets,
          targetBucketExists: buckets.some(b => b.name === this.config.bucket),
          targetBucketInfo: buckets.find(b => b.name === this.config.bucket) || null
        };
      } catch (error) {
        results.bucketAnalysis = {
          success: false,
          error: error.message
        };
      }

      // 2. Measurement Analysis
      try {
        const measurementQuery = `import "influxdata/influxdb/schema"
          schema.measurements(bucket: "${this.config.bucket}")`;
        const measurements = [];

        await this.queryApi.queryRows(measurementQuery, {
          next: (row, tableMeta) => {
            measurements.push(tableMeta.toObject(row));
          },
          error: (error) => {
            console.log('Measurement analysis error:', error.message);
          },
          complete: () => {}
        });

        results.measurementAnalysis = {
          success: true,
          totalMeasurements: measurements.length,
          measurements,
          hasPoolMetrics: measurements.some(m => m._value === 'pool_metrics')
        };
      } catch (error) {
        results.measurementAnalysis = {
          success: false,
          error: error.message
        };
      }

      // 3. Field Analysis
      try {
        const fieldQuery = `import "influxdata/influxdb/schema"
          schema.fieldKeys(bucket: "${this.config.bucket}")`;
        const fields = [];

        await this.queryApi.queryRows(fieldQuery, {
          next: (row, tableMeta) => {
            fields.push(tableMeta.toObject(row));
          },
          error: (error) => {
            console.log('Field analysis error:', error.message);
          },
          complete: () => {}
        });

        results.fieldAnalysis = {
          success: true,
          totalFields: fields.length,
          fields,
          hasValueField: fields.some(f => f._value === '_value')
        };
      } catch (error) {
        results.fieldAnalysis = {
          success: false,
          error: error.message
        };
      }

      // 4. Tag Analysis
      try {
        const tagQuery = `import "influxdata/influxdb/schema"
          schema.tagKeys(bucket: "${this.config.bucket}")`;
        const tags = [];

        await this.queryApi.queryRows(tagQuery, {
          next: (row, tableMeta) => {
            tags.push(tableMeta.toObject(row));
          },
          error: (error) => {
            console.log('Tag analysis error:', error.message);
          },
          complete: () => {}
        });

        results.tagAnalysis = {
          success: true,
          totalTags: tags.length,
          tags,
          hasSensorTag: tags.some(t => t._value === 'sensor')
        };
      } catch (error) {
        results.tagAnalysis = {
          success: false,
          error: error.message
        };
      }

      // 5. Sample Data Analysis
      try {
        const sampleQuery = `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> limit(n: 10)`;
        const sampleData = [];

        await this.queryApi.queryRows(sampleQuery, {
          next: (row, tableMeta) => {
            sampleData.push(tableMeta.toObject(row));
          },
          error: (error) => {
            console.log('Sample data analysis error:', error.message);
          },
          complete: () => {}
        });

        results.sampleDataAnalysis = {
          success: true,
          sampleCount: sampleData.length,
          sampleData,
          uniqueMeasurements: [...new Set(sampleData.map(d => d._measurement))],
          uniqueFields: [...new Set(sampleData.map(d => d._field))],
          uniqueTags: sampleData.length > 0 ? Object.keys(sampleData[0]).filter(k => !k.startsWith('_')) : []
        };
      } catch (error) {
        results.sampleDataAnalysis = {
          success: false,
          error: error.message
        };
      }

      // Determine overall status
      const hasData = results.sampleDataAnalysis?.success && results.sampleDataAnalysis?.sampleCount > 0;
      const hasCorrectStructure = results.measurementAnalysis?.hasPoolMetrics && results.tagAnalysis?.hasSensorTag;

      if (hasData && hasCorrectStructure) {
        results.overallStatus = 'data_exists_correct_structure';
      } else if (hasData) {
        results.overallStatus = 'data_exists_wrong_structure';
      } else {
        results.overallStatus = 'no_data_found';
      }

    } catch (error) {
      results.error = error.message;
      results.stack = error.stack;
      results.overallStatus = 'error';
    }

    return results;
  }

  /**
   * Raw data inspection with zero transformations
   */
  async inspectRawData() {
    const results = {
      timestamp: new Date().toISOString(),
      connectionStatus: null,
      rawQueries: [],
      overallStatus: 'unknown'
    };

    try {
      await this.ensureInitialized();

      if (!this.isConnected || !this.queryApi) {
        results.connectionStatus = { connected: false, error: 'Not initialized' };
        results.overallStatus = 'not_connected';
        return results;
      }

      results.connectionStatus = {
        connected: true,
        config: {
          url: this.config.url,
          org: this.config.org,
          bucket: this.config.bucket,
          tokenLength: this.config.token ? this.config.token.length : 0
        }
      };

      // Test 1: Absolute minimal query - just get ANY data from the bucket
      const minimalQueries = [
        {
          name: 'Minimal - Any Data',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> limit(n: 5)`,
          description: 'Get any 5 data points from the last 30 days'
        },
        {
          name: 'Minimal - Last 7 Days',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -7d) |> limit(n: 5)`,
          description: 'Get any 5 data points from the last 7 days'
        },
        {
          name: 'Minimal - Last 24 Hours',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -24h) |> limit(n: 5)`,
          description: 'Get any 5 data points from the last 24 hours'
        },
        {
          name: 'Minimal - Last 1 Hour',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -1h) |> limit(n: 5)`,
          description: 'Get any 5 data points from the last 1 hour'
        },
        {
          name: 'Minimal - Specific Date Range',
          query: `from(bucket: "${this.config.bucket}") |> range(start: 2025-09-17T00:00:00Z, stop: 2025-09-17T23:59:59Z) |> limit(n: 5)`,
          description: 'Get any 5 data points from 2025-09-17'
        }
      ];

      for (const queryTest of minimalQueries) {
        try {
          const startTime = Date.now();
          const rawData = [];

          await this.queryApi.queryRows(queryTest.query, {
            next: (row, tableMeta) => {
              const rawRow = tableMeta.toObject(row);
              rawData.push(rawRow);
            },
            error: (error) => {
              console.log(`Raw query error for ${queryTest.name}:`, error.message);
            },
            complete: () => {}
          });

          results.rawQueries.push({
            name: queryTest.name,
            description: queryTest.description,
            success: true,
            testTime: Date.now() - startTime,
            resultCount: rawData.length,
            rawData, // Include ALL raw data for inspection
            query: queryTest.query,
            // Analyze the structure of the first data point
            dataStructure: rawData.length > 0 ? {
              keys: Object.keys(rawData[0]),
              sampleRow: rawData[0],
              allRows: rawData
            } : null
          });
        } catch (error) {
          results.rawQueries.push({
            name: queryTest.name,
            description: queryTest.description,
            success: false,
            error: error.message,
            query: queryTest.query
          });
        }
      }

      // Determine overall status
      const hasData = results.rawQueries.some(test => test.success && test.resultCount > 0);
      const hasWorkingQueries = results.rawQueries.some(test => test.success);

      if (hasData) {
        results.overallStatus = 'data_found';
      } else if (hasWorkingQueries) {
        results.overallStatus = 'queries_work_no_data';
      } else {
        results.overallStatus = 'queries_fail';
      }

    } catch (error) {
      results.error = error.message;
      results.stack = error.stack;
      results.overallStatus = 'error';
    }

    return results;
  }

  /**
   * Ultra-minimal bucket and data discovery
   */
  async discoverBucketsAndData() {
    const results = {
      timestamp: new Date().toISOString(),
      connectionStatus: null,
      bucketDiscovery: null,
      dataDiscovery: null,
      overallStatus: 'unknown'
    };

    try {
      await this.ensureInitialized();

      if (!this.isConnected || !this.queryApi) {
        results.connectionStatus = { connected: false, error: 'Not initialized' };
        results.overallStatus = 'not_connected';
        return results;
      }

      results.connectionStatus = {
        connected: true,
        config: {
          url: this.config.url,
          org: this.config.org,
          bucket: this.config.bucket,
          tokenLength: this.config.token ? this.config.token.length : 0
        }
      };

      // 1. Discover ALL buckets
      try {
        const bucketQuery = 'buckets()';
        const buckets = [];

        await this.queryApi.queryRows(bucketQuery, {
          next: (row, tableMeta) => {
            const bucketInfo = tableMeta.toObject(row);
            buckets.push(bucketInfo);
          },
          error: (error) => {
            console.log('Bucket discovery error:', error.message);
          },
          complete: () => {}
        });

        results.bucketDiscovery = {
          success: true,
          totalBuckets: buckets.length,
          buckets,
          bucketNames: buckets.map(b => b.name),
          targetBucketExists: buckets.some(b => b.name === this.config.bucket)
        };
      } catch (error) {
        results.bucketDiscovery = {
          success: false,
          error: error.message
        };
      }

      // 2. Try to find data in ANY bucket
      const dataDiscoveryTests = [];

      if (results.bucketDiscovery.success && results.bucketDiscovery.buckets.length > 0) {
        for (const bucket of results.bucketDiscovery.buckets) {
          try {
            const query = `from(bucket: "${bucket.name}") |> range(start: -30d) |> limit(n: 3)`;
            const data = [];

            await this.queryApi.queryRows(query, {
              next: (row, tableMeta) => {
                const rawRow = tableMeta.toObject(row);
                data.push(rawRow);
              },
              error: (error) => {
                console.log(`Data discovery error for bucket ${bucket.name}:`, error.message);
              },
              complete: () => {}
            });

            dataDiscoveryTests.push({
              bucketName: bucket.name,
              success: true,
              dataCount: data.length,
              sampleData: data.slice(0, 2),
              dataStructure: data.length > 0 ? {
                keys: Object.keys(data[0]),
                sampleRow: data[0]
              } : null
            });
          } catch (error) {
            dataDiscoveryTests.push({
              bucketName: bucket.name,
              success: false,
              error: error.message
            });
          }
        }
      }

      results.dataDiscovery = {
        success: true,
        tests: dataDiscoveryTests,
        bucketsWithData: dataDiscoveryTests.filter(t => t.success && t.dataCount > 0)
      };

      // Determine overall status
      const hasBuckets = results.bucketDiscovery.success && results.bucketDiscovery.totalBuckets > 0;
      const hasData = results.dataDiscovery.bucketsWithData.length > 0;

      if (hasData) {
        results.overallStatus = 'data_found';
      } else if (hasBuckets) {
        results.overallStatus = 'buckets_found_no_data';
      } else {
        results.overallStatus = 'no_buckets_found';
      }

    } catch (error) {
      results.error = error.message;
      results.stack = error.stack;
      results.overallStatus = 'error';
    }

    return results;
  }

  /**
   * Test direct data access without bucket discovery
   */
  async testDirectDataAccess() {
    const results = {
      timestamp: new Date().toISOString(),
      connectionStatus: null,
      directAccessTests: [],
      overallStatus: 'unknown'
    };

    try {
      await this.ensureInitialized();

      if (!this.isConnected || !this.queryApi) {
        results.connectionStatus = { connected: false, error: 'Not initialized' };
        results.overallStatus = 'not_connected';
        return results;
      }

      results.connectionStatus = {
        connected: true,
        config: {
          url: this.config.url,
          org: this.config.org,
          bucket: this.config.bucket,
          tokenLength: this.config.token ? this.config.token.length : 0
        }
      };

      // Test direct access to the configured bucket with various approaches
      const directTests = [
        {
          name: 'Direct - No Range',
          query: `from(bucket: "${this.config.bucket}") |> limit(n: 5)`,
          description: 'Direct access without time range'
        },
        {
          name: 'Direct - Very Wide Range',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -365d) |> limit(n: 5)`,
          description: 'Very wide time range (1 year)'
        },
        {
          name: 'Direct - Future Range',
          query: `from(bucket: "${this.config.bucket}") |> range(start: now(), stop: now() + 1h) |> limit(n: 5)`,
          description: 'Future time range'
        },
        {
          name: 'Direct - No Filters',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> limit(n: 5)`,
          description: 'No measurement or field filters'
        },
        {
          name: 'Direct - Any Measurement',
          query: `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> filter(fn: (r) => r._measurement =~ /.*/) |> limit(n: 5)`,
          description: 'Any measurement with regex'
        }
      ];

      for (const test of directTests) {
        try {
          const startTime = Date.now();
          const data = [];

          await this.queryApi.queryRows(test.query, {
            next: (row, tableMeta) => {
              const rawRow = tableMeta.toObject(row);
              data.push(rawRow);
            },
            error: (error) => {
              console.log(`Direct access error for ${test.name}:`, error.message);
            },
            complete: () => {}
          });

          results.directAccessTests.push({
            name: test.name,
            description: test.description,
            success: true,
            testTime: Date.now() - startTime,
            resultCount: data.length,
            rawData: data,
            query: test.query,
            dataStructure: data.length > 0 ? {
              keys: Object.keys(data[0]),
              sampleRow: data[0],
              allRows: data
            } : null
          });
        } catch (error) {
          results.directAccessTests.push({
            name: test.name,
            description: test.description,
            success: false,
            error: error.message,
            query: test.query
          });
        }
      }

      // Determine overall status
      const hasData = results.directAccessTests.some(test => test.success && test.resultCount > 0);
      const hasWorkingQueries = results.directAccessTests.some(test => test.success);

      if (hasData) {
        results.overallStatus = 'data_found';
      } else if (hasWorkingQueries) {
        results.overallStatus = 'queries_work_no_data';
      } else {
        results.overallStatus = 'queries_fail';
      }

    } catch (error) {
      results.error = error.message;
      results.stack = error.stack;
      results.overallStatus = 'error';
    }

    return results;
  }

  /**
   * Force InfluxDB to explain its schema and data structure
   */
  async explainSchema() {
    const results = {
      timestamp: new Date().toISOString(),
      connectionStatus: null,
      schemaExplanations: [],
      overallStatus: 'unknown'
    };

    try {
      await this.ensureInitialized();

      if (!this.isConnected || !this.queryApi) {
        results.connectionStatus = { connected: false, error: 'Not initialized' };
        results.overallStatus = 'not_connected';
        return results;
      }

      results.connectionStatus = {
        connected: true,
        config: {
          url: this.config.url,
          org: this.config.org,
          bucket: this.config.bucket,
          tokenLength: this.config.token ? this.config.token.length : 0
        }
      };

      // Schema explanation queries
      const schemaQueries = [
        {
          name: 'Schema - All Measurements',
          query: `import "influxdata/influxdb/schema"
            schema.measurements(bucket: "${this.config.bucket}")`,
          description: 'Get all measurements in the bucket'
        },
        {
          name: 'Schema - All Fields',
          query: `import "influxdata/influxdb/schema"
            schema.fieldKeys(bucket: "${this.config.bucket}")`,
          description: 'Get all field keys in the bucket'
        },
        {
          name: 'Schema - All Tags',
          query: `import "influxdata/influxdb/schema"
            schema.tagKeys(bucket: "${this.config.bucket}")`,
          description: 'Get all tag keys in the bucket'
        },
        {
          name: 'Schema - Tag Values',
          query: `import "influxdata/influxdb/schema"
            schema.tagValues(bucket: "${this.config.bucket}", tag: "_measurement")`,
          description: 'Get all measurement values'
        },
        {
          name: 'Schema - Field Values',
          query: `import "influxdata/influxdb/schema"
            schema.fieldKeys(bucket: "${this.config.bucket}")`,
          description: 'Get all field key values'
        },
        {
          name: 'Schema - Data Shape',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -30d)
            |> limit(n: 1)
            |> schema.fieldsAsCols()`,
          description: 'Get data shape with fields as columns'
        },
        {
          name: 'Schema - Raw Data Sample',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -30d)
            |> limit(n: 5)`,
          description: 'Get raw data sample to see structure'
        },
        {
          name: 'Schema - Group by Measurement',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -30d)
            |> group(columns: ["_measurement"])
            |> limit(n: 5)`,
          description: 'Group by measurement to see data organization'
        },
        {
          name: 'Schema - Group by Field',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -30d)
            |> group(columns: ["_field"])
            |> limit(n: 5)`,
          description: 'Group by field to see field organization'
        },
        {
          name: 'Schema - Distinct Measurements',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -30d)
            |> keep(columns: ["_measurement"])
            |> distinct(column: "_measurement")`,
          description: 'Get distinct measurement names'
        },
        {
          name: 'Schema - Distinct Fields',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -30d)
            |> keep(columns: ["_field"])
            |> distinct(column: "_field")`,
          description: 'Get distinct field names'
        },
        {
          name: 'Schema - Time Range Analysis',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -365d)
            |> keep(columns: ["_time"])
            |> limit(n: 1)`,
          description: 'Check if data exists in wider time range'
        }
      ];

      for (const schemaTest of schemaQueries) {
        try {
          const startTime = Date.now();
          const schemaData = [];

          await this.queryApi.queryRows(schemaTest.query, {
            next: (row, tableMeta) => {
              const rawRow = tableMeta.toObject(row);
              schemaData.push(rawRow);
            },
            error: (error) => {
              console.log(`Schema query error for ${schemaTest.name}:`, error.message);
            },
            complete: () => {}
          });

          results.schemaExplanations.push({
            name: schemaTest.name,
            description: schemaTest.description,
            success: true,
            testTime: Date.now() - startTime,
            resultCount: schemaData.length,
            rawData: schemaData,
            query: schemaTest.query,
            dataStructure: schemaData.length > 0 ? {
              keys: Object.keys(schemaData[0]),
              sampleRow: schemaData[0],
              allRows: schemaData,
              uniqueValues: schemaData.length > 0 ? Object.keys(schemaData[0]).reduce((acc, key) => {
                acc[key] = [...new Set(schemaData.map(row => row[key]))];
                return acc;
              }, {}) : null
            } : null
          });
        } catch (error) {
          results.schemaExplanations.push({
            name: schemaTest.name,
            description: schemaTest.description,
            success: false,
            error: error.message,
            query: schemaTest.query
          });
        }
      }

      // Determine overall status
      const hasData = results.schemaExplanations.some(test => test.success && test.resultCount > 0);
      const hasWorkingQueries = results.schemaExplanations.some(test => test.success);

      if (hasData) {
        results.overallStatus = 'schema_found';
      } else if (hasWorkingQueries) {
        results.overallStatus = 'queries_work_no_schema';
      } else {
        results.overallStatus = 'queries_fail';
      }

    } catch (error) {
      results.error = error.message;
      results.stack = error.stack;
      results.overallStatus = 'error';
    }

    return results;
  }

  /**
   * Test the exact same query approach as the working pool routes
   */
  async testPoolRouteQuery() {
    const results = {
      timestamp: new Date().toISOString(),
      connectionStatus: null,
      poolRouteTests: [],
      overallStatus: 'unknown'
    };

    try {
      await this.ensureInitialized();

      if (!this.isConnected || !this.queryApi) {
        results.connectionStatus = { connected: false, error: 'Not initialized' };
        results.overallStatus = 'not_connected';
        return results;
      }

      results.connectionStatus = {
        connected: true,
        config: {
          url: this.config.url,
          org: this.config.org,
          bucket: this.config.bucket,
          tokenLength: this.config.token ? this.config.token.length : 0
        }
      };

      // Test the exact same query approach as pool routes
      const poolRouteQueries = [
        {
          name: 'Pool Route - Exact Same Query',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -1h, stop: now())
            |> filter(fn: (r) => r._measurement == "pool_metrics")
            |> limit(n: 10)`,
          description: 'Exact same query as working pool routes'
        },
        {
          name: 'Pool Route - Temperature/Humidity Filter',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -1h, stop: now())
            |> filter(fn: (r) => r._measurement == "pool_metrics")
            |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity")
            |> limit(n: 10)`,
          description: 'Pool route query with temperature/humidity filter'
        },
        {
          name: 'Pool Route - Using iterateRows (like pool routes)',
          query: `from(bucket: "${this.config.bucket}")
            |> range(start: -1h, stop: now())
            |> filter(fn: (r) => r._measurement == "pool_metrics")
            |> limit(n: 10)`,
          description: 'Same query but using iterateRows like pool routes'
        }
      ];

      for (const queryTest of poolRouteQueries) {
        try {
          const startTime = Date.now();
          const data = [];

          if (queryTest.name.includes('iterateRows')) {
            // Use iterateRows like the pool routes do
            for await (const { values, tableMeta } of this.queryApi.iterateRows(queryTest.query)) {
              const rawRow = tableMeta.toObject(values);
              data.push(rawRow);
            }
          } else {
            // Use queryRows like our home environment queries do
            await this.queryApi.queryRows(queryTest.query, {
              next: (row, tableMeta) => {
                const rawRow = tableMeta.toObject(row);
                data.push(rawRow);
              },
              error: (error) => {
                console.log(`Pool route query error for ${queryTest.name}:`, error.message);
              },
              complete: () => {}
            });
          }

          results.poolRouteTests.push({
            name: queryTest.name,
            description: queryTest.description,
            success: true,
            testTime: Date.now() - startTime,
            resultCount: data.length,
            rawData: data,
            query: queryTest.query,
            dataStructure: data.length > 0 ? {
              keys: Object.keys(data[0]),
              sampleRow: data[0],
              allRows: data,
              uniqueValues: data.length > 0 ? Object.keys(data[0]).reduce((acc, key) => {
                acc[key] = [...new Set(data.map(row => row[key]))];
                return acc;
              }, {}) : null
            } : null
          });
        } catch (error) {
          results.poolRouteTests.push({
            name: queryTest.name,
            description: queryTest.description,
            success: false,
            error: error.message,
            query: queryTest.query
          });
        }
      }

      // Determine overall status
      const hasData = results.poolRouteTests.some(test => test.success && test.resultCount > 0);
      const hasWorkingQueries = results.poolRouteTests.some(test => test.success);

      if (hasData) {
        results.overallStatus = 'data_found';
      } else if (hasWorkingQueries) {
        results.overallStatus = 'queries_work_no_data';
      } else {
        results.overallStatus = 'queries_fail';
      }

    } catch (error) {
      results.error = error.message;
      results.stack = error.stack;
      results.overallStatus = 'error';
    }

    return results;
  }
}

// Create singleton instance
const influxDBClient = new InfluxDBClient();

module.exports = { InfluxDBClient, influxDBClient };
