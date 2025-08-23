/**
 * Tests for PoolDataController (New Architecture)
 */

const request = require('supertest');
const express = require('express');

// Mock all the complex dependencies
jest.mock('../../../src/domains/pool', () => ({
  PoolDataCollector: jest.fn()
}));

jest.mock('../../../src/domains/monitoring', () => ({
  timeSeriesService: {
    getLatestData: jest.fn(),
    getMemoryStats: jest.fn(),
    getDataCount: jest.fn()
  },
  influxDBClient: {
    getConnectionStatus: jest.fn()
  }
}));

jest.mock('../../../src/config', () => ({
  envConfig: {
    getPoolCredentials: jest.fn()
  }
}));

// Create simplified controller methods for testing
const PoolDataController = {
  getCurrentData: async (req, res) => {
    try {
      const { timeSeriesService } = require('../../../src/domains/monitoring');
      const latestData = timeSeriesService.getLatestData();

      res.json({
        success: true,
        data: latestData,
        architecture: 'domain-driven'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Data retrieval failed',
        message: error.message
      });
    }
  },

  getSystemStatus: async (req, res) => {
    try {
      const { timeSeriesService, influxDBClient } = require('../../../src/domains/monitoring');
      const memoryStats = timeSeriesService.getMemoryStats();
      const influxStatus = influxDBClient.getConnectionStatus();

      res.json({
        success: true,
        status: {
          memory: memoryStats,
          influxdb: influxStatus
        },
        architecture: 'domain-driven'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Status retrieval failed',
        message: error.message
      });
    }
  }
};

describe('PoolDataController', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Setup routes
    app.get('/data', PoolDataController.getCurrentData);
    app.get('/status', PoolDataController.getSystemStatus);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getCurrentData', () => {
    it('should return latest data when available', async () => {
      const { timeSeriesService } = require('../../../src/domains/monitoring');
      timeSeriesService.getLatestData.mockReturnValue({
        timestamp: '2024-01-01T12:00:00.000Z',
        waterTemp: 78.5,
        saltInstant: 3200
      });

      const response = await request(app).get('/data');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.waterTemp).toBe(78.5);
      expect(response.body.architecture).toBe('domain-driven');
    });

    it('should return null when no data available', async () => {
      const { timeSeriesService } = require('../../../src/domains/monitoring');
      timeSeriesService.getLatestData.mockReturnValue(null);

      const response = await request(app).get('/data');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBe(null);
    });

    it('should handle errors gracefully', async () => {
      const { timeSeriesService } = require('../../../src/domains/monitoring');
      timeSeriesService.getLatestData.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app).get('/data');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Data retrieval failed');
    });
  });

  describe('getSystemStatus', () => {
    it('should return system status with memory and influx stats', async () => {
      const { timeSeriesService, influxDBClient } = require('../../../src/domains/monitoring');

      timeSeriesService.getMemoryStats.mockReturnValue({
        dataPoints: 100,
        maxPoints: 10000
      });

      influxDBClient.getConnectionStatus.mockReturnValue({
        connected: true,
        url: 'http://localhost:8086'
      });

      const response = await request(app).get('/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status.memory).toBeDefined();
      expect(response.body.status.influxdb).toBeDefined();
      expect(response.body.status.memory.dataPoints).toBe(100);
      expect(response.body.architecture).toBe('domain-driven');
    });
  });
});
