const axios = require('axios');

/**
 * Weather service for fetching air temperature data using free NWS API
 */
class WeatherService {
  constructor() {
    this.zipCode = '32708';
    // NWS coordinates for zip code 32708 (Oviedo, FL)
    this.latitude = 28.6697;
    this.longitude = -81.2081;
  }

  /**
   * Get the NWS grid coordinates for a location
   * @returns {Promise<object|null>} Grid coordinates or null if failed
   */
  async getGridCoordinates() {
    try {
      const url = `https://api.weather.gov/geocoding/addresses?address=${this.zipCode}`;
      console.log(`🌤️ Getting grid coordinates for zip code ${this.zipCode}...`);
      
      const response = await axios.get(url);
      
      if (response.data && response.data.features && response.data.features.length > 0) {
        const coordinates = response.data.features[0].geometry.coordinates;
        return {
          longitude: coordinates[0],
          latitude: coordinates[1]
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting grid coordinates:', error.message);
      return null;
    }
  }

  /**
   * Get the NWS office and grid information
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<object|null>} Office and grid info or null if failed
   */
  async getOfficeAndGrid(latitude, longitude) {
    try {
      const url = `https://api.weather.gov/points/${latitude},${longitude}`;
      const response = await axios.get(url);
      
      if (response.data && response.data.properties) {
        return {
          office: response.data.properties.cwa,
          gridX: response.data.properties.gridX,
          gridY: response.data.properties.gridY
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting office and grid:', error.message);
      return null;
    }
  }

  /**
   * Fetch current weather data for the configured zip code
   * @returns {Promise<object|null>} Weather data or null if failed
   */
  async getCurrentWeather() {
    try {
      // Get grid coordinates
      let coords = await this.getGridCoordinates();
      if (!coords) {
        console.warn('❌ Could not get grid coordinates, using default coordinates');
        coords = { latitude: this.latitude, longitude: this.longitude };
      }

      // Get office and grid information
      const gridInfo = await this.getOfficeAndGrid(coords.latitude, coords.longitude);
      if (!gridInfo) {
        console.error('❌ Could not get office and grid information');
        return null;
      }

      // Get current weather forecast
      const forecastUrl = `https://api.weather.gov/gridpoints/${gridInfo.office}/${gridInfo.gridX},${gridInfo.gridY}/forecast`;
      console.log(`🌤️ Fetching weather data for ${gridInfo.office} grid ${gridInfo.gridX},${gridInfo.gridY}...`);
      
      const response = await axios.get(forecastUrl);
      
      if (response.data && response.data.properties && response.data.properties.periods) {
        const currentPeriod = response.data.properties.periods[0];
        
        // Extract temperature (NWS provides both Fahrenheit and Celsius)
        const temperature = currentPeriod.temperature;
        const unit = currentPeriod.temperatureUnit;
        
        const weatherData = {
          temperature: temperature,
          unit: unit,
          description: currentPeriod.shortForecast || 'Unknown',
          detailedForecast: currentPeriod.detailedForecast || '',
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Weather data fetched: ${weatherData.temperature}°${weatherData.unit} (${weatherData.description})`);
        return weatherData;
      } else {
        console.error('❌ Invalid weather data response:', response.data);
        return null;
      }
    } catch (error) {
      console.error('❌ Weather API error:', error.message);
      return null;
    }
  }

  /**
   * Get air temperature only
   * @returns {Promise<number|null>} Temperature in Fahrenheit or null if failed
   */
  async getAirTemperature() {
    const weather = await this.getCurrentWeather();
    return weather ? weather.temperature : null;
  }
}

// Create singleton instance
const weatherService = new WeatherService();

module.exports = weatherService; 