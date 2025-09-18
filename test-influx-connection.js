const { InfluxDB } = require('@influxdata/influxdb-client');

// Set environment variables
process.env.INFLUXDB_URL = 'https://us-central1-1.gcp.cloud2.influxdata.com';
process.env.INFLUX_DB_TOKEN = 'msQEjVFc4CfAOgEprMLFDU7KrFg8fm56SuxvlfdQrTTUBURHCxZGRJMFqrIkxbL0FuHcA9TJ8Xu4IFrCTqRp1w==';
process.env.INFLUXDB_ORG = 'timothyferrell@gmail.com';
process.env.INFLUXDB_BUCKET = 'pool-data';

async function testConnection() {
  console.log('🔧 Testing InfluxDB connection...');
  console.log('URL:', process.env.INFLUXDB_URL);
  console.log('Org:', process.env.INFLUXDB_ORG);
  console.log('Bucket:', process.env.INFLUXDB_BUCKET);
  console.log('Token:', process.env.INFLUX_DB_TOKEN ? 'SET' : 'NOT SET');

  try {
    const client = new InfluxDB({
      url: process.env.INFLUXDB_URL,
      token: process.env.INFLUX_DB_TOKEN
    });

    const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

    // Test 1: Basic connectivity
    console.log('\n🔍 Test 1: Basic connectivity...');
    const basicQuery = `from(bucket: "${process.env.INFLUXDB_BUCKET}") |> range(start: -30d) |> limit(n: 1)`;

    const basicResults = [];
    await queryApi.queryRows(basicQuery, {
      next: (row, tableMeta) => {
        basicResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.log('   ❌ Basic query error:', error.message);
      },
      complete: () => {
        console.log(`   ✅ Basic query completed: ${basicResults.length} results`);
      }
    });

    // Test 2: Bucket listing
    console.log('\n🔍 Test 2: Bucket listing...');
    const bucketQuery = `buckets() |> filter(fn: (r) => r.name == "${process.env.INFLUXDB_BUCKET}")`;

    const bucketResults = [];
    await queryApi.queryRows(bucketQuery, {
      next: (row, tableMeta) => {
        bucketResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.log('   ❌ Bucket query error:', error.message);
      },
      complete: () => {
        console.log(`   ✅ Bucket query completed: ${bucketResults.length} results`);
        if (bucketResults.length > 0) {
          console.log('   📋 Bucket info:', JSON.stringify(bucketResults[0], null, 2));
        }
      }
    });

    // Test 3: Home environment query
    console.log('\n🔍 Test 3: Home environment query...');
    const homeQuery = `
      from(bucket: "${process.env.INFLUXDB_BUCKET}")
        |> range(start: 2025-09-17T11:50:00Z, stop: 2025-09-17T12:50:00Z)
        |> filter(fn: (r) => r._measurement == "pool_metrics")
        |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity")
        |> limit(n: 5)
    `;

    const homeResults = [];
    await queryApi.queryRows(homeQuery, {
      next: (row, tableMeta) => {
        homeResults.push(tableMeta.toObject(row));
      },
      error: (error) => {
        console.log('   ❌ Home environment query error:', error.message);
      },
      complete: () => {
        console.log(`   ✅ Home environment query completed: ${homeResults.length} results`);
        if (homeResults.length > 0) {
          console.log('   📋 Sample data:', JSON.stringify(homeResults[0], null, 2));
        }
      }
    });

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Basic connectivity: ${basicResults.length > 0 ? '✅' : '❌'} (${basicResults.length} results)`);
    console.log(`   Bucket access: ${bucketResults.length > 0 ? '✅' : '❌'} (${bucketResults.length} results)`);
    console.log(`   Home environment data: ${homeResults.length > 0 ? '✅' : '❌'} (${homeResults.length} results)`);

    if (homeResults.length === 0) {
      console.log('\n💡 Diagnosis:');
      if (basicResults.length === 0 && bucketResults.length === 0) {
        console.log('   🔐 Token permission issue - cannot access bucket or list buckets');
        console.log('   🔧 Solution: Check token permissions in InfluxDB Cloud console');
      } else if (basicResults.length > 0 && homeResults.length === 0) {
        console.log('   📊 Data structure issue - bucket accessible but no home environment data');
        console.log('   🔧 Solution: Check measurement names, sensor names, or time range');
      } else {
        console.log('   ❓ Mixed results - need further investigation');
      }
    } else {
      console.log('\n✅ Home environment data is accessible!');
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testConnection();
