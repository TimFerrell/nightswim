/**
 * Home Environment API Routes
 * Provides endpoints for home temperature, humidity, and feels-like data
 */

const express = require('express');
const router = express.Router();
const { influxDBClient } = require('../domains/monitoring');

/**
 * Get current home environment data
 * GET /api/home/environment
 */
router.get('/environment', async (req, res) => {
  const requestStartTime = Date.now();
  console.log('🏠 [Home Environment] /api/home/environment request started');

  try {
    // Get the latest data point (last hour)
    const data = await influxDBClient.queryHomeEnvironmentData(1, 1);

    if (data.length === 0) {
      const totalTime = Date.now() - requestStartTime;
      console.log(`❌ [Home Environment] No data available after ${totalTime}ms`);

      return res.status(200).json({
        success: true,
        data: {
          temperature: null,
          humidity: null,
          feelsLike: null,
          comfortLevel: 'unknown',
          humidityLevel: 'unknown',
          timestamp: new Date().toISOString(),
          source: 'influxdb'
        },
        message: 'No home environment data available',
        responseTime: totalTime
      });
    }

    const latestData = data[data.length - 1];
    const comfortLevel = calculateComfortLevel(latestData.temperature, latestData.humidity);
    const humidityLevel = calculateHumidityLevel(latestData.humidity);

    const totalTime = Date.now() - requestStartTime;
    console.log(`✅ [Home Environment] Data retrieved in ${totalTime}ms`);

    return res.json({
      success: true,
      data: {
        temperature: latestData.temperature,
        humidity: latestData.humidity,
        feelsLike: latestData.feelsLike,
        comfortLevel,
        humidityLevel,
        timestamp: latestData.timestamp,
        source: 'influxdb'
      },
      responseTime: totalTime
    });

  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error('❌ [Home Environment] Error fetching current data:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve home environment data',
      responseTime: totalTime
    });
  }
});

/**
 * Get home environment time series data
 * GET /api/home/timeseries?hours=24
 */
router.get('/timeseries', async (req, res) => {
  const requestStartTime = Date.now();
  const hours = parseInt(req.query.hours) || 24;
  const limit = parseInt(req.query.limit) || 1000;

  console.log(`🏠 [Home Environment] Fetching time series data: ${hours}h, limit: ${limit}`);

  try {
    const data = await influxDBClient.queryHomeEnvironmentData(hours, limit);

    const totalTime = Date.now() - requestStartTime;
    console.log(`✅ [Home Environment] Retrieved ${data.length} data points in ${totalTime}ms`);

    return res.json({
      success: true,
      data,
      hours,
      count: data.length,
      limit,
      source: 'influxdb',
      responseTime: totalTime
    });

  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error('❌ [Home Environment] Error fetching time series:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve home environment time series data',
      responseTime: totalTime
    });
  }
});

/**
 * Get home environment statistics
 * GET /api/home/timeseries/stats?hours=24
 */
router.get('/timeseries/stats', async (req, res) => {
  const requestStartTime = Date.now();
  const hours = parseInt(req.query.hours) || 24;

  console.log(`🏠 [Home Environment] Fetching statistics: ${hours}h`);

  try {
    const stats = await influxDBClient.getHomeEnvironmentStats(hours);

    if (!stats) {
      const totalTime = Date.now() - requestStartTime;
      console.log(`❌ [Home Environment] No statistics available after ${totalTime}ms`);

      return res.status(200).json({
        success: true,
        stats: {
          temperature: { min: null, max: null, avg: null },
          humidity: { min: null, max: null, avg: null },
          feelsLike: { min: null, max: null, avg: null }
        },
        hours,
        message: 'No home environment statistics available',
        responseTime: totalTime
      });
    }

    const totalTime = Date.now() - requestStartTime;
    console.log(`✅ [Home Environment] Statistics retrieved in ${totalTime}ms`);

    return res.json({
      success: true,
      stats,
      hours,
      source: 'influxdb',
      responseTime: totalTime
    });

  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error('❌ [Home Environment] Error fetching statistics:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve home environment statistics',
      responseTime: totalTime
    });
  }
});

/**
 * Get comfort level analysis
 * GET /api/home/comfort?hours=24
 */
