/**
 * Pool Data Entity
 * Defines the structure and validation for pool data
 */

class PoolData {
  constructor(data = {}) {
    this.timestamp = data.timestamp || new Date().toISOString();
    this.system = data.system || {};
    this.dashboard = data.dashboard || {};
    this.filter = data.filter || {};
    this.heater = data.heater || {};
    this.chlorinator = data.chlorinator || {};
    this.lights = data.lights || {};
    this.schedules = data.schedules || [];
    this.weather = data.weather || {};
  }

  // Validation methods
  isValid() {
    return this.timestamp && this.hasValidTimestamp();
  }

  hasValidTimestamp() {
    const timestamp = new Date(this.timestamp);
    return !isNaN(timestamp.getTime());
  }

  // Data extraction helpers
  getTemperatureData() {
    return {
      water: this.dashboard?.temperature?.actual || null,
      air: this.dashboard?.airTemperature || null,
      target: this.dashboard?.temperature?.target || null,
      unit: this.dashboard?.temperature?.unit || '°F'
    };
  }

  getSaltData() {
    return {
      instant: this.chlorinator?.salt?.instant || null,
      average: this.chlorinator?.salt?.average || null,
      unit: this.chlorinator?.salt?.unit || 'PPM'
    };
  }

  getPumpStatus() {
    return this.filter?.status || null;
  }

  getCellData() {
    return {
      temperature: this.chlorinator?.cell?.temperature?.value || null,
      voltage: this.chlorinator?.cell?.voltage || null,
      current: this.chlorinator?.cell?.current || null,
      type: this.chlorinator?.cell?.type || null
    };
  }

  // Convert to time series point format
  toTimeSeriesPoint() {
    const temp = this.getTemperatureData();
    const salt = this.getSaltData();
    const cell = this.getCellData();

    return {
      timestamp: this.timestamp,
      waterTemp: temp.water,
      airTemp: temp.air,
      saltInstant: salt.instant,
      cellTemp: cell.temperature,
      cellVoltage: cell.voltage,
      pumpStatus: this.getPumpStatus(),
      weatherTemp: this.weather?.temperature || null,
      weatherHumidity: this.weather?.humidity || null
    };
  }

  // Create from legacy format
  static fromLegacyFormat(legacyData) {
    return new PoolData(legacyData);
  }

  // Create from time series point
  static fromTimeSeriesPoint(timeSeriesPoint) {
    return new PoolData({
      timestamp: timeSeriesPoint.timestamp,
      dashboard: {
        temperature: {
          actual: timeSeriesPoint.waterTemp,
          unit: '°F'
        },
        airTemperature: timeSeriesPoint.airTemp
      },
      filter: {
        status: timeSeriesPoint.pumpStatus
      },
      chlorinator: {
        salt: {
          instant: timeSeriesPoint.saltInstant,
          unit: 'PPM'
        },
        cell: {
          temperature: {
            value: timeSeriesPoint.cellTemp,
            unit: '°F'
          },
          voltage: timeSeriesPoint.cellVoltage
        }
      },
      weather: {
        temperature: timeSeriesPoint.weatherTemp,
        humidity: timeSeriesPoint.weatherHumidity
      }
    });
  }

  // Serialize for JSON
  toJSON() {
    return {
      timestamp: this.timestamp,
      system: this.system,
      dashboard: this.dashboard,
      filter: this.filter,
      heater: this.heater,
      chlorinator: this.chlorinator,
      lights: this.lights,
      schedules: this.schedules,
      weather: this.weather
    };
  }
}

module.exports = { PoolData };
