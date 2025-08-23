/**
 * Test Setup File
 * Configures the testing environment for UI optimization tests
 */

// Global test timeout
jest.setTimeout(10000);

// Polyfill TextEncoder for jsdom
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock Chart.js
global.Chart = {
  register: jest.fn(),
  getChart: jest.fn(),
  defaults: {
    font: {
      family: 'Inter, sans-serif'
    }
  }
};

// Mock window.matchMedia for dark mode detection
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

// Helper function to wait for async operations
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to create test data
global.createTestData = () => ({
  chlorinator: {
    salt: { instant: 2800 },
    cell: { voltage: 23.5, temperature: 75 }
  },
  dashboard: {
    temperature: { actual: 85 }
  },
  filter: { status: true },
  weather: { temperature: 90 }
});

// Helper function to create test DOM
global.createTestDOM = () => {
  const { JSDOM } = require('jsdom');
  return new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        <div id="saltValue" class="status-value skeleton-value">--</div>
        <div id="saltCard" class="status-card"></div>
        <div id="waterTempValue" class="status-value skeleton-value">--</div>
        <div id="waterTempComfort" class="status-detail-value skeleton-text">--</div>
        <div id="waterTempCard" class="status-card"></div>
        <div id="cellVoltageValue" class="status-value skeleton-value">--</div>
        <div id="cellVoltageStatus" class="status-detail-value skeleton-text">--</div>
        <div id="cellVoltageCard" class="status-card"></div>
        <div id="filterPumpValue" class="status-value skeleton-value">--</div>
        <div id="filterPumpState" class="status-detail-value skeleton-text">--</div>
        <div id="filterPumpCard" class="status-card"></div>
        <div id="weatherTempValue" class="status-value skeleton-value">--</div>
        <div id="weatherCard" class="status-card"></div>
        <select id="timeRange">
          <option value="24" selected>Last 24 Hours</option>
        </select>
        <div id="tempChartStatus">Loading...</div>
        <div id="electricalChartStatus">Loading...</div>
        <div id="chemistryChartStatus">Loading...</div>
        <canvas id="saltSparkline"></canvas>
        <canvas id="waterTempSparkline"></canvas>
        <canvas id="cellVoltageSparkline"></canvas>
        <canvas id="weatherSparkline"></canvas>
        <canvas id="filterPumpSparkline"></canvas>
      </body>
    </html>
  `, {
    url: 'http://localhost',
    pretendToBeVisual: true
  });
};
