const axios = require('axios');
const { influxDBService } = require('./influxDBService');
const geocodingService = require('./geocodingService');

/**
 * Weather Alert Service
 * Integrates with National Weather Service API to fetch and store weather alerts
 * as range annotations in InfluxDB
 */
class WeatherAlertService {
  constructor() {
    this.baseUrl = 'https://api.weather.gov';
    this.userAgent = 'NightSwim Pool Monitor (https://github.com/timothyferrell/nightswim, contact@example.com)';
    this.influxDB = influxDBService;

    // Configuration - unified with other services
    this.zipCode = process.env.POOL_ZIP_CODE || '32708';
    this.state = null; // Will be derived from coordinates
    this.coordinates = null; // Will be set during initialization
    this.initialized = false;
  }

  /**
   * Initialize the service with proper coordinates
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    if (this.initialized && this.coordinates) {
      return true;
    }

    try {
      console.log(`🌍 Initializing weather alert service for ZIP code: ${this.zipCode}`);
      this.coordinates = await geocodingService.getCoordinatesFromZip(this.zipCode);
      
      if (!geocodingService.validateCoordinates(this.coordinates)) {
        throw new Error('Invalid coordinates received from geocoding service');
      }

      // Derive state from coordinates or ZIP code
      this.state = await this.getStateFromCoordinates(this.coordinates) || this.getStateFromZip(this.zipCode);
      
      this.initialized = true;
      console.log(`✅ Weather alert service initialized for: ${this.coordinates.displayName} (State: ${this.state})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize weather alert service:', error.message);
      // Use fallback coordinates
      this.coordinates = geocodingService.getFallbackCoordinates(this.zipCode);
      this.state = this.getStateFromZip(this.zipCode);
      this.initialized = true;
      return false;
    }
  }

  /**
   * Get weather alerts for the configured location
   * @returns {Promise<Array>} Array of weather alerts
   */
  async getWeatherAlerts() {
    // Ensure service is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`🌤️ Fetching weather alerts for ${this.state}...`);

      // Get active alerts for the state
      const alertsResponse = await axios.get(
        `${this.baseUrl}/alerts/active?area=${this.state}`,
        {
          headers: {
            'User-Agent': this.userAgent
          },
          timeout: 10000
        }
      );

      const alerts = alertsResponse.data.features || [];
      console.log(`📡 Found ${alerts.length} active weather alerts`);

      // Filter alerts that affect our specific location
      const relevantAlerts = this.filterAlertsForLocation(alerts);
      console.log(`📍 ${relevantAlerts.length} alerts relevant to pool location`);

      return relevantAlerts;
    } catch (error) {
      console.error('❌ Error fetching weather alerts:', error.message);
      return [];
    }
  }

  /**
   * Filter alerts to only those affecting the pool location
   * @param {Array} alerts - Array of weather alerts
   * @returns {Array} Filtered alerts
   */
  filterAlertsForLocation(alerts) {
    return alerts.filter(alert => {
      // Check if the alert affects our location
      return this.isLocationInAlertArea(alert, this.coordinates);
    });
  }

  /**
   * Check if a location is within an alert's affected area
   * @param {object} alert - Weather alert object
   * @param {object} coordinates - Location coordinates
   * @returns {boolean} True if location is affected
   */
  isLocationInAlertArea(alert, _coordinates) {
    try {
      // If alert has geometry, check if our coordinates are within it
      if (alert.geometry && alert.geometry.coordinates) {
        // This is a simplified check - in production you'd want a proper
        // point-in-polygon algorithm for complex geometries
        return true; // For now, assume all alerts in the state affect us
      }

      // If no geometry, check if it's a state-wide alert
      return true;
    } catch (error) {
      console.warn('Error checking alert geometry:', error);
      return true; // Default to including the alert
    }
  }

  /**
   * Store weather alerts as range annotations in InfluxDB
   * @param {Array} alerts - Array of weather alerts
   * @returns {Promise<number>} Number of alerts stored
   */
  async storeWeatherAlerts(alerts) {
    let storedCount = 0;

    for (const alert of alerts) {
      try {
        const alertData = this.parseAlertData(alert);

        // Check if we already have this alert stored
        const existingAlerts = await this.influxDB.queryWeatherAlerts(
          new Date(alertData.startTime),
          new Date(alertData.endTime)
        );

        const alreadyStored = existingAlerts.some(existing =>
          existing.id === alertData.id
        );

        if (!alreadyStored) {
          const success = await this.influxDB.storeWeatherAlert(alertData);
          if (success) {
            storedCount++;
            console.log(`✅ Stored weather alert: ${alertData.event}`);
          }
        } else {
          console.log(`⏭️ Alert already stored: ${alertData.event}`);
        }
      } catch (error) {
        console.error(`❌ Error storing alert ${alert.id}:`, error);
      }
    }

    return storedCount;
  }

  /**
   * Parse NWS alert data into our format
   * @param {object} alert - Raw NWS alert
   * @returns {object} Parsed alert data
   */
  parseAlertData(alert) {
    const properties = alert.properties;

    return {
      id: alert.id,
      event: properties.event || 'Unknown Event',
      severity: properties.severity || 'Unknown',
      urgency: properties.urgency || 'Unknown',
      certainty: properties.certainty || 'Unknown',
      description: properties.description || '',
      instruction: properties.instruction || '',
      startTime: properties.effective || new Date().toISOString(),
      endTime: properties.expires || new Date(Date.now() + 3600000).toISOString(), // Default 1 hour
      geometry: alert.geometry || {}
    };
  }

  /**
   * Check for new weather alerts and store them
   * @returns {Promise<object>} Result of the check
   */
  async checkAndStoreAlerts() {
    try {
      console.log('🌤️ Checking for new weather alerts...');

      const alerts = await this.getWeatherAlerts();
      const storedCount = await this.storeWeatherAlerts(alerts);

      const result = {
        checked: true,
        totalAlerts: alerts.length,
        newAlertsStored: storedCount,
        timestamp: new Date().toISOString()
      };

      console.log(`📊 Weather alert check complete: ${storedCount} new alerts stored`);
      return result;
    } catch (error) {
      console.error('❌ Error in weather alert check:', error);
      return {
        checked: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get currently active weather alerts
   * @returns {Promise<Array>} Active alerts
   */
  async getActiveAlerts() {
    return await this.influxDB.getActiveWeatherAlerts();
  }

  /**
   * Check if there are any active weather alerts
   * @returns {Promise<boolean>} True if there are active alerts
   */
  async hasActiveAlerts() {
    return await this.influxDB.hasActiveWeatherAlerts();
  }

  /**
   * Get weather alert statistics
   * @param {number} hours - Number of hours to look back
   * @returns {Promise<object>} Alert statistics
   */
  async getAlertStats(hours = 24) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

    return await this.influxDB.getWeatherAlertStats(startTime, endTime);
  }

  /**
   * Get state from coordinates using reverse geocoding
   * @param {object} coordinates - Coordinates object
   * @returns {Promise<string|null>} State abbreviation or null
   */
  async getStateFromCoordinates(coordinates) {
    try {
      // Use Nominatim reverse geocoding to get state
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${coordinates.lat}&lon=${coordinates.lng}&format=json`,
        {
          headers: { 'User-Agent': this.userAgent },
          timeout: 3000
        }
      );

      if (response.data && response.data.address && response.data.address.state) {
        // Convert state name to abbreviation
        const stateName = response.data.address.state;
        return this.getStateAbbreviation(stateName);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get state from coordinates:', error.message);
      return null;
    }
  }

  /**
   * Convert state name to abbreviation
   * @param {string} stateName - Full state name
   * @returns {string} State abbreviation
   */
  getStateAbbreviation(stateName) {
    const stateMap = {
      'Florida': 'FL',
      'California': 'CA',
      'Texas': 'TX',
      'New York': 'NY',
      'Arizona': 'AZ',
      'Nevada': 'NV',
      'Illinois': 'IL',
      'Georgia': 'GA',
      'North Carolina': 'NC',
      'South Carolina': 'SC'
    };
    return stateMap[stateName] || stateName.substring(0, 2).toUpperCase();
  }

  /**
   * Get state from zip code (fallback mapping)
   * @param {string} zipCode - ZIP code
   * @returns {string} State abbreviation
   */
  getStateFromZip(zipCode) {
    // Enhanced ZIP to state mapping
    const firstThree = zipCode.substring(0, 3);
    
    // ZIP code ranges by state
    if (firstThree >= '327' && firstThree <= '347') return 'FL'; // Florida
    if (firstThree >= '900' && firstThree <= '966') return 'CA'; // California  
    if (firstThree >= '770' && firstThree <= '799') return 'TX'; // Texas
    if (firstThree >= '100' && firstThree <= '149') return 'NY'; // New York
    if (firstThree >= '850' && firstThree <= '865') return 'AZ'; // Arizona
    if (firstThree >= '890' && firstThree <= '898') return 'NV'; // Nevada
    if (firstThree >= '600' && firstThree <= '629') return 'IL'; // Illinois
    
    // Specific ZIP code mappings for edge cases
    const zipToState = {
      '32708': 'FL', // Winter Springs, FL
      '90210': 'CA', // Beverly Hills, CA
      '33101': 'FL', // Miami Beach, FL
      '10001': 'NY', // New York, NY
      '77001': 'TX', // Houston, TX
      '85001': 'AZ', // Phoenix, AZ
      '89101': 'NV', // Las Vegas, NV
      '60601': 'IL'  // Chicago, IL
    };

    return zipToState[zipCode] || 'FL'; // Default to FL for pool locations
  }



  /**
   * Get weather alert information for dashboard display
   * @returns {Promise<object>} Dashboard-ready alert information
   */
  async getDashboardAlerts() {
    try {
      const activeAlerts = await this.getActiveAlerts();
      const hasAlerts = activeAlerts.length > 0;

      return {
        hasActiveAlerts: hasAlerts,
        activeAlerts,
        alertCount: activeAlerts.length,
        mostSevereAlert: hasAlerts ? this.getMostSevereAlert(activeAlerts) : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting dashboard alerts:', error);
      return {
        hasActiveAlerts: false,
        activeAlerts: [],
        alertCount: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get the most severe alert from a list of alerts
   * @param {Array} alerts - Array of alerts
   * @returns {object} Most severe alert
   */
  getMostSevereAlert(alerts) {
    const severityOrder = ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'];

    return alerts.reduce((mostSevere, current) => {
      const currentIndex = severityOrder.indexOf(current.severity);
      const mostSevereIndex = severityOrder.indexOf(mostSevere.severity);

      return currentIndex < mostSevereIndex ? current : mostSevere;
    });
  }

  /**
   * Get current ZIP code
   * @returns {string} Current ZIP code
   */
  getZipCode() {
    return this.zipCode;
  }

  /**
   * Update ZIP code and reinitialize
   * @param {string} newZipCode - New ZIP code
   * @returns {Promise<boolean>} True if update successful
   */
  async updateZipCode(newZipCode) {
    if (newZipCode === this.zipCode) {
      return true;
    }

    console.log(`🔄 Updating weather alert service ZIP code from ${this.zipCode} to ${newZipCode}`);
    this.zipCode = newZipCode;
    this.initialized = false;
    this.coordinates = null;
    this.state = null;
    
    return await this.initialize();
  }

  /**
   * Get current coordinates
   * @returns {object|null} Current coordinates or null if not initialized
   */
  getCoordinates() {
    return this.coordinates;
  }

  /**
   * Get current state
   * @returns {string|null} Current state abbreviation
   */
  getState() {
    return this.state;
  }
}

module.exports = WeatherAlertService;
