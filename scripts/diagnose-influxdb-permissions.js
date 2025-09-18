#!/usr/bin/env node

/**
 * InfluxDB Permission Diagnostics Script
 *
 * This script helps diagnose InfluxDB permission issues by testing various
 * aspects of the connection and data access.
 *
 * Usage: node scripts/diagnose-influxdb-permissions.js
 */

const { InfluxDB } = require('@influxdata/influxdb-client');
require('dotenv').config();

class InfluxDBPermissionDiagnostics {
  constructor() {
    this.config = {
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN,
      org: process.env.INFLUXDB_ORG,
      bucket: process.env.INFLUXDB_BUCKET
    };

    this.client = null;
    this.queryApi = null;
    this.writeApi = null;
  }

  async initialize() {
    console.log('🔧 Initializing InfluxDB client...');

    if (!this.config.url || !this.config.token || !this.config.org) {
      throw new Error('Missing required InfluxDB configuration. Please check your environment variables.');
    }

    this.client = new InfluxDB({
      url: this.config.url,
      token: this.config.token
    });

    this.queryApi = this.client.getQueryApi(this.config.org);
    this.writeApi = this.client.getWriteApi(this.config.org, this.config.bucket);

    console.log('✅ InfluxDB client initialized');
    console.log(`   URL: ${this.config.url}`);
    console.log(`   Org: ${this.config.org}`);
    console.log(`   Bucket: ${this.config.bucket}`);
    console.log(`   Token: ${this.config.token ? `SET (${this.config.token.length} chars)` : 'NOT SET'}`);
  }