router.get('/comfort', async (req, res) => {
  const requestStartTime = Date.now();
  const hours = parseInt(req.query.hours) || 24;

  console.log(`🏠 [Home Environment] Fetching comfort analysis: ${hours}h`);

  try {
    const data = await influxDBClient.queryHomeEnvironmentData(hours, 1000);

    if (data.length === 0) {
      const totalTime = Date.now() - requestStartTime;
      console.log(`❌ [Home Environment] No data for comfort analysis after ${totalTime}ms`);

      return res.status(200).json({
        success: true,
        analysis: {
          overallComfort: 'unknown',
          comfortDistribution: {},
          recommendations: [],
          averageComfort: 'unknown'
        },
        hours,
        message: 'No data available for comfort analysis',
        responseTime: totalTime
      });
    }

    const analysis = analyzeComfortLevels(data);

    const totalTime = Date.now() - requestStartTime;
    console.log(`✅ [Home Environment] Comfort analysis completed in ${totalTime}ms`);

    return res.json({
      success: true,
      analysis,
      hours,
      dataPoints: data.length,
      source: 'influxdb',
      responseTime: totalTime
    });

  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error('❌ [Home Environment] Error analyzing comfort:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to analyze comfort levels',
      responseTime: totalTime
    });
  }
});

/**
 * Calculate comfort level based on temperature and humidity
 */
function calculateComfortLevel(temperature, humidity) {
  if (temperature === null || humidity === null) {
    return 'unknown';
  }

  // Comfort zones based on temperature and humidity
  if (temperature >= 68 && temperature <= 78 && humidity >= 30 && humidity <= 60) {
    return 'comfortable';
  } else if (temperature > 78 || (temperature > 75 && humidity > 60)) {
    return 'hot';
  }
  if (temperature < 68) {
    return 'cold';
  }
  if (humidity > 60) {
    return 'humid';
  }
  if (humidity < 30) {
    return 'dry';
  }
  return 'marginal';
}

/**
 * Calculate humidity level description
 */
function calculateHumidityLevel(humidity) {
  if (humidity === null) {
    return 'unknown';
  }

  if (humidity < 30) {
    return 'low';
  }
  if (humidity >= 30 && humidity <= 60) {
    return 'normal';
  }
  if (humidity > 60 && humidity <= 70) {
    return 'high';
  }
  return 'very_high';
}

/**
 * Analyze comfort levels over time
 */
function analyzeComfortLevels(data) {
  const comfortCounts = {
    comfortable: 0,
    hot: 0,
    cold: 0,
    humid: 0,
    dry: 0,
    marginal: 0,
    unknown: 0
  };

  const recommendations = [];

  data.forEach(point => {
    const comfort = calculateComfortLevel(point.temperature, point.humidity);
    comfortCounts[comfort]++;
  });

  const total = data.length;
  const comfortDistribution = {};

  Object.keys(comfortCounts).forEach(level => {
    comfortDistribution[level] = {
      count: comfortCounts[level],
      percentage: total > 0 ? Math.round((comfortCounts[level] / total) * 100) : 0
    };
  });

  // Determine overall comfort
  let overallComfort = 'unknown';
  if (comfortCounts.comfortable > comfortCounts.hot &&
      comfortCounts.comfortable > comfortCounts.cold &&
      comfortCounts.comfortable > comfortCounts.humid) {
    overallComfort = 'comfortable';
  } else if (comfortCounts.hot > comfortCounts.cold) {
    overallComfort = 'hot';
  } else if (comfortCounts.cold > comfortCounts.hot) {
    overallComfort = 'cold';
  } else if (comfortCounts.humid > comfortCounts.dry) {
    overallComfort = 'humid';
  } else if (comfortCounts.dry > comfortCounts.humid) {
    overallComfort = 'dry';
  }

  // Generate recommendations
  if (comfortCounts.hot > total * 0.3) {
    recommendations.push('Consider reducing temperature or improving ventilation');
  }
  if (comfortCounts.cold > total * 0.3) {
    recommendations.push('Consider increasing temperature or adding insulation');
  }
  if (comfortCounts.humid > total * 0.3) {
    recommendations.push('Consider using a dehumidifier or improving air circulation');
  }
  if (comfortCounts.dry > total * 0.3) {
    recommendations.push('Consider using a humidifier to increase moisture levels');
  }

  return {
    overallComfort,
    comfortDistribution,
    recommendations,
    averageComfort: overallComfort
  };
}

