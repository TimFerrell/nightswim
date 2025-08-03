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

// Validate that credentials are provided
if (!credentials.username || !credentials.password) {
  throw new Error(
    'Missing Hayward OmniLogic credentials. ' +
    'Please set HAYWARD_USERNAME and HAYWARD_PASSWORD environment variables. ' +
    'For local development, you can create a .env file or export the variables directly.'
  );
}

module.exports = credentials;