  async testBasicConnectivity() {
    console.log('\n🔍 Testing basic connectivity...');

    try {
      // Test with a simple query that should work if token is valid
      const query = 'from(bucket: "_monitoring") |> range(start: -1h) |> limit(n: 1)';

      let hasData = false;
      let error = null;

      await this.queryApi.queryRows(query, {
        next: () => { hasData = true; },
        error: (err) => { error = err; },
        complete: () => {}
      });

      if (error) {
        console.log(`   ⚠️  Token authentication: ${error.message}`);
        console.log('   📝 This is expected for limited tokens - system buckets require admin permissions');
        return { success: true, message: 'Token valid but limited permissions' };
      } else if (hasData) {
        console.log('   ✅ Token has admin permissions');
        return { success: true, message: 'Token has admin permissions' };
      }
      console.log('   ✅ Token authentication successful');
      return { success: true, message: 'Token authentication successful' };

    } catch (error) {
      console.log(`   ❌ Connectivity test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testBucketAccess() {
    console.log('\n🪣 Testing bucket access...');

    const buckets = ['pool-data', 'pool_data', 'poolData', 'nightswim-data', 'nightswim_data'];
    const results = [];

    for (const bucket of buckets) {
      try {
        const query = `from(bucket: "${bucket}") |> range(start: -1h) |> limit(n: 1)`;

        let accessible = false;
        let error = null;

        await this.queryApi.queryRows(query, {
          next: () => { accessible = true; },
          error: (err) => { error = err; },
          complete: () => {}
        });

        if (accessible) {
          console.log(`   ✅ Bucket "${bucket}" is accessible`);
          results.push({ bucket, accessible: true });
        } else {
          console.log(`   ❌ Bucket "${bucket}" not accessible: ${error?.message || 'No data'}`);
          results.push({ bucket, accessible: false, error: error?.message });
        }
      } catch (error) {
        console.log(`   ❌ Bucket "${bucket}" error: ${error.message}`);
        results.push({ bucket, accessible: false, error: error.message });
      }
    }

    return results;
  }

  async testDataAccess() {
    console.log('\n📊 Testing data access...');

    const tests = [
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
        name: 'Home Environment Query (Exact Time)',
        query: `from(bucket: "${this.config.bucket}") |> range(start: 2025-09-17T11:50:00Z, stop: 2025-09-17T12:50:00Z) |> filter(fn: (r) => r._measurement == "pool_metrics") |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity") |> limit(n: 5)`,
        description: 'Home environment data access (exact time range from CSV)'
      }
    ];

    const results = [];

    for (const test of tests) {
      try {
        console.log(`   🔍 Testing: ${test.name}`);

        const startTime = Date.now();
        const data = [];

        await this.queryApi.queryRows(test.query, {
          next: (row, tableMeta) => {
            data.push(tableMeta.toObject(row));
          },
          error: (error) => {
            console.log(`      ❌ Query error: ${error.message}`);
          },
          complete: () => {}
        });

        const queryTime = Date.now() - startTime;

        if (data.length > 0) {
          console.log(`      ✅ Found ${data.length} results in ${queryTime}ms`);
          console.log('      📋 Sample data:', JSON.stringify(data[0], null, 6));
        } else {
          console.log(`      ⚠️  No data found in ${queryTime}ms`);
        }

        results.push({
          name: test.name,
          success: true,
          resultCount: data.length,
          queryTime,
          sampleData: data.slice(0, 2)
        });

      } catch (error) {
        console.log(`      ❌ Test failed: ${error.message}`);
        results.push({
          name: test.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async testSchemaDiscovery() {
    console.log('\n🔍 Discovering schema...');

    try {
      // Get sample data to understand the schema
      const query = `from(bucket: "${this.config.bucket}") |> range(start: -30d) |> limit(n: 20)`;

      const sampleData = [];
      await this.queryApi.queryRows(query, {
        next: (row, tableMeta) => {
          sampleData.push(tableMeta.toObject(row));
        },
        error: (error) => {
          console.log(`   ❌ Schema discovery error: ${error.message}`);
        },
        complete: () => {}
      });

      if (sampleData.length > 0) {
        console.log(`   📊 Found ${sampleData.length} sample data points`);

        // Analyze schema
        const measurements = [...new Set(sampleData.map(d => d._measurement).filter(Boolean))];
        const fields = [...new Set(sampleData.map(d => d._field).filter(Boolean))];
        const tags = {};

        sampleData.forEach(d => {
          Object.keys(d).forEach(key => {
            if (!key.startsWith('_') && key !== 'result' && key !== 'table') {
              if (!tags[key]) tags[key] = new Set();
              tags[key].add(d[key]);
            }
          });
        });

        // Convert Sets to arrays
        Object.keys(tags).forEach(key => {
          tags[key] = [...tags[key]].filter(Boolean);
        });

        console.log(`   📋 Measurements: ${measurements.join(', ')}`);
        console.log(`   📋 Fields: ${fields.join(', ')}`);
        console.log('   📋 Tags:', JSON.stringify(tags, null, 6));

        return {
          success: true,
          sampleCount: sampleData.length,
          measurements,
          fields,
          tags,
          sampleData: sampleData.slice(0, 3)
        };
      }
      console.log('   ⚠️  No sample data found for schema discovery');
      return { success: true, sampleCount: 0 };

    } catch (error) {
      console.log(`   ❌ Schema discovery failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testWritePermissions() {
    console.log('\n✍️  Testing write permissions...');

    try {
      const { Point } = require('@influxdata/influxdb-client');

      // Write a test point
      const testPoint = new Point('permission_test')
        .tag('test', 'diagnostics')
        .floatField('value', 42.0)
        .timestamp(new Date());

      this.writeApi.writePoint(testPoint);
      await this.writeApi.close();

      console.log('   ✅ Write test successful');

      // Wait a moment for data to be available
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to read it back
      const readQuery = `from(bucket: "${this.config.bucket}") |> range(start: -5m) |> filter(fn: (r) => r._measurement == "permission_test") |> limit(n: 1)`;

      const readResults = [];
      await this.queryApi.queryRows(readQuery, {
        next: (row, tableMeta) => {
          readResults.push(tableMeta.toObject(row));
        },
        error: (error) => {
          console.log(`   ⚠️  Read-back test error: ${error.message}`);
        },
        complete: () => {}
      });

      if (readResults.length > 0) {
        console.log('   ✅ Read-back test successful');
        return { success: true, writeSuccess: true, readBackSuccess: true };
      }
      console.log('   ⚠️  Write successful but read-back failed');
      return { success: true, writeSuccess: true, readBackSuccess: false };


    } catch (error) {
      console.log(`   ❌ Write test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async generateRecommendations(results) {
    console.log('\n💡 Recommendations:');

    const issues = [];
    const recommendations = [];

    // Analyze connectivity
    if (!results.connectivity.success) {
      issues.push('Token authentication failed');
      recommendations.push('Verify INFLUX_DB_TOKEN environment variable');
    }

    // Analyze bucket access
    const accessibleBuckets = results.bucketAccess.filter(b => b.accessible);
    if (accessibleBuckets.length === 0) {
      issues.push('No buckets accessible');
      recommendations.push('Check bucket permissions for the token');
      recommendations.push('Verify bucket names match exactly');
    }

    // Analyze data access
    const successfulDataTests = results.dataAccess.filter(t => t.success && t.resultCount > 0);
    if (successfulDataTests.length === 0) {
      const failedDataTests = results.dataAccess.filter(t => !t.success);
      if (failedDataTests.length > 0) {
        issues.push('Data access queries failing');
        recommendations.push('Check read permissions for the token');
      } else {
        issues.push('No data found in accessible buckets');
        recommendations.push('Verify data is being written to the bucket');
        recommendations.push('Check data retention policies');
      }
    }

    // Analyze schema
    if (results.schema.success && results.schema.sampleCount === 0) {
      issues.push('Bucket exists but contains no data');
      recommendations.push('Check if data collection is working');
      recommendations.push('Verify data is being written to the correct bucket');
    }

    // Print recommendations
    if (issues.length === 0) {
      console.log('   ✅ No issues detected - InfluxDB access appears to be working correctly');
    } else {
      console.log('   📋 Issues found:');
      issues.forEach(issue => console.log(`      • ${issue}`));

      console.log('   🔧 Recommended actions:');
      recommendations.forEach(rec => console.log(`      • ${rec}`));
    }

    return { issues, recommendations };
  }

  async runDiagnostics() {
    console.log('🚀 Starting InfluxDB Permission Diagnostics\n');

    try {
      await this.initialize();

      const results = {
        connectivity: await this.testBasicConnectivity(),
        bucketAccess: await this.testBucketAccess(),
        dataAccess: await this.testDataAccess(),
        schema: await this.testSchemaDiscovery(),
        writePermissions: await this.testWritePermissions()
      };

      const recommendations = await this.generateRecommendations(results);

      console.log('\n📊 Summary:');
      console.log(`   Connectivity: ${results.connectivity.success ? '✅' : '❌'}`);
      console.log(`   Bucket Access: ${results.bucketAccess.filter(b => b.accessible).length}/${results.bucketAccess.length} buckets accessible`);
      console.log(`   Data Access: ${results.dataAccess.filter(t => t.success && t.resultCount > 0).length}/${results.dataAccess.length} tests successful`);
      console.log(`   Schema Discovery: ${results.schema.success ? '✅' : '❌'}`);
      console.log(`   Write Permissions: ${results.writePermissions.success ? '✅' : '❌'}`);

      return {
        success: true,
        results,
        recommendations
      };

    } catch (error) {
      console.log(`\n❌ Diagnostics failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run diagnostics if this script is executed directly
if (require.main === module) {
  const diagnostics = new InfluxDBPermissionDiagnostics();
  diagnostics.runDiagnostics()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Diagnostics completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Diagnostics failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = InfluxDBPermissionDiagnostics;
