const axios = require('axios');

/**
 * Weather service for fetching real-time air temperature data using OpenMeteo API
 * OpenMeteo provides current conditions updated every 10-15 minutes
 */
class WeatherService {
  constructor() {
    this.zipCode = '32708';
    // Coordinates for zip code 32708 (Oviedo, FL)
    this.latitude = 28.6697;
    this.longitude = -81.2081;
  }

  /**
   * Get real-time current weather conditions using OpenMeteo API
   * @returns {Promise<object|null>} Weather data or null if failed
   */
  async getCurrentWeather() {
    try {
      // OpenMeteo API for current conditions (free, no API key required)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${this.latitude}&longitude=${this.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature&temperature_unit=fahrenheit&timezone=auto`;
      
      console.log(`🌤️ Fetching real-time weather data for coordinates ${this.latitude},${this.longitude}...`);
      
      const response = await axios.get(url, {
        timeout: 10000 // 10 second timeout
      });
      
      if (response.data && response.data.current) {
        const current = response.data.current;
        
        const weatherData = {
          temperature: Math.round(current.temperature_2m),
          unit: '°F',
          humidity: current.relative_humidity_2m,
          apparentTemperature: Math.round(current.apparent_temperature),
          description: this.getWeatherDescription(current.temperature_2m),
          timestamp: new Date().toISOString(),
          source: 'OpenMeteo'
        };
        
        console.log(`✅ Real-time weather data fetched: ${weatherData.temperature}°F (feels like ${weatherData.apparentTemperature}°F, ${weatherData.humidity}% humidity)`);
        return weatherData;
      } else {
        console.error('❌ Invalid weather data response:', response.data);
        return null;
      }
    } catch (error) {
      console.error('❌ Weather API error:', error.message);
      
      // Fallback to NWS if OpenMeteo fails
      console.log('🔄 Falling back to NWS API...');
      return await this.getNWSWeather();
    }
  }

  /**
   * Fallback to NWS API (less frequent updates but reliable)
   * @returns {Promise<object|null>} Weather data or null if failed
   */
  async getNWSWeather() {
    try {
      // Get office and grid information
      const gridInfo = await this.getOfficeAndGrid(this.latitude, this.longitude);
      if (!gridInfo) {
        console.error('❌ Could not get office and grid information');
        return null;
      }

      // Get current weather forecast
      const forecastUrl = `https://api.weather.gov/gridpoints/${gridInfo.office}/${gridInfo.gridX},${gridInfo.gridY}/forecast`;
      console.log(`🌤️ Fetching NWS weather data for ${gridInfo.office} grid ${gridInfo.gridX},${gridInfo.gridY}...`);
      
      const response = await axios.get(forecastUrl, {
        timeout: 10000
      });
      
      if (response.data && response.data.properties && response.data.properties.periods) {
        const currentPeriod = response.data.properties.periods[0];
        
        const weatherData = {
          temperature: currentPeriod.temperature,
          unit: currentPeriod.temperatureUnit,
          description: currentPeriod.shortForecast || 'Unknown',
          detailedForecast: currentPeriod.detailedForecast || '',
          timestamp: new Date().toISOString(),
          source: 'NWS'
        };
        
        console.log(`✅ NWS weather data fetched: ${weatherData.temperature}°${weatherData.unit} (${weatherData.description})`);
        return weatherData;
      } else {
        console.error('❌ Invalid NWS weather data response:', response.data);
        return null;
      }
    } catch (error) {
      console.error('❌ NWS API error:', error.message);
      return null;
    }
  }

  /**
   * Get the NWS office and grid information (for fallback)
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<object|null>} Office and grid info or null if failed
   */
  async getOfficeAndGrid(latitude, longitude) {
    try {
      const url = `https://api.weather.gov/points/${latitude},${longitude}`;
      const response = await axios.get(url, {
        timeout: 10000
      });
      
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
   * Get weather description based on temperature
   * @param {number} temperature - Temperature in Fahrenheit
   * @returns {string} Weather description
   */
  getWeatherDescription(temperature) {
    if (temperature >= 90) return 'Hot';
    if (temperature >= 80) return 'Warm';
    if (temperature >= 70) return 'Mild';
    if (temperature >= 60) return 'Cool';
    if (temperature >= 50) return 'Chilly';
    if (temperature >= 40) return 'Cold';
    if (temperature >= 30) return 'Very Cold';
    return 'Freezing';
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