/**
 * Status Cards Component
 * Handles updating and managing status card displays
 */

const { domCache } = require('../utils/dom-cache');
const { batchDOMUpdates } = require('../utils/performance');

class StatusCards {
  constructor() {
    this.severityClasses = {
      'normal': 'status-normal',
      'warning': 'status-warning',
      'critical': 'status-critical',
      'unknown': 'status-unknown'
    };
  }

  /**
   * Update all status cards with new data
   */
  updateAll(poolData) {
    if (!poolData) return;

    const updates = [];

    // Salt status card
    if (poolData.chlorinator?.salt) {
      updates.push(() => this.updateSaltCard(poolData.chlorinator.salt));
    }

    // Water temperature card
    if (poolData.dashboard?.temperature) {
      updates.push(() => this.updateWaterTempCard(poolData.dashboard.temperature));
    }

    // Cell voltage card
    if (poolData.chlorinator?.cell) {
      updates.push(() => this.updateCellVoltageCard(poolData.chlorinator.cell));
    }

    // Filter pump card
    if (poolData.filter) {
      updates.push(() => this.updateFilterPumpCard(poolData.filter));
    }

    // Weather card
    if (poolData.weather) {
      updates.push(() => this.updateWeatherCard(poolData.weather));
    }

    // Batch all DOM updates for better performance
    batchDOMUpdates(updates);
  }

  /**
   * Update salt level status card
   */
  updateSaltCard(saltData) {
    const saltValue = domCache.get('saltValue');
    const saltCard = domCache.get('saltCard');

    if (!saltValue || !saltCard) return;

    const level = saltData.instant;
    if (level !== null && level !== undefined) {
      saltValue.textContent = `${level} ${saltData.unit}`;
      
      const severity = this.getSaltSeverity(level);
      this.updateCardSeverity(saltCard, severity);
    } else {
      saltValue.textContent = '--';
      this.updateCardSeverity(saltCard, 'unknown');
    }
  }

  /**
   * Update water temperature status card
   */
  updateWaterTempCard(tempData) {
    const waterTempValue = domCache.get('waterTempValue');
    const waterTempComfort = domCache.get('waterTempComfort');
    const waterTempCard = domCache.get('waterTempCard');

    if (!waterTempValue || !waterTempCard) return;

    const actual = tempData.actual;
    const target = tempData.target;

    if (actual !== null && actual !== undefined) {
      waterTempValue.textContent = `${actual}${tempData.unit}`;
      
      if (waterTempComfort) {
        waterTempComfort.textContent = this.getTemperatureComfort(actual, target);
      }
      
      const severity = this.getTemperatureSeverity(actual, target);
      this.updateCardSeverity(waterTempCard, severity);
    } else {
      waterTempValue.textContent = '--';
      if (waterTempComfort) {
        waterTempComfort.textContent = 'Unknown';
      }
      this.updateCardSeverity(waterTempCard, 'unknown');
    }
  }

  /**
   * Update cell voltage status card
   */
  updateCellVoltageCard(cellData) {
    const cellVoltageValue = domCache.get('cellVoltageValue');
    const cellVoltageStatus = domCache.get('cellVoltageStatus');
    const cellVoltageCard = domCache.get('cellVoltageCard');

    if (!cellVoltageValue || !cellVoltageCard) return;

    const voltage = cellData.voltage;
    if (voltage !== null && voltage !== undefined) {
      cellVoltageValue.textContent = `${voltage}V`;
      
      if (cellVoltageStatus) {
        cellVoltageStatus.textContent = this.getCellVoltageStatus(voltage);
      }
      
      const severity = this.getCellVoltageSeverity(voltage);
      this.updateCardSeverity(cellVoltageCard, severity);
    } else {
      cellVoltageValue.textContent = '--';
      if (cellVoltageStatus) {
        cellVoltageStatus.textContent = 'Unknown';
      }
      this.updateCardSeverity(cellVoltageCard, 'unknown');
    }
  }

  /**
   * Update filter pump status card
   */
  updateFilterPumpCard(filterData) {
    const filterPumpValue = domCache.get('filterPumpValue');
    const filterPumpState = domCache.get('filterPumpState');
    const filterPumpCard = domCache.get('filterPumpCard');

    if (!filterPumpValue || !filterPumpCard) return;

    const status = filterData.status;
    if (status !== null && status !== undefined) {
      const isOn = status === true;
      filterPumpValue.textContent = isOn ? 'ON' : 'OFF';
      
      if (filterPumpState) {
        filterPumpState.textContent = isOn ? 'Running' : 'Stopped';
      }
      
      const severity = isOn ? 'normal' : 'warning';
      this.updateCardSeverity(filterPumpCard, severity);
    } else {
      filterPumpValue.textContent = '--';
      if (filterPumpState) {
        filterPumpState.textContent = 'Unknown';
      }
      this.updateCardSeverity(filterPumpCard, 'unknown');
    }
  }

  /**
   * Update weather status card
   */
  updateWeatherCard(weatherData) {
    const weatherTempValue = domCache.get('weatherTempValue');
    const weatherCard = domCache.get('weatherCard');

    if (!weatherTempValue || !weatherCard) return;

    const temperature = weatherData.temperature;
    if (temperature !== null && temperature !== undefined) {
      weatherTempValue.textContent = `${temperature}°F`;
      this.updateCardSeverity(weatherCard, 'normal');
    } else {
      weatherTempValue.textContent = '--';
      this.updateCardSeverity(weatherCard, 'unknown');
    }
  }

  /**
   * Update card severity styling
   */
  updateCardSeverity(cardElement, severity) {
    if (!cardElement) return;
    
    // Remove all existing severity classes
    Object.values(this.severityClasses).forEach(className => {
      cardElement.classList.remove(className);
    });
    
    // Add new severity class
    const severityClass = this.severityClasses[severity] || this.severityClasses.unknown;
    cardElement.classList.add(severityClass);
  }

  // Severity calculation methods
  getSaltSeverity(level) {
    if (level < 2500) return 'critical';
    if (level < 2800) return 'warning';
    if (level > 4000) return 'warning';
    if (level > 4500) return 'critical';
    return 'normal';
  }

  getTemperatureSeverity(actual, target) {
    if (!target) return 'normal';
    
    const diff = Math.abs(actual - target);
    if (diff > 10) return 'warning';
    if (diff > 15) return 'critical';
    return 'normal';
  }

  getCellVoltageSeverity(voltage) {
    if (voltage < 15) return 'critical';
    if (voltage < 18) return 'warning';
    if (voltage > 30) return 'warning';
    if (voltage > 35) return 'critical';
    return 'normal';
  }

  // Status text helpers
  getTemperatureComfort(actual, target) {
    if (!target) return 'Unknown';
    
    const diff = actual - target;
    if (diff > 5) return 'Too Hot';
    if (diff < -5) return 'Too Cold';
    if (diff > 2) return 'Warm';
    if (diff < -2) return 'Cool';
    return 'Perfect';
  }

  getCellVoltageStatus(voltage) {
    if (voltage < 15) return 'Too Low';
    if (voltage < 18) return 'Low';
    if (voltage > 30) return 'High';
    if (voltage > 35) return 'Too High';
    return 'Normal';
  }
}

// Export singleton instance
const statusCards = new StatusCards();

module.exports = { StatusCards, statusCards };