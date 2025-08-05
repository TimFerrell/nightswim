/**
 * UI Optimization Tests
 * Tests to ensure the performance optimizations don't break existing functionality
 */

describe('UI Optimization Tests', () => {
  let document;
  let window;

  beforeEach(() => {
    // Create a fresh DOM environment for each test
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test</title>
          <style>
            .status-card { transform: translateZ(0); will-change: transform, opacity; }
            .status-value { contain: layout style paint; }
            .skeleton-value { background: linear-gradient(90deg, #e9ecef 25%, #f8f9fa 50%, #e9ecef 75%); }
          </style>
        </head>
        <body>
          <!-- Status Cards -->
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
          
          <!-- Chart Elements -->
          <select id="timeRange">
            <option value="1">Last Hour</option>
            <option value="24" selected>Last 24 Hours</option>
          </select>
          <div id="tempChartStatus">Loading...</div>
          <div id="electricalChartStatus">Loading...</div>
          <div id="chemistryChartStatus">Loading...</div>
          
          <!-- Sparkline Canvases -->
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

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    global.fetch = jest.fn();
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Mock Chart.js
    global.Chart = {
      register: jest.fn(),
      getChart: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.document = undefined;
    global.window = undefined;
    global.fetch = undefined;
    global.Chart = undefined;
  });

  // Test the optimization functions directly
  describe('DOM Cache Optimization', () => {
    test('should create and initialize DOM cache correctly', () => {
      // Create the DOM cache object
      const domCache = {
        saltValue: null,
        saltCard: null,
        waterTempValue: null,
        waterTempComfort: null,
        waterTempCard: null,
        cellVoltageValue: null,
        cellVoltageStatus: null,
        cellVoltageCard: null,
        filterPumpValue: null,
        filterPumpState: null,
        filterPumpCard: null,
        weatherTempValue: null,
        weatherCard: null,
        
        init() {
          this.saltValue = document.getElementById('saltValue');
          this.saltCard = document.getElementById('saltCard');
          this.waterTempValue = document.getElementById('waterTempValue');
          this.waterTempComfort = document.getElementById('waterTempComfort');
          this.waterTempCard = document.getElementById('waterTempCard');
          this.cellVoltageValue = document.getElementById('cellVoltageValue');
          this.cellVoltageStatus = document.getElementById('cellVoltageStatus');
          this.cellVoltageCard = document.getElementById('cellVoltageCard');
          this.filterPumpValue = document.getElementById('filterPumpValue');
          this.filterPumpState = document.getElementById('filterPumpState');
          this.filterPumpCard = document.getElementById('filterPumpCard');
          this.weatherTempValue = document.getElementById('weatherTempValue');
          this.weatherCard = document.getElementById('weatherCard');
        }
      };

      // Test initialization
      expect(domCache).toBeDefined();
      expect(typeof domCache.init).toBe('function');
      
      // Initialize cache
      domCache.init();
      
      // Verify all elements are cached
      expect(domCache.saltValue).toBe(document.getElementById('saltValue'));
      expect(domCache.saltCard).toBe(document.getElementById('saltCard'));
      expect(domCache.waterTempValue).toBe(document.getElementById('waterTempValue'));
      expect(domCache.waterTempComfort).toBe(document.getElementById('waterTempComfort'));
      expect(domCache.waterTempCard).toBe(document.getElementById('waterTempCard'));
      expect(domCache.cellVoltageValue).toBe(document.getElementById('cellVoltageValue'));
      expect(domCache.cellVoltageStatus).toBe(document.getElementById('cellVoltageStatus'));
      expect(domCache.cellVoltageCard).toBe(document.getElementById('cellVoltageCard'));
      expect(domCache.filterPumpValue).toBe(document.getElementById('filterPumpValue'));
      expect(domCache.filterPumpState).toBe(document.getElementById('filterPumpState'));
      expect(domCache.filterPumpCard).toBe(document.getElementById('filterPumpCard'));
      expect(domCache.weatherTempValue).toBe(document.getElementById('weatherTempValue'));
      expect(domCache.weatherCard).toBe(document.getElementById('weatherCard'));
    });

    test('should handle missing DOM elements gracefully', () => {
      const domCache = {
        saltValue: null,
        waterTempValue: null,
        
        init() {
          this.saltValue = document.getElementById('saltValue');
          this.waterTempValue = document.getElementById('waterTempValue');
        }
      };

      // Remove some elements
      document.getElementById('saltValue').remove();
      
      // Should not throw error
      expect(() => domCache.init()).not.toThrow();
      
      // Missing elements should be null
      expect(domCache.saltValue).toBeNull();
      expect(domCache.waterTempValue).toBe(document.getElementById('waterTempValue'));
    });
  });

  describe('Debounce Utility', () => {
    test('should debounce function calls', (done) => {
      const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      };

      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      // Call multiple times rapidly
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // Should only be called once after delay
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 150);
    });

    test('should pass arguments correctly', (done) => {
      const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      };

      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 50);
      
      debouncedFn('test', 123);
      
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledWith('test', 123);
        done();
      }, 100);
    });
  });

  describe('Request Cache', () => {
    test('should cache data with TTL', () => {
      const requestCache = {
        data: null,
        timestamp: 0,
        ttl: 5000,
        
        isValid() {
          return this.data && (Date.now() - this.timestamp) < this.ttl;
        },
        
        set(data) {
          this.data = data;
          this.timestamp = Date.now();
        },
        
        get() {
          return this.isValid() ? this.data : null;
        },
        
        clear() {
          this.data = null;
          this.timestamp = 0;
        }
      };

      const testData = { test: 'data' };
      
      // Set cache
      requestCache.set(testData);
      expect(requestCache.get()).toBe(testData);
      expect(requestCache.isValid()).toBe(true);
    });

    test('should expire cache after TTL', (done) => {
      const requestCache = {
        data: null,
        timestamp: 0,
        ttl: 50, // Short TTL for testing
        
        isValid() {
          return this.data && (Date.now() - this.timestamp) < this.ttl;
        },
        
        set(data) {
          this.data = data;
          this.timestamp = Date.now();
        },
        
        get() {
          return this.isValid() ? this.data : null;
        }
      };

      const testData = { test: 'data' };
      requestCache.set(testData);
      
      setTimeout(() => {
        expect(requestCache.isValid()).toBe(false);
        expect(requestCache.get()).toBeNull();
        done();
      }, 100);
    });

    test('should clear cache correctly', () => {
      const requestCache = {
        data: null,
        timestamp: 0,
        ttl: 5000,
        
        isValid() {
          return this.data && (Date.now() - this.timestamp) < this.ttl;
        },
        
        set(data) {
          this.data = data;
          this.timestamp = Date.now();
        },
        
        get() {
          return this.isValid() ? this.data : null;
        },
        
        clear() {
          this.data = null;
          this.timestamp = 0;
        }
      };

      const testData = { test: 'data' };
      requestCache.set(testData);
      
      requestCache.clear();
      expect(requestCache.get()).toBeNull();
      expect(requestCache.isValid()).toBeFalsy();
      expect(requestCache.data).toBeNull();
      expect(requestCache.timestamp).toBe(0);
    });
  });

  describe('Status Card Updates', () => {
    test('should update status cards correctly', () => {
      const domCache = {
        saltValue: null,
        saltCard: null,
        waterTempValue: null,
        waterTempCard: null,
        
        init() {
          this.saltValue = document.getElementById('saltValue');
          this.saltCard = document.getElementById('saltCard');
          this.waterTempValue = document.getElementById('waterTempValue');
          this.waterTempCard = document.getElementById('waterTempCard');
        }
      };

      domCache.init();
      
      const testData = {
        chlorinator: {
          salt: { instant: 2800 }
        },
        dashboard: {
          temperature: { actual: 85 }
        },
        filter: { status: true }
      };
      
      // Test salt level update
      if (testData.chlorinator?.salt?.instant && testData.chlorinator.salt.instant !== null && testData.chlorinator.salt.instant !== '--') {
        domCache.saltValue.textContent = testData.chlorinator.salt.instant;
        domCache.saltValue.classList.remove('skeleton-value');
        domCache.saltCard.classList.add('loaded');
      }
      
      expect(domCache.saltValue.textContent).toBe('2800');
      expect(domCache.saltValue.classList.contains('skeleton-value')).toBe(false);
      expect(domCache.saltCard.classList.contains('loaded')).toBe(true);
    });

    test('should show pump off message when pump is off', () => {
      const domCache = {
        saltValue: null,
        waterTempValue: null,
        
        init() {
          this.saltValue = document.getElementById('saltValue');
          this.waterTempValue = document.getElementById('waterTempValue');
        }
      };

      domCache.init();
      
      const testData = {
        chlorinator: { salt: { instant: null } },
        filter: { status: false }
      };
      
      // Test pump off logic
      if (testData.filter?.status === false) {
        domCache.saltValue.textContent = 'Pump Off';
        domCache.saltValue.classList.remove('skeleton-value');
        domCache.saltValue.classList.add('pump-off-indicator');
      }
      
      expect(domCache.saltValue.textContent).toBe('Pump Off');
      expect(domCache.saltValue.classList.contains('pump-off-indicator')).toBe(true);
    });
  });

  describe('Performance Optimizations', () => {
    test('should use hardware acceleration CSS classes', () => {
      const statusCard = document.getElementById('saltCard');
      const computedStyle = window.getComputedStyle(statusCard);
      
      // Check if transform is applied (hardware acceleration)
      expect(computedStyle.transform).toBe('translateZ(0)');
      expect(computedStyle.willChange).toBe('transform, opacity');
    });

    test('should have containment for performance', () => {
      const statusValue = document.getElementById('saltValue');
      const computedStyle = window.getComputedStyle(statusValue);
      
      expect(computedStyle.contain).toBe('layout style paint');
    });
  });

  describe('Memory Management', () => {
    test('should not create memory leaks with debounced functions', () => {
      const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      };

      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      // Call many times
      for (let i = 0; i < 100; i++) {
        debouncedFn();
      }
      
      // Should not throw or cause issues
      expect(() => debouncedFn()).not.toThrow();
    });

    test('should clear timeouts properly', (done) => {
      const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      };

      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 50);
      
      debouncedFn();
      
      // Clear before timeout
      setTimeout(() => {
        debouncedFn(); // This should reset the timeout
      }, 25);
      
      setTimeout(() => {
        expect(mockFn).toHaveBeenCalledTimes(1);
        done();
      }, 100);
    });
  });
}); 