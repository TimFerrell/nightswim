const {
  parseDashboardData,
  parseFilterData,
  parseHeaterData,
  parseChlorinatorData,
  parseLightsData,
  parseSchedulesData,
  createPoolDataStructure
} = require('../src/services/poolDataParser');

// Sample HTML data for testing
const sampleDashboardHTML = `
<html>
  <body>
    <span id="lblTempTarget">75°F</span>
    <span id="lblTempActual">85°F</span>
  </body>
</html>
`;

const sampleFilterHTML = `
<html>
  <body>
    <div id="divfilterStatus">ON</div>
    <div id="divPump">Filter Pump Running</div>
  </body>
</html>
`;

const sampleHeaterHTML = `
<html>
  <body>
    <span id="lblMinTargetTemp">55°F</span>
    <span id="lblTemp">82°F</span>
    <span id="lblMaxTargetTemp">95°F</span>
    <span id="lblActualTemp">82°F</span>
    <input type="radio" name="heater_on" checked>
  </body>
</html>
`;

const sampleChlorinatorHTML = `
<html>
  <body>
    <div class="boxchlppm">salt level
                            2897
                            ppm</div>
    <span id="lbCellTemp">85.6°F</span>
    <span id="lbCellVoltage">23.01</span>
    <span id="lbCellCurrent">4.89</span>
    <span id="lbCellType">T-15</span>
    <input type="radio" name="chlorinator_on" checked>
  </body>
</html>
`;

const sampleSchedulesHTML = `
<html>
  <body>
    <table>
      <tr>
        <th>Equipment</th>
        <th>Start Time</th>
        <th>End Time</th>
        <th>Setting</th>
        <th>Repeat</th>
        <th>Status</th>
      </tr>
      <tr>
        <td>Filter Pump</td>
        <td>8:00 AM</td>
        <td>6:00 PM</td>
        <td>High</td>
        <td>Daily</td>
        <td>Enabled</td>
      </tr>
    </table>
  </body>
</html>
`;

