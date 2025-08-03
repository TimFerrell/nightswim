const { POOL_CONSTANTS, buildSystemUrl, buildDashboardUrl } = require('../src/utils/constants');

describe('Constants Module', () => {
  describe('POOL_CONSTANTS', () => {
    test('should have required system identifiers', () => {
      expect(POOL_CONSTANTS).toHaveProperty('MSP_ID');
      expect(POOL_CONSTANTS).toHaveProperty('BOW_ID');
      expect(POOL_CONSTANTS).toHaveProperty('BOW_SYSTEM_ID');

      expect(typeof POOL_CONSTANTS.MSP_ID).toBe('string');
      expect(typeof POOL_CONSTANTS.BOW_ID).toBe('string');
      expect(typeof POOL_CONSTANTS.BOW_SYSTEM_ID).toBe('string');
    });

    test('should have base URL', () => {
      expect(POOL_CONSTANTS).toHaveProperty('HAYWARD_BASE_URL');
      expect(POOL_CONSTANTS.HAYWARD_BASE_URL).toBe('https://haywardomnilogic.com');
    });

    test('should have endpoints object', () => {
      expect(POOL_CONSTANTS).toHaveProperty('ENDPOINTS');
      expect(typeof POOL_CONSTANTS.ENDPOINTS).toBe('object');
    });

    test('should have required endpoints', () => {
      const requiredEndpoints = [
        'LOGIN',
        'DASHBOARD',
        'FILTER_SETTINGS',
        'HEATER_SETTINGS',
        'CHLORINATOR_SETTINGS',
        'LIGHTS_SETTINGS',
        'SCHEDULES'
      ];

      requiredEndpoints.forEach(endpoint => {
        expect(POOL_CONSTANTS.ENDPOINTS).toHaveProperty(endpoint);
        expect(typeof POOL_CONSTANTS.ENDPOINTS[endpoint]).toBe('string');
      });
    });

    test('should have units object', () => {
      expect(POOL_CONSTANTS).toHaveProperty('UNITS');
      expect(POOL_CONSTANTS.UNITS).toHaveProperty('TEMPERATURE', '°F');
      expect(POOL_CONSTANTS.UNITS).toHaveProperty('SALT', 'PPM');
    });

    test('should have defaults object', () => {
      expect(POOL_CONSTANTS).toHaveProperty('DEFAULTS');
      expect(POOL_CONSTANTS.DEFAULTS).toHaveProperty('SYSTEM_STATUS', 'online');
    });
  });

  describe('buildSystemUrl', () => {
    test('should build URL with all system parameters', () => {
      const endpoint = '/test/endpoint';
      const result = buildSystemUrl(endpoint);

      expect(result).toContain(endpoint);
      expect(result).toContain(`mspID=${POOL_CONSTANTS.MSP_ID}`);
      expect(result).toContain(`bowID=${POOL_CONSTANTS.BOW_ID}`);
      expect(result).toContain(`bowSystemID=${POOL_CONSTANTS.BOW_SYSTEM_ID}`);
    });

    test('should work with different endpoints', () => {
      const endpoints = [
        '/Module/UserManagement/Dashboard.aspx',
        '/Module/UserManagement/Filter_Setting.aspx',
        '/Module/UserManagement/Heater_Setting.aspx'
      ];

      endpoints.forEach(endpoint => {
        const result = buildSystemUrl(endpoint);
        expect(result).toContain(endpoint);
        expect(result).toContain('?mspID=');
        expect(result).toContain('&bowID=');
        expect(result).toContain('&bowSystemID=');
      });
    });

    test('should handle empty endpoint', () => {
      const result = buildSystemUrl('');
      expect(result).toContain('?mspID=');
      expect(result).toContain('&bowID=');
      expect(result).toContain('&bowSystemID=');
    });
  });

  describe('buildDashboardUrl', () => {
    test('should build dashboard URL with MSP_ID only', () => {
      const result = buildDashboardUrl();

      expect(result).toContain(POOL_CONSTANTS.ENDPOINTS.DASHBOARD);
      expect(result).toContain(`mspID=${POOL_CONSTANTS.MSP_ID}`);
      expect(result).not.toContain('bowID=');
      expect(result).not.toContain('bowSystemID=');
    });

    test('should match expected dashboard URL format', () => {
      const result = buildDashboardUrl();
      const expected = `${POOL_CONSTANTS.ENDPOINTS.DASHBOARD}?mspID=${POOL_CONSTANTS.MSP_ID}`;

      expect(result).toBe(expected);
    });
  });

  describe('URL consistency', () => {
    test('should use consistent MSP_ID across all functions', () => {
      const systemUrl = buildSystemUrl('/test');
      const dashboardUrl = buildDashboardUrl();

      const systemMspId = systemUrl.match(/mspID=([^&]+)/)[1];
      const dashboardMspId = dashboardUrl.match(/mspID=([^&]+)/)[1];

      expect(systemMspId).toBe(dashboardMspId);
      expect(systemMspId).toBe(POOL_CONSTANTS.MSP_ID);
    });

    test('should use consistent BOW_ID in system URLs', () => {
      const systemUrl = buildSystemUrl('/test');
      const bowId = systemUrl.match(/bowID=([^&]+)/)[1];

      expect(bowId).toBe(POOL_CONSTANTS.BOW_ID);
    });

    test('should use consistent BOW_SYSTEM_ID in system URLs', () => {
      const systemUrl = buildSystemUrl('/test');
      const bowSystemId = systemUrl.match(/bowSystemID=([^&]+)/)[1];

      expect(bowSystemId).toBe(POOL_CONSTANTS.BOW_SYSTEM_ID);
    });
  });
});
