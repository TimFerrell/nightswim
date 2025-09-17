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
        from(bucket: "pool-data")
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
        from(bucket: "pool-data")
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

    const writeApi = client.getWriteApi(process.env.INFLUXDB_ORG, 'pool-data');

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
      from(bucket: "pool-data")
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

module.exports = router;
