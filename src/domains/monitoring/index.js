/**
 * Monitoring Domain Index
 */

const { TimeSeriesService, timeSeriesService } = require('./services/time-series');
const { InfluxDBClient, influxDBClient } = require('./services/influxdb-client');

module.exports = {
  TimeSeriesService,
  timeSeriesService,
  InfluxDBClient,
  influxDBClient
};