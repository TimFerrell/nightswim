/**
 * @typedef {object} Credentials
 * @property {string} username - Hayward OmniLogic username/email
 * @property {string} password - Hayward OmniLogic password
 */

/**
 * Pool login credentials
 * Sources from environment variables with local development fallback
 * @type {Credentials}
 */
const credentials = {
  username: process.env.HAYWARD_USERNAME,
  password: process.env.HAYWARD_PASSWORD
};

// Validate that credentials are provided (only when actually needed)
const validateCredentialsProvided = () => {
  if (!credentials.username || !credentials.password) {
    throw new Error(
      'Missing Hayward OmniLogic credentials. ' +
      'Please set HAYWARD_USERNAME and HAYWARD_PASSWORD environment variables. ' +
      'For local development, you can create a .env file or export the variables directly.'
    );
  }
};

// Helper functions for credential management
const getCredentials = () => {
  // Try multiple possible environment variable names for Vercel compatibility
  const username = process.env.HAYWARD_USERNAME || 
                   process.env.HAYWARD_EMAIL || 
                   process.env.POOL_USERNAME || 
                   process.env.POOL_EMAIL;
  
  const password = process.env.HAYWARD_PASSWORD || 
                   process.env.POOL_PASSWORD;
  
  console.log('🔐 Credential loading debug:');
  console.log('   HAYWARD_USERNAME:', process.env.HAYWARD_USERNAME ? '[SET]' : '[NOT SET]');
  console.log('   HAYWARD_EMAIL:', process.env.HAYWARD_EMAIL ? '[SET]' : '[NOT SET]');
  console.log('   POOL_USERNAME:', process.env.POOL_USERNAME ? '[SET]' : '[NOT SET]');
  console.log('   POOL_EMAIL:', process.env.POOL_EMAIL ? '[SET]' : '[NOT SET]');
  console.log('   HAYWARD_PASSWORD:', process.env.HAYWARD_PASSWORD ? '[SET]' : '[NOT SET]');
  console.log('   POOL_PASSWORD:', process.env.POOL_PASSWORD ? '[SET]' : '[NOT SET]');
  console.log('   Final username:', username ? '[SET]' : '[NOT SET]');
  console.log('   Final password:', password ? '[SET]' : '[NOT SET]');
  
  return { username, password };
};

const validateCredentials = (creds) => {
  if (!creds || typeof creds !== 'object') return false;
  if (!creds.username || !creds.password) return false;
  if (typeof creds.username !== 'string' || typeof creds.password !== 'string') return false;
  if (creds.username.trim() === '' || creds.password.trim() === '') return false;
  return true;
};

const getAndValidateCredentials = () => {
  const creds = getCredentials();
  return validateCredentials(creds) ? creds : null;
};

// Secure logging function that never exposes credentials
const logCredentialStatus = (includeDetails = false) => {
  const creds = getCredentials();
  const isValid = validateCredentials(creds);
  
  if (includeDetails && isValid) {
    return {
      hasCredentials: true,
      username: creds.username ? '[REDACTED]' : null,
      password: creds.password ? '[REDACTED]' : null
    };
  }
  
  return {
    hasCredentials: isValid,
    username: null,
    password: null
  };
};

// Create a safe credentials object that masks sensitive data
const createSafeCredentials = () => {
  const creds = getCredentials();
  if (!validateCredentials(creds)) {
    return null;
  }
  
  return {
    username: creds.username,
    password: creds.password,
    // Add a toString method that doesn't expose credentials
    toString: () => '[Credentials Object]',
    // Add a toJSON method that doesn't expose credentials
    toJSON: () => ({ username: '[REDACTED]', password: '[REDACTED]' })
  };
};

module.exports = {
  // Don't expose credentials directly in module exports
  getCredentials,
  validateCredentials,
  getAndValidateCredentials,
  createSafeCredentials,
  logCredentialStatus,
  validateCredentialsProvided
};
