const influxDBService = require('./influxDBService');

/**
 * @typedef {object} PumpState
 * @property {boolean} isOn - Current pump state
 * @property {string} lastChangeTime - ISO timestamp of last state change
 * @property {string} lastChangeType - 'on' or 'off'
 */

class PumpStateTracker {
  constructor() {
    this.currentState = null;
    this.lastChangeTime = null;
    this.lastChangeType = null;
  }

  /**
   * Check for pump state changes and generate annotations
   * @param {boolean} newPumpStatus - Current pump status from Hayward
   * @param {string} timestamp - ISO timestamp of the data collection
   * @returns {Promise<boolean>} True if state changed and annotation was created
   */
  async checkStateChange(newPumpStatus, timestamp) {
    // Skip if this is the first time (no previous state to compare)
    if (this.currentState === null) {
      this.currentState = newPumpStatus;
      this.lastChangeTime = timestamp;
      console.log(`🔧 Initial pump state: ${newPumpStatus ? 'ON' : 'OFF'}`);
      return false;
    }

    // Check if state has changed
    if (this.currentState !== newPumpStatus) {
      const changeType = newPumpStatus ? 'on' : 'off';
      const previousState = this.currentState ? 'ON' : 'OFF';
      const newState = newPumpStatus ? 'ON' : 'OFF';
      
      console.log(`🔄 Pump state change detected: ${previousState} → ${newState}`);
      
      // Update tracking state
      this.currentState = newPumpStatus;
      this.lastChangeTime = timestamp;
      this.lastChangeType = changeType;

      // Generate annotation
      await this.createPumpStateAnnotation(changeType, timestamp);
      
      return true;
    }

    return false;
  }

  /**
   * Create an annotation for pump state change
   * @param {string} changeType - 'on' or 'off'
   * @param {string} timestamp - ISO timestamp
   * @returns {Promise<boolean>} Success status
   */
  async createPumpStateAnnotation(changeType, timestamp) {
    const annotation = {
      timestamp: timestamp,
      title: `Filter Pump ${changeType.toUpperCase()}`,
      description: `Filter pump automatically turned ${changeType}`,
      category: 'pump_state_change',
      metadata: {
        changeType: changeType,
        source: 'automatic_detection',
        component: 'filter_pump'
      }
    };

    try {
      console.log(`📝 Creating pump state annotation: ${annotation.title}`);
      const success = await influxDBService.storeAnnotation(annotation);
      
      if (success) {
        console.log(`✅ Pump state annotation created successfully`);
      } else {
        console.error(`❌ Failed to create pump state annotation`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Error creating pump state annotation:`, error);
      return false;
    }
  }

  /**
   * Get current pump state information
   * @returns {PumpState} Current pump state
   */
  getCurrentState() {
    return {
      isOn: this.currentState,
      lastChangeTime: this.lastChangeTime,
      lastChangeType: this.lastChangeType
    };
  }

  /**
   * Reset the tracker (useful for testing)
   */
  reset() {
    this.currentState = null;
    this.lastChangeTime = null;
    this.lastChangeType = null;
    console.log('🔄 Pump state tracker reset');
  }
}

// Create singleton instance
const pumpStateTracker = new PumpStateTracker();

module.exports = pumpStateTracker; 