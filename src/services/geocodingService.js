const axios = require('axios');

/**
 * Centralized Geocoding Service
 * Handles ZIP code to lat/long conversion with caching and fallbacks
 * Used by weather and alert services for consistent location resolution
 */
class GeocodingService {
  constructor() {
    this.userAgent = 'NightSwim Pool Monitor (https://github.com/timothyferrell/nightswim, contact@example.com)';
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Get coordinates from ZIP code with caching
   * @param {string} zipCode - ZIP code to geocode
   * @returns {Promise<object>} Coordinates object with lat, lng, displayName
   */
  async getCoordinatesFromZip(zipCode) {
    // Check cache first
    const cacheKey = `zip_${zipCode}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log(`📍 Using cached coordinates for ${zipCode}: ${cached.data.lat}, ${cached.data.lng}`);
      return cached.data;
    }

    try {
      console.log(`🌍 Geocoding ZIP code: ${zipCode}`);
      
      // Try multiple geocoding services for reliability
      let coordinates = await this.tryNominatim(zipCode);
      
      if (!coordinates) {
        coordinates = await this.tryUSCensus(zipCode);
      }
      
      if (!coordinates) {
        console.warn(`⚠️ Geocoding failed for ${zipCode}, using fallback coordinates`);
        coordinates = this.getFallbackCoordinates(zipCode);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: coordinates,
        timestamp: Date.now()
      });

      console.log(`📍 Geocoded ${zipCode} to: ${coordinates.lat}, ${coordinates.lng} (${coordinates.displayName})`);
      return coordinates;

    } catch (error) {
      console.error(`❌ Geocoding error for ${zipCode}:`, error.message);
      return this.getFallbackCoordinates(zipCode);
    }
  }

  /**
   * Try OpenStreetMap Nominatim geocoding service
   * @param {string} zipCode - ZIP code
   * @returns {Promise<object|null>} Coordinates or null if failed
   */
  async tryNominatim(zipCode) {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1`,
        {
          headers: { 'User-Agent': this.userAgent },
          timeout: 5000
        }
      );

      if (response.data && response.data.length > 0) {
        const location = response.data[0];
        return {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lon),
          displayName: location.display_name,
          source: 'Nominatim'
        };
      }
      return null;
    } catch (error) {
      console.warn('Nominatim geocoding failed:', error.message);
      return null;
    }
  }

  /**
   * Try US Census Bureau geocoding service as backup
   * @param {string} zipCode - ZIP code
   * @returns {Promise<object|null>} Coordinates or null if failed
   */
  async tryUSCensus(zipCode) {
    try {
      const response = await axios.get(
        `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${zipCode}&benchmark=2020&format=json`,
        {
          timeout: 5000
        }
      );

      if (response.data?.result?.addressMatches && response.data.result.addressMatches.length > 0) {
        const match = response.data.result.addressMatches[0];
        const coords = match.coordinates;
        
        return {
          lat: parseFloat(coords.y),
          lng: parseFloat(coords.x),
          displayName: match.matchedAddress,
          source: 'US Census'
        };
      }
      return null;
    } catch (error) {
      console.warn('US Census geocoding failed:', error.message);
      return null;
    }
  }

  /**
   * Get fallback coordinates for common ZIP codes
   * @param {string} zipCode - ZIP code
   * @returns {object} Coordinates object
   */
  getFallbackCoordinates(zipCode) {
    const zipToCoords = {
      // Florida ZIP codes (common pool locations)
      '32708': { lat: 28.6884611, lng: -81.2741674, displayName: 'Winter Springs, FL' },
      '32789': { lat: 28.6613889, lng: -81.3142222, displayName: 'Winter Springs, FL' },
      '32792': { lat: 28.5383333, lng: -81.3783333, displayName: 'Winter Park, FL' },
      '32801': { lat: 28.5383056, lng: -81.3792222, displayName: 'Orlando, FL' },
      '33101': { lat: 25.7617, lng: -80.1918, displayName: 'Miami Beach, FL' },
      '33139': { lat: 25.7825, lng: -80.1325, displayName: 'Miami Beach, FL' },
      '33143': { lat: 25.7097, lng: -80.3164, displayName: 'Miami, FL' },
      
      // California ZIP codes
      '90210': { lat: 34.0942400, lng: -118.4114162, displayName: 'Beverly Hills, CA' },
      '90211': { lat: 34.0636111, lng: -118.3994444, displayName: 'Beverly Hills, CA' },
      '90401': { lat: 34.0194444, lng: -118.4911111, displayName: 'Santa Monica, CA' },
      '92651': { lat: 33.6775, lng: -117.7650, displayName: 'Laguna Beach, CA' },
      '92660': { lat: 33.6058333, lng: -117.7291667, displayName: 'Newport Beach, CA' },
      
      // Texas ZIP codes
      '77001': { lat: 29.7604, lng: -95.3698, displayName: 'Houston, TX' },
      '78701': { lat: 30.2672, lng: -97.7431, displayName: 'Austin, TX' },
      '75201': { lat: 32.7767, lng: -96.7970, displayName: 'Dallas, TX' },
      
      // Arizona ZIP codes
      '85001': { lat: 33.4484, lng: -112.0740, displayName: 'Phoenix, AZ' },
      '85250': { lat: 33.4147222, lng: -111.9755556, displayName: 'Scottsdale, AZ' },
      
      // Nevada ZIP codes
      '89101': { lat: 36.1699, lng: -115.1398, displayName: 'Las Vegas, NV' },
      
      // New York ZIP codes
      '10001': { lat: 40.7505, lng: -73.9934, displayName: 'New York, NY' },
      '11701': { lat: 40.8176, lng: -73.2454, displayName: 'Amityville, NY' }
    };

    return zipToCoords[zipCode] || {
      lat: 28.6884611,
      lng: -81.2741674,
      displayName: 'Winter Springs, FL (default fallback)',
      source: 'Fallback'
    };
  }

  /**
   * Validate coordinates
   * @param {object} coords - Coordinates object
   * @returns {boolean} True if valid coordinates
   */
  validateCoordinates(coords) {
    return coords &&
           typeof coords.lat === 'number' &&
           typeof coords.lng === 'number' &&
           coords.lat >= -90 && coords.lat <= 90 &&
           coords.lng >= -180 && coords.lng <= 180;
  }

  /**
   * Get distance between two coordinate points (in miles)
   * @param {object} coord1 - First coordinate {lat, lng}
   * @param {object} coord2 - Second coordinate {lat, lng}
   * @returns {number} Distance in miles
   */
  getDistance(coord1, coord2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Clear the geocoding cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Geocoding cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
const geocodingService = new GeocodingService();
module.exports = geocodingService;