/**
 * DEBUG: Comprehensive home environment diagnostics
 * GET /api/home/debug
 */
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 [Debug] Starting comprehensive home environment diagnostics...');
    const startTime = Date.now();

    // Environment variable checks (masked for security)
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      INFLUXDB_URL: process.env.INFLUXDB_URL ? `${process.env.INFLUXDB_URL.substring(0, 20)}...` : 'NOT_SET',
      INFLUXDB_ORG: process.env.INFLUXDB_ORG ? `${process.env.INFLUXDB_ORG.substring(0, 10)}...` : 'NOT_SET',
      INFLUXDB_BUCKET: process.env.INFLUXDB_BUCKET || 'NOT_SET',
      INFLUX_DB_TOKEN: process.env.INFLUX_DB_TOKEN ? `SET (${process.env.INFLUX_DB_TOKEN.length} chars, starts: ${process.env.INFLUX_DB_TOKEN.substring(0, 8)}...)` : 'NOT_SET'
    };

    // Ensure initialization before checking status
    console.log('🔍 [Debug] Ensuring InfluxDB initialization...');
    try {
      await influxDBClient.ensureInitialized();
    } catch (connError) {
      console.error('🔍 [Debug] Connection initialization failed:', connError.message);
    }

    // Connection status (after ensuring initialization)
    const connectionStatus = influxDBClient.getConnectionStatus();
    const isConnected = influxDBClient.isConnected;

    // Test the query with different time ranges
    const queryTests = [];
    const timeRanges = [12, 24, 48];

    for (const hours of timeRanges) {
      try {
        const queryStart = Date.now();
        const data = await influxDBClient.queryHomeEnvironmentData(hours, 5);
        const queryTime = Date.now() - queryStart;

        queryTests.push({
          hours,
          success: true,
          resultCount: data.length,
          queryTime,
          sampleData: data.slice(0, 2) // Just first 2 results for inspection
        });
      } catch (queryError) {
        queryTests.push({
          hours,
          success: false,
          error: queryError.message,
          stack: queryError.stack
        });
      }
    }

    // Test basic InfluxDB connectivity and data availability
    let basicConnectivityTest = null;
    let sensorDataTest = null;

    try {
      // Test 1: Basic connectivity - check much wider range
      const testQuery = `from(bucket: "pool-data") |> range(start: -30d) |> limit(n: 10)`;
      console.log('🔍 [Debug] Testing basic connectivity with 30-day range...');

      const testPoints = [];
      const testResult = influxDBClient.queryApi.queryRows(testQuery, {
        next: (row, tableMeta) => {
          testPoints.push(tableMeta.toObject(row));
        },
        error: (error) => {
          console.error('🔍 [Debug] Basic connectivity test error:', error);
        },
        complete: () => {
          console.log(`🔍 [Debug] Basic connectivity test returned ${testPoints.length} points`);
        }
      });

      await testResult;
      basicConnectivityTest = {
        success: true,
        pointCount: testPoints.length,
        samplePoints: testPoints.slice(0, 2)
      };

      // Test 2: Check what measurements and sensors exist
      const sensorQuery = `
        from(bucket: "${process.env.INFLUXDB_BUCKET || 'default'}")
          |> range(start: -30d)
          |> limit(n: 20)
          |> group()
      `;

      const sensorPoints = [];
      const sensorResult = influxDBClient.queryApi.queryRows(sensorQuery, {
        next: (row, tableMeta) => {
          sensorPoints.push(tableMeta.toObject(row));
        },
        error: (error) => {
          console.error('🔍 [Debug] Sensor data test error:', error);
        },
        complete: () => {
          console.log(`🔍 [Debug] Sensor data test returned ${sensorPoints.length} points`);
        }
      });

      await sensorResult;
      sensorDataTest = {
        success: true,
        pointCount: sensorPoints.length,
        samplePoints: sensorPoints.slice(0, 5),
        uniqueMeasurements: [...new Set(sensorPoints.map(p => p._measurement).filter(Boolean))],
        uniqueSensors: [...new Set(sensorPoints.map(p => p.sensor).filter(Boolean))],
        uniqueFields: [...new Set(sensorPoints.map(p => p._field).filter(Boolean))]
      };

    } catch (error) {
      basicConnectivityTest = {
        success: false,
        error: error.message
      };
      sensorDataTest = {
        success: false,
        error: error.message
      };
    }

    const totalTime = Date.now() - startTime;

    return res.json({
      success: true,
      debug: true,
      timestamp: new Date().toISOString(),
      diagnostics: {
        environment: envVars,
        influxConnection: {
          isConnected,
          connectionStatus,
          hasQueryApi: !!influxDBClient.queryApi
        },
        basicConnectivityTest,
        sensorDataTest,
        homeEnvironmentQueryTests: queryTests,
        performance: {
          totalDiagnosticTime: totalTime
        }
      }
    });

  } catch (error) {
    console.error('🔍 [Debug] Diagnostic error:', error);
    return res.status(500).json({
      success: false,
      debug: true,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * SIMPLE TEST: Direct InfluxDB connection with minimal query
 * GET /api/home/simple-test
 */
router.get('/simple-test', async (req, res) => {
  try {
    console.log('🔬 [Simple Test] Starting direct InfluxDB test...');

    // Step 1: Direct connection test
    const { InfluxDB } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    // Step 2: Simplest possible query - just get anything from the bucket
    const simpleQuery = `from(bucket: "pool-data") |> range(start: -7d) |> limit(n: 5)`;

    console.log('🔬 Executing simple query:', simpleQuery);

    const results = [];
    await queryApi.queryRows(simpleQuery, {
      next: (row, tableMeta) => {
        const point = tableMeta.toObject(row);
        results.push(point);
        console.log('🔬 Found data point:', point);
      },
      error: (error) => {
        console.error('🔬 Query error:', error);
      },
      complete: () => {
        console.log(`🔬 Query complete: ${results.length} points found`);
      }
    });

    // Step 3: If we have data, try a basic temperature/humidity filter
    let tempHumidityResults = [];
    if (results.length > 0) {
      const tempHumQuery = `
        from(bucket: "${process.env.INFLUXDB_BUCKET || 'default'}")
          |> range(start: -7d)
          |> filter(fn: (r) => r._field == "temperature" or r._field == "humidity")
          |> limit(n: 5)
      `;

      await queryApi.queryRows(tempHumQuery, {
        next: (row, tableMeta) => {
          tempHumidityResults.push(tableMeta.toObject(row));
        },
        error: (error) => {
          console.error('🔬 Temp/Humidity query error:', error);
        },
        complete: () => {
          console.log(`🔬 Temp/Humidity query complete: ${tempHumidityResults.length} points`);
        }
      });
    }

    return res.json({
      success: true,
      test: 'simple-influx-connection',
      timestamp: new Date().toISOString(),
      results: {
        environment: {
          url: process.env.INFLUXDB_URL ? 'SET' : 'NOT_SET',
          org: process.env.INFLUXDB_ORG ? 'SET' : 'NOT_SET',
          token: process.env.INFLUX_DB_TOKEN ? 'SET' : 'NOT_SET'
        },
        rawDataQuery: {
          pointCount: results.length,
          samplePoints: results.slice(0, 3)
        },
        tempHumidityQuery: {
          pointCount: tempHumidityResults.length,
          samplePoints: tempHumidityResults.slice(0, 3)
        }
      }
    });

  } catch (error) {
    console.error('🔬 [Simple Test] Error:', error);
    return res.status(500).json({
      success: false,
      test: 'simple-influx-connection',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * TEST WRITE: Write test data to InfluxDB to verify write permissions
 * GET /api/home/test-write
 */
router.get('/test-write', async (req, res) => {
  try {
    console.log('✍️ [Test Write] Testing InfluxDB write capability...');

    const { InfluxDB, Point } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const writeApi = client.getWriteApi(process.env.INFLUXDB_ORG, process.env.INFLUXDB_BUCKET || 'default');

    // Write a simple test point
    const testPoint = new Point('test_measurement')
      .tag('sensor', 'test_sensor')
      .floatField('test_field', 42.0)
      .timestamp(new Date());

    writeApi.writePoint(testPoint);
    await writeApi.close();

    console.log('✍️ Test data written successfully');

    // Now try to read it back
    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);
    const readQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET || 'default'}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "test_measurement")
        |> limit(n: 1)
    `;

    const readResults = [];
    await queryApi.queryRows(readQuery, {
      next: (row, tableMeta) => {
        readResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.error('✍️ Read test error:', error);
      },
      complete: () => {
        console.log(`✍️ Read test complete: ${readResults.length} points`);
      }
    });

    return res.json({
      success: true,
      test: 'influx-write-test',
      timestamp: new Date().toISOString(),
      results: {
        writeTest: 'SUCCESS',
        readBackTest: {
          pointCount: readResults.length,
          samplePoints: readResults
        }
      }
    });

  } catch (error) {
    console.error('✍️ [Test Write] Error:', error);
    return res.status(500).json({
      success: false,
      test: 'influx-write-test',
      error: error.message,
      details: error.stack
    });
  }
});

/**
 * STEP 1: Write simple temp/humidity data and test progressive queries
 * GET /api/home/step1-write-temp-data
 */
router.get('/step1-write-temp-data', async (req, res) => {
  try {
    console.log('🌡️ [Step 1] Writing simple temperature/humidity data...');

    const { InfluxDB, Point } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const writeApi = client.getWriteApi(process.env.INFLUXDB_ORG, process.env.INFLUXDB_BUCKET || 'default');

    // Write simple temperature and humidity points
    const tempPoint = new Point('pool_metrics')
      .tag('sensor', 'pool_temperature')
      .floatField('value', 75.5)
      .timestamp(new Date());

    const humidityPoint = new Point('pool_metrics')
      .tag('sensor', 'pool_humidity')
      .floatField('value', 45.2)
      .timestamp(new Date());

    writeApi.writePoint(tempPoint);
    writeApi.writePoint(humidityPoint);
    await writeApi.close();

    console.log('🌡️ Temperature and humidity data written');

    // Wait 2 seconds for data to be available
    await new Promise(resolve => setTimeout(resolve, 2000));

    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    // Test 1: Basic read of our data
    const basicQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET || 'default'}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "pool_metrics")
        |> limit(n: 10)
    `;

    const basicResults = [];
    await queryApi.queryRows(basicQuery, {
      next: (row, tableMeta) => {
        basicResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.error('🌡️ Basic query error:', error);
      },
      complete: () => {
        console.log(`🌡️ Basic query complete: ${basicResults.length} points`);
      }
    });

    // Test 2: Filter for temperature/humidity sensors
    const sensorQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET || 'default'}")
        |> range(start: -5m)
        |> filter(fn: (r) => r._measurement == "pool_metrics")
        |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity")
        |> limit(n: 10)
    `;

    const sensorResults = [];
    await queryApi.queryRows(sensorQuery, {
      next: (row, tableMeta) => {
        sensorResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.error('🌡️ Sensor query error:', error);
      },
      complete: () => {
        console.log(`🌡️ Sensor query complete: ${sensorResults.length} points`);
      }
    });

    return res.json({
      success: true,
      test: 'step1-temp-humidity-data',
      timestamp: new Date().toISOString(),
      results: {
        writeTest: 'SUCCESS',
        basicQuery: {
          pointCount: basicResults.length,
          samplePoints: basicResults.slice(0, 3)
        },
        sensorQuery: {
          pointCount: sensorResults.length,
          samplePoints: sensorResults.slice(0, 3)
        }
      }
    });

  } catch (error) {
    console.error('🌡️ [Step 1] Error:', error);
    return res.status(500).json({
      success: false,
      test: 'step1-temp-humidity-data',
      error: error.message
    });
  }
});

/**
 * STEP 2: Test with _value field and check what data actually exists
 * GET /api/home/step2-check-data-structure
 */
router.get('/step2-check-data-structure', async (req, res) => {
  try {
    console.log('🔍 [Step 2] Checking actual data structure in InfluxDB...');

    const { InfluxDB, Point } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const writeApi = client.getWriteApi(process.env.INFLUXDB_ORG, process.env.INFLUXDB_BUCKET || 'default');

    // Write data with _value field (InfluxDB standard)
    const tempPoint = new Point('pool_metrics')
      .tag('sensor', 'pool_temperature')
      .floatField('_value', 73.2)
      .timestamp(new Date());

    const humidityPoint = new Point('pool_metrics')
      .tag('sensor', 'pool_humidity')
      .floatField('_value', 42.8)
      .timestamp(new Date());

    writeApi.writePoint(tempPoint);
    writeApi.writePoint(humidityPoint);
    await writeApi.close();

    console.log('🔍 Data written with _value field');

    // Wait for data to be available
    await new Promise(resolve => setTimeout(resolve, 3000));

    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    // Test 1: Check all recent data (no filters)
    const allDataQuery = `from(bucket: "pool-data") |> range(start: -10m) |> limit(n: 20)`;

    const allDataResults = [];
    await queryApi.queryRows(allDataQuery, {
      next: (row, tableMeta) => {
        allDataResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.error('🔍 All data query error:', error);
      },
      complete: () => {
        console.log(`🔍 All data query: ${allDataResults.length} points found`);
      }
    });

    // Test 2: Simple temperature query
    const tempQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET || 'default'}")
        |> range(start: -10m)
        |> filter(fn: (r) => r._measurement == "pool_metrics")
        |> filter(fn: (r) => r.sensor == "pool_temperature")
        |> limit(n: 5)
    `;

    const tempResults = [];
    await queryApi.queryRows(tempQuery, {
      next: (row, tableMeta) => {
        tempResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.error('🔍 Temperature query error:', error);
      },
      complete: () => {
        console.log(`🔍 Temperature query: ${tempResults.length} points found`);
      }
    });

    return res.json({
      success: true,
      test: 'step2-data-structure',
      timestamp: new Date().toISOString(),
      results: {
        allRecentData: {
          pointCount: allDataResults.length,
          samplePoints: allDataResults.slice(0, 5)
        },
        temperatureData: {
          pointCount: tempResults.length,
          samplePoints: tempResults.slice(0, 3)
        }
      }
    });

  } catch (error) {
    console.error('🔍 [Step 2] Error:', error);
    return res.status(500).json({
      success: false,
      test: 'step2-data-structure',
      error: error.message
    });
  }
});

/**
 * SCHEMA DISCOVERY: Interrogate InfluxDB to discover actual schema
 * GET /api/home/discover-schema
 */
router.get('/discover-schema', async (req, res) => {
  try {
    console.log('🔍 [Schema Discovery] Interrogating InfluxDB schema...');

    const { InfluxDB } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    const results = {};

    // 1. Get all measurements
    console.log('🔍 Finding measurements...');
    const measurementsQuery = `
      import "influxdata/influxdb/schema"
      schema.measurements(bucket: "pool-data")
    `;

    const measurements = [];
    try {
      await queryApi.queryRows(measurementsQuery, {
        next: (row, tableMeta) => {
          measurements.push(tableMeta.toObject(row));
        },
        error: (error) => {
          console.error('🔍 Measurements query error:', error);
        },
        complete: () => {
          console.log(`🔍 Found ${measurements.length} measurements`);
        }
      });
    } catch (error) {
      console.log('🔍 Measurements query failed, trying alternative...');
    }

    results.measurements = measurements;

    // 2. Get all tag keys
    console.log('🔍 Finding tag keys...');
    const tagKeysQuery = `
      import "influxdata/influxdb/schema"
      schema.tagKeys(bucket: "pool-data")
    `;

    const tagKeys = [];
    try {
      await queryApi.queryRows(tagKeysQuery, {
        next: (row, tableMeta) => {
          tagKeys.push(tableMeta.toObject(row));
        },
        error: (error) => {
          console.error('🔍 Tag keys query error:', error);
        },
        complete: () => {
          console.log(`🔍 Found ${tagKeys.length} tag keys`);
        }
      });
    } catch (error) {
      console.log('🔍 Tag keys query failed, trying alternative...');
    }

    results.tagKeys = tagKeys;

    // 3. Get all field keys
    console.log('🔍 Finding field keys...');
    const fieldKeysQuery = `
      import "influxdata/influxdb/schema"
      schema.fieldKeys(bucket: "pool-data")
    `;

    const fieldKeys = [];
    try {
      await queryApi.queryRows(fieldKeysQuery, {
        next: (row, tableMeta) => {
          fieldKeys.push(tableMeta.toObject(row));
        },
        error: (error) => {
          console.error('🔍 Field keys query error:', error);
        },
        complete: () => {
          console.log(`🔍 Found ${fieldKeys.length} field keys`);
        }
      });
    } catch (error) {
      console.log('🔍 Field keys query failed, trying alternative...');
    }

    results.fieldKeys = fieldKeys;

    // 4. Alternative: Get raw sample data from the last 30 days
    console.log('🔍 Getting raw sample data...');
    const sampleQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET || 'default'}")
        |> range(start: -30d)
        |> limit(n: 50)
    `;

    const sampleData = [];
    await queryApi.queryRows(sampleQuery, {
      next: (row, tableMeta) => {
        sampleData.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.error('🔍 Sample data query error:', error);
      },
      complete: () => {
        console.log(`🔍 Found ${sampleData.length} sample data points`);
      }
    });

    results.sampleData = {
      pointCount: sampleData.length,
      samplePoints: sampleData.slice(0, 10),
      uniqueMeasurements: [...new Set(sampleData.map(p => p._measurement).filter(Boolean))],
      uniqueFields: [...new Set(sampleData.map(p => p._field).filter(Boolean))],
      uniqueTags: {}
    };

    // Extract unique tag values
    const tagColumns = ['sensor', 'location', 'device', 'type'];
    tagColumns.forEach(tagCol => {
      const values = [...new Set(sampleData.map(p => p[tagCol]).filter(Boolean))];
      if (values.length > 0) {
        results.sampleData.uniqueTags[tagCol] = values;
      }
    });

    return res.json({
      success: true,
      test: 'schema-discovery',
      timestamp: new Date().toISOString(),
      schema: results
    });

  } catch (error) {
    console.error('🔍 [Schema Discovery] Error:', error);
    return res.status(500).json({
      success: false,
      test: 'schema-discovery',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * POPULATE TEST DATA: Write sample temperature/humidity data to test with
 * GET /api/home/populate-test-data
 */
router.get('/populate-test-data', async (req, res) => {
  try {
    console.log('📝 [Populate] Writing test temperature/humidity data...');

    const { InfluxDB, Point } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const writeApi = client.getWriteApi(process.env.INFLUXDB_ORG, process.env.INFLUXDB_BUCKET || 'default');

    // Write sample data points over the last 24 hours
    const now = new Date();
    const dataPoints = [];

    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Each hour back

      // Temperature data (simulate varying between 70-80°F)
      const tempValue = 75 + Math.sin(i * 0.5) * 3 + Math.random() * 2;
      const tempPoint = new Point('pool_metrics')
        .tag('sensor', 'pool_temperature')
        .floatField('_value', tempValue)
        .timestamp(timestamp);

      // Humidity data (simulate varying between 40-60%)
      const humidityValue = 50 + Math.sin(i * 0.3) * 8 + Math.random() * 3;
      const humidityPoint = new Point('pool_metrics')
        .tag('sensor', 'pool_humidity')
        .floatField('_value', humidityValue)
        .timestamp(timestamp);

      writeApi.writePoint(tempPoint);
      writeApi.writePoint(humidityPoint);

      dataPoints.push({
        time: timestamp.toISOString(),
        temperature: Math.round(tempValue * 10) / 10,
        humidity: Math.round(humidityValue * 10) / 10
      });
    }

    await writeApi.close();
    console.log('📝 Test data written successfully');

    // Wait for data to be available
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test the basic query
    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);
    const testQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET || 'default'}")
        |> range(start: -25h)
        |> filter(fn: (r) => r._measurement == "pool_metrics")
        |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity")
        |> limit(n: 10)
    `;

    const queryResults = [];
    await queryApi.queryRows(testQuery, {
      next: (row, tableMeta) => {
        queryResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.error('📝 Test query error:', error);
      },
      complete: () => {
        console.log(`📝 Test query found ${queryResults.length} points`);
      }
    });

    return res.json({
      success: true,
      test: 'populate-test-data',
      timestamp: new Date().toISOString(),
      results: {
        dataPointsWritten: dataPoints.length * 2, // temp + humidity
        sampleDataWritten: dataPoints.slice(0, 5),
        testQuery: {
          pointCount: queryResults.length,
          samplePoints: queryResults.slice(0, 5)
        }
      }
    });

  } catch (error) {
    console.error('📝 [Populate] Error:', error);
    return res.status(500).json({
      success: false,
      test: 'populate-test-data',
      error: error.message
    });
  }
});

/**
 * TEMPORARY DEBUG: Write and immediately query with wide time range
 * GET /api/home/debug-timing
 */
router.get('/debug-timing', async (req, res) => {
  try {
    const { InfluxDB, Point } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const writeApi = client.getWriteApi(process.env.INFLUXDB_ORG, process.env.INFLUXDB_BUCKET || 'default');
    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    // Write test data with explicit timestamp
    const now = new Date();
    const point = new Point('debug_test')
      .tag('sensor', 'timing_test')
      .floatField('_value', 123.45)
      .timestamp(now);

    console.log('🕒 Writing test point at:', now.toISOString());
    writeApi.writePoint(point);
    await writeApi.close();
    console.log('🕒 Write complete');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query with very wide range
    const bucketName = process.env.INFLUXDB_BUCKET || 'default';
    const query = `
      from(bucket: "${bucketName}")
        |> range(start: -7d)
        |> filter(fn: (r) => r._measurement == "debug_test")
        |> limit(n: 10)
    `;

    console.log('🕒 Executing query:', query);

    const results = [];
    await queryApi.queryRows(query, {
      next: (row, tableMeta) => {
        const obj = tableMeta.toObject(row);
        console.log('🕒 Found result:', JSON.stringify(obj, null, 2));
        results.push(obj);
      },
      error: (error) => {
        console.error('🕒 Query error:', error);
      },
      complete: () => {
        console.log(`🕒 Query complete: ${results.length} results`);
      }
    });

    return res.json({
      success: true,
      test: 'debug-timing',
      writeTimestamp: now.toISOString(),
      queryRange: '7 days',
      resultsFound: results.length,
      sampleResults: results.slice(0, 3)
    });

  } catch (error) {
    console.error('🕒 Debug timing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * SAMPLE ALL DATA: See what's actually in the bucket
 * GET /api/home/sample-all
 */
router.get('/sample-all', async (req, res) => {
  try {
    const { InfluxDB } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    // Query EVERYTHING in the bucket with no filters
    const bucketName = process.env.INFLUXDB_BUCKET || 'default';
    const query = `
      from(bucket: "${bucketName}")
        |> range(start: -30d)
        |> limit(n: 50)
    `;

    console.log('🔍 Sampling all data in bucket with query:', query);

    const results = [];
    await queryApi.queryRows(query, {
      next: (row, tableMeta) => {
        const obj = tableMeta.toObject(row);
        console.log('🔍 Raw data:', JSON.stringify(obj, null, 2));
        results.push(obj);
      },
      error: (error) => {
        console.error('🔍 Sample all error:', error);
      },
      complete: () => {
        console.log(`🔍 Sample complete: ${results.length} total results`);
      }
    });

    // Also get bucket info
    const bucketQuery = `buckets() |> filter(fn: (r) => r.name == "pool-data")`;
    const bucketResults = [];
    await queryApi.queryRows(bucketQuery, {
      next: (row, tableMeta) => {
        bucketResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.error('🔍 Bucket info error:', error);
      },
      complete: () => {
        console.log(`🔍 Bucket info: ${bucketResults.length} results`);
      }
    });

    // Get unique measurements, fields, tags
    const measurements = [...new Set(results.map(r => r._measurement).filter(Boolean))];
    const fields = [...new Set(results.map(r => r._field).filter(Boolean))];
    const tags = {};
    results.forEach(r => {
      Object.keys(r).forEach(key => {
        if (!key.startsWith('_') && key !== 'result' && key !== 'table') {
          if (!tags[key]) tags[key] = new Set();
          tags[key].add(r[key]);
        }
      });
    });

    // Convert Sets to arrays for JSON
    Object.keys(tags).forEach(key => {
      tags[key] = [...tags[key]].filter(Boolean);
    });

    return res.json({
      success: true,
      test: 'sample-all',
      bucket: 'pool-data',
      totalResults: results.length,
      timeRange: '30 days',
      bucketExists: bucketResults.length > 0,
      bucketInfo: bucketResults[0] || null,
      analysis: {
        uniqueMeasurements: measurements,
        uniqueFields: fields,
        uniqueTags: tags
      },
      sampleData: results.slice(0, 10)
    });

  } catch (error) {
    console.error('🔍 Sample all error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * LIST ALL BUCKETS: See what buckets actually exist
 * GET /api/home/list-buckets
 */
router.get('/list-buckets', async (req, res) => {
  try {
    const { InfluxDB } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    // List all buckets including system buckets
    const query = `buckets() |> filter(fn: (r) => true)`;

    console.log('🪣 Listing all buckets...');

    const results = [];
    await queryApi.queryRows(query, {
      next: (row, tableMeta) => {
        const obj = tableMeta.toObject(row);
        console.log('🪣 Bucket:', JSON.stringify(obj, null, 2));
        results.push(obj);
      },
      error: (error) => {
        console.error('🪣 List buckets error:', error);
      },
      complete: () => {
        console.log(`🪣 Found ${results.length} buckets`);
      }
    });

    return res.json({
      success: true,
      test: 'list-buckets',
      orgUsed: process.env.INFLUXDB_ORG,
      totalBuckets: results.length,
      buckets: results.map(b => ({
        name: b.name,
        id: b.id,
        orgID: b.orgID,
        type: b.type,
        description: b.description
      }))
    });

  } catch (error) {
    console.error('🪣 List buckets error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * CREATE BUCKET: Create the pool-data bucket
 * GET /api/home/create-bucket
 */
router.get('/create-bucket', async (req, res) => {
  try {
    const { InfluxDB } = require('@influxdata/influxdb-client');
    const { BucketsAPI } = require('@influxdata/influxdb-client-apis');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    // Get org ID first
    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);
    const orgQuery = `from(bucket: "_monitoring") |> range(start: -1h) |> limit(n: 1)`;

    // Try to get org info - this will tell us the org ID
    let orgID = null;
    try {
      const orgResults = [];
      await queryApi.queryRows(orgQuery, {
        next: (row, tableMeta) => {
          const obj = tableMeta.toObject(row);
          if (obj.orgID) orgID = obj.orgID;
        },
        error: () => {}, // Ignore errors
        complete: () => {}
      });
    } catch (e) {
      // Ignore - we'll try another way
    }

    // If we couldn't get org ID, try the buckets API to create anyway
    const bucketsAPI = new BucketsAPI(client);

    const bucketRequest = {
      name: 'pool-data',
      orgID: orgID,
      description: 'Pool monitoring data for nightswim app',
      retentionRules: [{
        type: 'expire',
        everySeconds: 365 * 24 * 60 * 60 // 1 year retention
      }]
    };

    console.log('🪣 Creating bucket with request:', JSON.stringify(bucketRequest, null, 2));

    const bucket = await bucketsAPI.postBuckets({ body: bucketRequest });

    return res.json({
      success: true,
      message: 'Bucket created successfully',
      bucket: {
        id: bucket.id,
        name: bucket.name,
        orgID: bucket.orgID,
        description: bucket.description
      }
    });

  } catch (error) {
    console.error('🪣 Create bucket error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

/**
 * BASIC RAW QUERY: Test the exact basic query from your working example
 * GET /api/home/test-basic-query
 */
router.get('/test-basic-query', async (req, res) => {
  try {
    const { InfluxDB } = require('@influxdata/influxdb-client');

    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    // Just the basic source query from your working example
    const query = `
      from(bucket: "pool-data")
        |> range(start: 2025-09-17T11:50:00Z, stop: 2025-09-17T12:50:00Z)
        |> filter(fn: (r) => r._measurement == "pool_metrics")
        |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity")
        |> keep(columns: ["_time", "_value", "sensor"])
        |> limit(n: 10)
    `;

    console.log('🔍 Testing basic raw query:', query);

    const results = [];
    await queryApi.queryRows(query, {
      next: (row, tableMeta) => {
        const obj = tableMeta.toObject(row);
        console.log('🔍 Raw result:', JSON.stringify(obj, null, 2));
        results.push(obj);
      },
      error: (error) => {
        console.error('🔍 Basic query error:', error);
      },
      complete: () => {
        console.log(`🔍 Basic query complete: ${results.length} results`);
      }
    });

    return res.json({
      success: true,
      test: 'basic-raw-query',
      dateRange: '2026-09-16 full day',
      totalResults: results.length,
      sampleResults: results.slice(0, 5),
      query: query.trim()
    });

  } catch (error) {
    console.error('🔍 Basic query test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
