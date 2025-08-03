const sessionManager = require('../services/sessionManager');
const credentials = require('../utils/credentials');

/**
 * @typedef {import('express').Request} ExpressRequest
 * @typedef {import('express').Response} ExpressResponse
 * @typedef {import('express').NextFunction} NextFunction
 */

const authMiddleware = {
  /**
   * Middleware to ensure user is authenticated
   * @param {ExpressRequest} req - Express request object
   * @param {ExpressResponse} res - Express response object
   * @param {NextFunction} next - Express next function
   */
  async ensureAuthenticated(req, res, next) {
    try {
      // Ensure we have a session ID (Express will create one if it doesn't exist)
      if (!req.sessionID) {
        req.session = {};
      }

      // Check both Express session and our custom session
      const expressSessionAuthenticated = req.session && req.session.authenticated;
      const haywardSessionId = req.session && req.session.haywardSessionId;
      let session = sessionManager.getSession(haywardSessionId || req.sessionID);

      // If not authenticated, automatically authenticate
      if (!expressSessionAuthenticated || !session || !session.authenticated) {
        console.log('🔐 Auto-authenticating for request...');

        // Create a new session
        const sessionId = req.sessionID;
        session = sessionManager.getSession(sessionId);

        // Authenticate using hardcoded credentials
        const authResult = await session.authenticate(credentials.username, credentials.password);

        if (!authResult.success) {
          return res.status(401).json({ error: `Authentication failed: ${authResult.message}` });
        }

        // Store the session
        sessionManager.setSession(sessionId, session);

        // Mark session as authenticated in Express session
        req.session.authenticated = true;
        req.session.haywardSessionId = sessionId;

        console.log('✅ Auto-authentication successful');
      }

      // Attach session to request for use in route handlers
      req.haywardSession = session;
      next();

    } catch (error) {
      console.error('Authentication middleware error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

module.exports = authMiddleware;
