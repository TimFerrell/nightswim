/**
 * Environment Configuration Management
 * Centralized environment variable handling with validation
 */

// Session secret is required in production for security
const requiredEnvVars = process.env.NODE_ENV === 'production' ? [
  'SESSION_SECRET'
] : [
  // No required vars for development
];

const optionalEnvVars = {
  NODE_ENV: 'development',
  PORT: '3000',
  SESSION_SECRET: 'default-secret-change-me',
  WEATHER_API_KEY: null,
  POOL_USERNAME: null,
  POOL_PASSWORD: null,
  LOG_LEVEL: 'info',
  // InfluxDB configuration (optional)
  INFLUXDB_URL: null,
  INFLUX_DB_TOKEN: null,
  INFLUXDB_ORG: null,
  INFLUXDB_BUCKET: 'pool-data'
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

    // Additional validation for session secret security
    this.validateSessionSecret();
  }

  validateSessionSecret() {
    const sessionSecret = process.env.SESSION_SECRET || optionalEnvVars.SESSION_SECRET;

    // In production, session secret must be provided and secure
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.SESSION_SECRET) {
        throw new Error('SESSION_SECRET environment variable is required in production');
      }

      if (sessionSecret.length < 32) {
        throw new Error('SESSION_SECRET must be at least 32 characters long for security');
      }

      if (sessionSecret === 'default-secret-change-me') {
        throw new Error('SESSION_SECRET cannot use the default value in production');
      }
    }

    // In development, warn if using default secret
    if (process.env.NODE_ENV !== 'production' && sessionSecret === 'default-secret-change-me') {
      console.warn('⚠️  WARNING: Using default SESSION_SECRET in development. Set SESSION_SECRET environment variable for production.');
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
      token: this.get('INFLUX_DB_TOKEN'),
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
