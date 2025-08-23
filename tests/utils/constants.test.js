/**
 * Constants Tests
 * Tests for application constants
 */

const { POOL_CONSTANTS, buildSystemUrl, buildDashboardUrl } = require('../../src/utils/constants');

describe('Constants', () => {
  describe('POOL_CONSTANTS', () => {
    test('should have required system identifiers', () => {
      expect(POOL_CONSTANTS.MSP_ID).toBeDefined();
      expect(POOL_CONSTANTS.BOW_ID).toBeDefined();
      expect(POOL_CONSTANTS.BOW_SYSTEM_ID).toBeDefined();

      expect(typeof POOL_CONSTANTS.MSP_ID).toBe('string');
      expect(typeof POOL_CONSTANTS.BOW_ID).toBe('string');
      expect(typeof POOL_CONSTANTS.BOW_SYSTEM_ID).toBe('string');
    });

    test('should have required base URL', () => {
      expect(POOL_CONSTANTS.HAYWARD_BASE_URL).toBeDefined();
      expect(typeof POOL_CONSTANTS.HAYWARD_BASE_URL).toBe('string');
      expect(POOL_CONSTANTS.HAYWARD_BASE_URL).toContain('https://');
    });

    test('should have required endpoints', () => {
      expect(POOL_CONSTANTS.ENDPOINTS).toBeDefined();
      expect(POOL_CONSTANTS.ENDPOINTS.LOGIN).toBeDefined();
      expect(POOL_CONSTANTS.ENDPOINTS.DASHBOARD).toBeDefined();
      expect(POOL_CONSTANTS.ENDPOINTS.FILTER_SETTINGS).toBeDefined();
      expect(POOL_CONSTANTS.ENDPOINTS.HEATER_SETTINGS).toBeDefined();
      expect(POOL_CONSTANTS.ENDPOINTS.CHLORINATOR_SETTINGS).toBeDefined();
      expect(POOL_CONSTANTS.ENDPOINTS.LIGHTS_SETTINGS).toBeDefined();
      expect(POOL_CONSTANTS.ENDPOINTS.SCHEDULES).toBeDefined();

      expect(typeof POOL_CONSTANTS.ENDPOINTS.LOGIN).toBe('string');
      expect(typeof POOL_CONSTANTS.ENDPOINTS.DASHBOARD).toBe('string');
    });

    test('should have required units', () => {
      expect(POOL_CONSTANTS.UNITS).toBeDefined();
      expect(POOL_CONSTANTS.UNITS.TEMPERATURE).toBeDefined();
      expect(POOL_CONSTANTS.UNITS.SALT).toBeDefined();

      expect(typeof POOL_CONSTANTS.UNITS.TEMPERATURE).toBe('string');
      expect(typeof POOL_CONSTANTS.UNITS.SALT).toBe('string');
    });

    test('should have required defaults', () => {
      expect(POOL_CONSTANTS.DEFAULTS).toBeDefined();
      expect(POOL_CONSTANTS.DEFAULTS.SYSTEM_STATUS).toBeDefined();

      expect(typeof POOL_CONSTANTS.DEFAULTS.SYSTEM_STATUS).toBe('string');
    });

    test('should have valid system IDs', () => {
      expect(POOL_CONSTANTS.MSP_ID).toMatch(/^[A-F0-9]{16}$/);
      expect(POOL_CONSTANTS.BOW_ID).toMatch(/^[A-F0-9]{16}$/);
      expect(POOL_CONSTANTS.BOW_SYSTEM_ID).toMatch(/^[A-F0-9]{16}$/);
    });

    test('should have valid endpoints', () => {
      expect(POOL_CONSTANTS.ENDPOINTS.LOGIN).toMatch(/^\/.*\.aspx$/);
      expect(POOL_CONSTANTS.ENDPOINTS.DASHBOARD).toMatch(/^\/.*\.aspx$/);
      expect(POOL_CONSTANTS.ENDPOINTS.FILTER_SETTINGS).toMatch(/^\/.*\.aspx$/);
    });

    test('should have valid units', () => {
      expect(POOL_CONSTANTS.UNITS.TEMPERATURE).toBe('°F');
      expect(POOL_CONSTANTS.UNITS.SALT).toBe('PPM');
    });

    test('should have valid default status', () => {
      expect(POOL_CONSTANTS.DEFAULTS.SYSTEM_STATUS).toBe('online');
    });
  });

  describe('Constants Structure', () => {
    test('should be immutable', () => {
      const originalMspId = POOL_CONSTANTS.MSP_ID;

      // Attempt to modify (should not affect the original)
      POOL_CONSTANTS.MSP_ID = 'MODIFIED_ID';

      expect(POOL_CONSTANTS.MSP_ID).toBe(originalMspId);
    });

    test('should have consistent structure', () => {
      const expectedStructure = {
        MSP_ID: expect.any(String),
        BOW_ID: expect.any(String),
        BOW_SYSTEM_ID: expect.any(String),
        HAYWARD_BASE_URL: expect.any(String),
        ENDPOINTS: {
          LOGIN: expect.any(String),
          DASHBOARD: expect.any(String),
          FILTER_SETTINGS: expect.any(String),
          HEATER_SETTINGS: expect.any(String),
          CHLORINATOR_SETTINGS: expect.any(String),
          LIGHTS_SETTINGS: expect.any(String),
          SCHEDULES: expect.any(String)
        },
        UNITS: {
          TEMPERATURE: expect.any(String),
          SALT: expect.any(String)
        },
        DEFAULTS: {
          SYSTEM_STATUS: expect.any(String)
        }
      };

      expect(POOL_CONSTANTS).toMatchObject(expectedStructure);
    });
  });

  describe('Helper Functions', () => {
    test('should build system URL correctly', () => {
      const endpoint = '/test/endpoint.aspx';
      const url = buildSystemUrl(endpoint);

      expect(url).toContain(endpoint);
      expect(url).toContain(`mspID=${POOL_CONSTANTS.MSP_ID}`);
      expect(url).toContain(`bowID=${POOL_CONSTANTS.BOW_ID}`);
      expect(url).toContain(`bowSystemID=${POOL_CONSTANTS.BOW_SYSTEM_ID}`);
    });

    test('should build dashboard URL correctly', () => {
      const url = buildDashboardUrl();

      expect(url).toContain(POOL_CONSTANTS.ENDPOINTS.DASHBOARD);
      expect(url).toContain(`mspID=${POOL_CONSTANTS.MSP_ID}`);
      expect(url).not.toContain('bowID=');
      expect(url).not.toContain('bowSystemID=');
    });

    test('should handle empty endpoint in buildSystemUrl', () => {
      const url = buildSystemUrl('');

      expect(url).toContain('mspID=');
      expect(url).toContain('bowID=');
      expect(url).toContain('bowSystemID=');
    });
  });
});
