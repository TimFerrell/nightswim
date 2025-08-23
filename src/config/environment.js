/**
 * Environment Configuration Management
 * Centralized environment variable handling with validation
 */

const requiredEnvVars = [
  'INFLUXDB_URL',
  'INFLUXDB_TOKEN',
  'INFLUXDB_ORG',
  'INFLUXDB_BUCKET'
];

const optionalEnvVars = {
  NODE_ENV: 'development',
  PORT: '3000',
  SESSION_SECRET: 'default-secret-change-me',
  WEATHER_API_KEY: null,
  POOL_USERNAME: null,
  POOL_PASSWORD: null,
  LOG_LEVEL: 'info'
};

class EnvironmentConfig {
  constructor() {
    this.config = {};
    this.validate();
    this.load();
  }

  validate() {
    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  load() {
    // Load required variables
    requiredEnvVars.forEach(varName => {
      this.config[varName] = process.env[varName];
    });

    // Load optional variables with defaults
    Object.entries(optionalEnvVars).forEach(([varName, defaultValue]) => {
      this.config[varName] = process.env[varName] || defaultValue;
    });

    // Special handling for boolean and numeric values
    this.config.PORT = parseInt(this.config.PORT, 10);
    this.config.IS_PRODUCTION = this.config.NODE_ENV === 'production';
    this.config.IS_DEVELOPMENT = this.config.NODE_ENV === 'development';
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return { ...this.config };
  }

  // Database configuration
  getInfluxDBConfig() {
    return {
      url: this.get('INFLUXDB_URL'),
      token: this.get('INFLUXDB_TOKEN'),
      org: this.get('INFLUXDB_ORG'),
      bucket: this.get('INFLUXDB_BUCKET')
    };
  }

  // Pool credentials
  getPoolCredentials() {
    return {
      username: this.get('POOL_USERNAME'),
      password: this.get('POOL_PASSWORD')
    };
  }

  // Weather API configuration
  getWeatherConfig() {
    return {
      apiKey: this.get('WEATHER_API_KEY')
    };
  }
}

// Singleton instance
const envConfig = new EnvironmentConfig();

module.exports = {
  EnvironmentConfig,
  envConfig
};