const axios = require('axios');

/**
 * Weather service for fetching real-time air temperature data using OpenMeteo API
 * OpenMeteo provides current conditions updated every 10-15 minutes
 */
class WeatherService {
  constructor() {
    this.zipCode = '32708';
    // Coordinates for zip code 32708 (Winter Springs, FL)
    this.latitude = 28.6884611;
    this.longitude = -81.2741674;
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

  /**
   * Get historical weather data including rain, temperature, and heat index
   * @param {number} days - Number of days of historical data (default: 7)
   * @returns {Promise<object|null>} Historical weather data or null if failed
   */
  async getHistoricalWeather(days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // OpenMeteo Historical Weather API
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${this.latitude}&longitude=${this.longitude}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&hourly=temperature_2m,relative_humidity_2m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto`;
      
      console.log(`📊 Fetching ${days} days of historical weather data...`);
      
      const response = await axios.get(url, {
        timeout: 15000 // 15 second timeout for historical data
      });
      
      if (response.data && response.data.hourly && response.data.daily) {
        const hourly = response.data.hourly;
        const daily = response.data.daily;
        
        // Process hourly data for time series
        const timeSeriesData = [];
        for (let i = 0; i < hourly.time.length; i++) {
          const temp = hourly.temperature_2m[i];
          const humidity = hourly.relative_humidity_2m[i];
          const precipitation = hourly.precipitation[i] || 0;
          
          // Calculate heat index if temperature and humidity are available
          let heatIndex = null;
          if (temp !== null && humidity !== null && temp >= 80) {
            heatIndex = this.calculateHeatIndex(temp, humidity);
          }
          
          timeSeriesData.push({
            timestamp: hourly.time[i],
            temperature: temp,
            humidity: humidity,
            precipitation: precipitation,
            heatIndex: heatIndex
          });
        }
        
        // Calculate daily summaries
        const dailySummaries = [];
        for (let i = 0; i < daily.time.length; i++) {
          dailySummaries.push({
            date: daily.time[i],
            maxTemp: daily.temperature_2m_max[i],
            minTemp: daily.temperature_2m_min[i],
            totalPrecipitation: daily.precipitation_sum[i] || 0
          });
        }
        
        // Calculate aggregated metrics
        const totalRain24h = this.calculateRain24h(timeSeriesData);
        const maxHeatIndex7d = this.calculateMaxHeatIndex(timeSeriesData);
        const extremeWeatherEvents = this.identifyExtremeWeatherEvents(dailySummaries);
        
        const historicalData = {
          timeSeriesData,
          dailySummaries,
          metrics: {
            totalRain24h,
            maxHeatIndex7d,
            extremeWeatherEvents,
            dataRange: `${days} days`,
            lastUpdated: new Date().toISOString()
          },
          source: 'OpenMeteo Historical'
        };
        
        console.log(`✅ Historical weather data fetched: ${totalRain24h}" rain (24h), ${maxHeatIndex7d}°F max heat index`);
        return historicalData;
      } else {
        console.error('❌ Invalid historical weather data response:', response.data);
        return null;
      }
    } catch (error) {
      console.error('❌ Historical weather API error:', error.message);
      return null;
    }
  }

  /**
   * Calculate heat index using the National Weather Service regression formula
   * @param {number} temperature - Temperature in Fahrenheit
   * @param {number} humidity - Relative humidity percentage
   * @returns {number} Heat index in Fahrenheit
   */
  calculateHeatIndex(temperature, humidity) {
    const T = temperature;
    const H = humidity;
    
    // Only calculate heat index for temps 80°F and above with humidity > 40%
    if (T < 80 || H < 40) {
      return Math.round(T);
    }
    
    // National Weather Service Heat Index Regression Formula
    // This is a 9-term polynomial that models how temperature and humidity combine
    // to create the perceived temperature (what it "feels like" to humans)
    
    const heatIndex = 
      -42.379 +                           // Base constant
      (2.04901523 * T) +                  // Linear temperature term
      (10.14333127 * H) +                 // Linear humidity term
      (-0.22475541 * T * H) +             // Temperature-humidity interaction (cooling effect)
      (-0.00683783 * T * T) +             // Quadratic temperature term (diminishing returns)
      (-0.05481717 * H * H) +             // Quadratic humidity term (diminishing returns)
      (0.00122874 * T * T * H) +          // High temp amplifies humidity effect
      (0.00085282 * T * H * H) +          // High humidity amplifies temperature effect
      (-0.00000199 * T * T * H * H);      // Correction for extreme conditions
    
    // The formula can sometimes give values lower than actual temperature at low humidity
    // Heat index should never be less than the actual temperature
    return Math.round(Math.max(heatIndex, T));
  }

  /**
   * Calculate total rain in the last 24 hours
   * @param {Array} timeSeriesData - Array of hourly weather data
   * @returns {number} Total precipitation in inches
   */
  calculateRain24h(timeSeriesData) {
    const last24Hours = timeSeriesData.slice(-24);
    return Math.round(last24Hours.reduce((total, data) => total + (data.precipitation || 0), 0) * 100) / 100;
  }

  /**
   * Calculate maximum heat index in the data period
   * @param {Array} timeSeriesData - Array of hourly weather data
   * @returns {number} Maximum heat index in Fahrenheit
   */
  calculateMaxHeatIndex(timeSeriesData) {
    const heatIndices = timeSeriesData.filter(data => data.heatIndex !== null).map(data => data.heatIndex);
    return heatIndices.length > 0 ? Math.max(...heatIndices) : 0;
  }

  /**
   * Identify extreme weather events from daily summaries
   * @param {Array} dailySummaries - Array of daily weather summaries
   * @returns {Array} Array of extreme weather events
   */
  identifyExtremeWeatherEvents(dailySummaries) {
    const events = [];
    
    dailySummaries.forEach(day => {
      // Extreme heat (>95°F)
      if (day.maxTemp > 95) {
        events.push({
          date: day.date,
          type: 'extreme_heat',
          severity: day.maxTemp > 105 ? 'severe' : 'moderate',
          value: day.maxTemp,
          description: `Extreme heat: ${day.maxTemp}°F`
        });
      }
      
      // Heavy rain (>1 inch)
      if (day.totalPrecipitation > 1) {
        events.push({
          date: day.date,
          type: 'heavy_rain',
          severity: day.totalPrecipitation > 3 ? 'severe' : 'moderate',
          value: day.totalPrecipitation,
          description: `Heavy rain: ${day.totalPrecipitation}" precipitation`
        });
      }
      
      // Extreme cold (<32°F)
      if (day.minTemp < 32) {
        events.push({
          date: day.date,
          type: 'extreme_cold',
          severity: day.minTemp < 20 ? 'severe' : 'moderate',
          value: day.minTemp,
          description: `Extreme cold: ${day.minTemp}°F`
        });
      }
    });
    
    return events;
  }
}

// Create singleton instance
const weatherService = new WeatherService();

module.exports = weatherService; 