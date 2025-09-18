const { InfluxDB } = require('@influxdata/influxdb-client');

// Set environment variables
process.env.INFLUXDB_URL = 'https://us-central1-1.gcp.cloud2.influxdata.com';
process.env.INFLUX_DB_TOKEN = 'msQEjVFc4CfAOgEprMLFDU7KrFg8fm56SuxvlfdQrTTUBURHCxZGRJMFqrIkxbL0FuHcA9TJ8Xu4IFrCTqRp1w==';
process.env.INFLUXDB_ORG = 'timothyferrell@gmail.com';
process.env.INFLUXDB_BUCKET = 'pool-data';

async function testExactQuery() {
  console.log('🔍 Testing the EXACT query from your application...\n');

  const client = new InfluxDB({
    url: process.env.INFLUXDB_URL,
    token: process.env.INFLUX_DB_TOKEN
  });

  const queryApi = client.getQueryApi(process.env.INFLUXDB_ORG);

  // This is the EXACT query from your influxdb-client.js
  const exactQuery = `
    // Source data: temperature and humidity sensors
    src =
      from(bucket: "pool-data")
        |> range(start: 2025-09-17T11:50:00Z, stop: 2025-09-17T12:50:00Z)
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
      |> limit(n: 1000)
  `;

  console.log('Executing complex query...');

  let resultCount = 0;
  const sampleResults = [];

  try {
    await queryApi.queryRows(exactQuery, {
      next: (row, tableMeta) => {
        resultCount++;
        const obj = tableMeta.toObject(row);
        if (sampleResults.length < 3) {
          sampleResults.push(obj);
        }
        console.log(`Result ${resultCount}:`, JSON.stringify(obj, null, 2));
      },
      error: (error) => {
        console.error('❌ Query error:', error);
      },
      complete: () => {
        console.log(`\n✅ Query completed: ${resultCount} results`);
      }
    });

    console.log('\n📊 Final Results:');
    console.log(`   Total results: ${resultCount}`);
    console.log('   Sample results:', JSON.stringify(sampleResults, null, 2));

  } catch (error) {
    console.error('❌ Query execution failed:', error);
  }

  // Now test the simpler version that worked
  console.log('\n🔍 Testing the simpler query that worked...');

  const simpleQuery = `
    from(bucket: "pool-data")
      |> range(start: 2025-09-17T11:50:00Z, stop: 2025-09-17T12:50:00Z)
      |> filter(fn: (r) => r._measurement == "pool_metrics")
      |> filter(fn: (r) => r.sensor == "pool_temperature" or r.sensor == "pool_humidity")
      |> limit(n: 10)
  `;

  let simpleCount = 0;
  await queryApi.queryRows(simpleQuery, {
    next: (row, tableMeta) => {
      simpleCount++;
      if (simpleCount <= 2) {
        console.log(`Simple result ${simpleCount}:`, JSON.stringify(tableMeta.toObject(row), null, 2));
      }
    },
    error: (error) => {
      console.error('❌ Simple query error:', error);
    },
    complete: () => {
      console.log(`✅ Simple query completed: ${simpleCount} results`);
    }
  });
}

testExactQuery();