describe('Pool Data Parser', () => {
  describe('parseDashboardData', () => {
    test('should parse dashboard temperature data correctly', () => {
      const result = parseDashboardData(sampleDashboardHTML);

      expect(result).toHaveProperty('temperature');
      expect(result.temperature).toHaveProperty('target', 75);
      expect(result.temperature).toHaveProperty('actual', 85);
      expect(result.temperature).toHaveProperty('unit', '°F');
    });

    test('should include system status', () => {
      const result = parseDashboardData(sampleDashboardHTML);

      expect(result).toHaveProperty('systemStatus', 'online');
    });

    test('should handle missing temperature data', () => {
      const emptyHTML = '<html><body></body></html>';
      const result = parseDashboardData(emptyHTML);

      expect(result.temperature.target).toBeNull();
      expect(result.temperature.actual).toBeNull();
    });

    test('should handle decimal temperature values', () => {
      const htmlWithDecimals = `
        <html>
          <body>
            <span id="lblTempTarget">75.5°F</span>
            <span id="lblTempActual">85.2°F</span>
          </body>
        </html>
      `;
      const result = parseDashboardData(htmlWithDecimals);

      expect(result.temperature.target).toBe(75.5);
      expect(result.temperature.actual).toBe(85.2);
    });
  });

  describe('parseFilterData', () => {
    test('should parse filter status correctly when ON', () => {
      const result = parseFilterData(sampleFilterHTML);

      expect(result).toHaveProperty('status', true);
      expect(result).toHaveProperty('diagnostic', 'Filter Pump Running');
    });

    test('should parse filter status correctly when OFF', () => {
      const offHTML = `
        <html>
          <body>
            <div id="divfilterStatus">OFF</div>
            <div id="divPump">Filter Pump Stopped</div>
          </body>
        </html>
      `;
      const result = parseFilterData(offHTML);

      expect(result.status).toBe(false);
    });

    test('should handle missing filter data', () => {
      const emptyHTML = '<html><body></body></html>';
      const result = parseFilterData(emptyHTML);

      expect(result.status).toBeNull();
      expect(result.diagnostic).toBeNull();
    });
  });

  describe('parseHeaterData', () => {
    test('should parse heater temperature data correctly', () => {
      const result = parseHeaterData(sampleHeaterHTML);

      expect(result).toHaveProperty('temperature');
      expect(result.temperature).toHaveProperty('min', 55);
      expect(result.temperature).toHaveProperty('current', 82);
      expect(result.temperature).toHaveProperty('max', 95);
      expect(result.temperature).toHaveProperty('actual', 82);
      expect(result.temperature).toHaveProperty('unit', '°F');
    });

    test('should parse heater status and enabled state', () => {
      const result = parseHeaterData(sampleHeaterHTML);

      expect(result).toHaveProperty('status', 'heater_on');
      expect(result).toHaveProperty('enabled', true);
    });

    test('should handle heater when disabled', () => {
      const disabledHTML = `
        <html>
          <body>
            <span id="lblMinTargetTemp">55°F</span>
            <span id="lblTemp">82°F</span>
            <span id="lblMaxTargetTemp">95°F</span>
            <span id="lblActualTemp">82°F</span>
          </body>
        </html>
      `;
      const result = parseHeaterData(disabledHTML);

      expect(result.enabled).toBe(false);
    });
  });

  describe('parseChlorinatorData', () => {
    test('should parse salt level data correctly', () => {
      const result = parseChlorinatorData(sampleChlorinatorHTML);

      expect(result).toHaveProperty('salt');
      expect(result.salt).toHaveProperty('instant', 2897);
      expect(result.salt).toHaveProperty('unit', 'PPM');
    });

    test('should parse cell data correctly', () => {
      const result = parseChlorinatorData(sampleChlorinatorHTML);

      expect(result).toHaveProperty('cell');
      expect(result.cell.temperature).toHaveProperty('value', 85.6);
      expect(result.cell.temperature).toHaveProperty('unit', '°F');
      expect(result.cell).toHaveProperty('voltage', 23.01);
      expect(result.cell).toHaveProperty('current', 4.89);
      expect(result.cell).toHaveProperty('type', 'T-15');
    });

    test('should parse chlorinator status and enabled state', () => {
      const result = parseChlorinatorData(sampleChlorinatorHTML);

      expect(result).toHaveProperty('status', 'chlorinator_on');
      expect(result).toHaveProperty('enabled', true);
    });

    test('should handle missing salt data', () => {
      const noSaltHTML = `
        <html>
          <body>
            <span id="lbCellTemp">85.6°F</span>
            <span id="lbCellVoltage">23.01</span>
            <span id="lbCellCurrent">4.89</span>
            <span id="lbCellType">T-15</span>
          </body>
        </html>
      `;
      const result = parseChlorinatorData(noSaltHTML);

      expect(result.salt.instant).toBeNull();
    });
  });

  describe('parseLightsData', () => {
    test('should parse lights data correctly', () => {
      const lightsHTML = `
        <html>
          <body>
            <div id="status">ON</div>
            <div id="brightness">75%</div>
            <input type="checkbox" checked>
          </body>
        </html>
      `;
      const result = parseLightsData(lightsHTML);

      expect(result).toHaveProperty('status', 'ON');
      expect(result).toHaveProperty('brightness', '75%');
      expect(result).toHaveProperty('enabled', true);
    });

    test('should handle disabled lights', () => {
      const disabledHTML = `
        <html>
          <body>
            <div id="status">OFF</div>
            <div id="brightness">0%</div>
          </body>
        </html>
      `;
      const result = parseLightsData(disabledHTML);

      expect(result.enabled).toBe(false);
    });
  });

  describe('parseSchedulesData', () => {
    test('should parse schedule data correctly', () => {
      const result = parseSchedulesData(sampleSchedulesHTML);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);

      const schedule = result[0];
      expect(schedule).toHaveProperty('name', 'Filter Pump');
      expect(schedule).toHaveProperty('startTime', '8:00 AM');
      expect(schedule).toHaveProperty('endTime', '6:00 PM');
      expect(schedule).toHaveProperty('setting', 'High');
      expect(schedule).toHaveProperty('repeat', 'Daily');
      expect(schedule).toHaveProperty('status', 'Enabled');
    });

    test('should handle empty schedule table', () => {
      const emptyHTML = `
        <html>
          <body>
            <table>
              <tr>
                <th>Equipment</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </table>
          </body>
        </html>
      `;
      const result = parseSchedulesData(emptyHTML);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test('should ignore non-schedule tables', () => {
      const nonScheduleHTML = `
        <html>
          <body>
            <table>
              <tr>
                <th>Other Data</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Test</td>
                <td>Value</td>
              </tr>
            </table>
          </body>
        </html>
      `;
      const result = parseSchedulesData(nonScheduleHTML);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('createPoolDataStructure', () => {
    test('should create complete pool data structure', () => {
      const sampleData = {
        dashboard: { temperature: { target: 75, actual: 85 } },
        filter: { status: true },
        heater: { temperature: { min: 55, max: 95 } },
        chlorinator: { salt: { instant: 2897 } },
        schedules: [{ name: 'Filter Pump', startTime: '8:00 AM' }]
      };

      const result = createPoolDataStructure(sampleData);

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('system');
      expect(result.system).toHaveProperty('mspId');
      expect(result.system).toHaveProperty('bowId');
      expect(result.system).toHaveProperty('bowSystemId');
      expect(result).toHaveProperty('dashboard', sampleData.dashboard);
      expect(result).toHaveProperty('filter', sampleData.filter);
      expect(result).toHaveProperty('heater', sampleData.heater);
      expect(result).toHaveProperty('chlorinator', sampleData.chlorinator);
      expect(result).toHaveProperty('lights');
      expect(result).toHaveProperty('schedules', sampleData.schedules);
    });

    test('should handle empty data object', () => {
      const result = createPoolDataStructure({});

      expect(result).toHaveProperty('dashboard', {});
      expect(result).toHaveProperty('filter', {});
      expect(result).toHaveProperty('heater', {});
      expect(result).toHaveProperty('chlorinator', {});
      expect(result).toHaveProperty('lights', {});
      expect(result).toHaveProperty('schedules', []);
    });

    test('should include valid timestamp', () => {
      const result = createPoolDataStructure({});

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
