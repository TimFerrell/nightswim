const axios = require('axios');
const { influxDBService } = require('./influxDBService');

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
    
    // Configuration
    this.zipCode = process.env.POOL_ZIP_CODE || '90210';
    this.state = this.getStateFromZip(this.zipCode);
    this.coordinates = null; // Will be set during initialization
    this.initialized = false;
  }

  /**
   * Initialize the service with proper coordinates
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log(`🌍 Initializing weather alert service for ZIP code: ${this.zipCode}`);
      this.coordinates = await this.getCoordinatesFromZip(this.zipCode);
      this.initialized = true;
      console.log(`✅ Weather alert service initialized for: ${this.coordinates.displayName}`);
    } catch (error) {
      console.error('❌ Failed to initialize weather alert service:', error);
      // Use fallback coordinates
      this.coordinates = this.getFallbackCoordinates(this.zipCode);
      this.initialized = true;
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
  isLocationInAlertArea(alert, coordinates) {
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
   * Get state from zip code (simplified mapping)
   * @param {string} zipCode - ZIP code
   * @returns {string} State abbreviation
   */
  getStateFromZip(zipCode) {
    // Simplified ZIP to state mapping
    // In production, you'd want a more comprehensive mapping
    const zipToState = {
      '90210': 'CA',
      '90211': 'CA',
      '90212': 'CA',
      '10001': 'NY',
      '10002': 'NY',
      '33101': 'FL',
      '33102': 'FL',
      '77001': 'TX',
      '77002': 'TX',
      '60601': 'IL',
      '60602': 'IL'
    };
    
    return zipToState[zipCode] || 'CA'; // Default to CA
  }

  /**
   * Get coordinates from zip code using geocoding service
   * @param {string} zipCode - ZIP code
   * @returns {Promise<object>} Coordinates object
   */
  async getCoordinatesFromZip(zipCode) {
    try {
      // Use a free geocoding service (Nominatim/OpenStreetMap)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1`,
        {
          headers: {
            'User-Agent': this.userAgent
          },
          timeout: 5000
        }
      );

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        console.log(`📍 Geocoded ${zipCode} to: ${location.lat}, ${location.lon} (${location.display_name})`);
        return {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon),
          displayName: location.display_name
        };
      } else {
        console.warn(`⚠️ Could not geocode ZIP code ${zipCode}, using fallback`);
        return this.getFallbackCoordinates(zipCode);
      }
    } catch (error) {
      console.error(`❌ Geocoding failed for ${zipCode}:`, error.message);
      return this.getFallbackCoordinates(zipCode);
    }
  }

  /**
   * Get fallback coordinates for a ZIP code (simplified mapping)
   * @param {string} zipCode - ZIP code
   * @returns {object} Coordinates object
   */
  getFallbackCoordinates(zipCode) {
    // Extended fallback mapping for common ZIP codes
    const zipToCoords = {
      // California
      '90210': { lat: 34.1030, lng: -118.4105, displayName: 'Beverly Hills, CA' },
      '90211': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90212': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90213': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90214': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90215': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90216': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90217': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90218': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90219': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90220': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90221': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90222': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90223': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90224': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90225': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90226': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90227': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90228': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90229': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90230': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90231': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90232': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90233': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90234': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90235': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90236': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90237': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90238': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90239': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90240': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90241': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90242': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90243': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90244': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90245': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90246': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90247': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90248': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90249': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90250': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90251': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90252': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90253': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90254': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90255': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90256': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90257': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90258': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90259': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90260': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90261': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90262': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90263': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90264': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90265': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90266': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90267': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90268': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90269': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90270': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90271': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90272': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90273': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90274': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90275': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90276': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90277': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90278': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90279': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90280': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90281': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90282': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90283': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90284': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90285': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90286': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90287': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90288': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90289': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90290': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90291': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90292': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90293': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90294': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90295': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90296': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90297': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90298': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      '90299': { lat: 34.0667, lng: -118.3833, displayName: 'Los Angeles, CA' },
      // New York
      '10001': { lat: 40.7505, lng: -73.9934, displayName: 'New York, NY' },
      '10002': { lat: 40.7168, lng: -73.9861, displayName: 'New York, NY' },
      // Florida
      '33101': { lat: 25.7617, lng: -80.1918, displayName: 'Miami, FL' },
      '33102': { lat: 25.7617, lng: -80.1918, displayName: 'Miami, FL' },
      // Texas
      '77001': { lat: 29.7604, lng: -95.3698, displayName: 'Houston, TX' },
      '77002': { lat: 29.7604, lng: -95.3698, displayName: 'Houston, TX' },
      // Illinois
      '60601': { lat: 41.8781, lng: -87.6298, displayName: 'Chicago, IL' },
      '60602': { lat: 41.8781, lng: -87.6298, displayName: 'Chicago, IL' }
    };
    
    return zipToCoords[zipCode] || { 
      lat: 34.1030, 
      lng: -118.4105, 
      displayName: 'Beverly Hills, CA (fallback)' 
    };
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
        activeAlerts: activeAlerts,
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
}

module.exports = WeatherAlertService; 