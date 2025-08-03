const HaywardSession = require('./HaywardSession');

// Store for user sessions and their cookie jars
/** @type {Map<string, import('./HaywardSession')>} */
const userSessions = new Map();

// Clean up expired sessions periodically
setInterval(() => {
  for (const [sessionId, session] of userSessions.entries()) {
    if (session.isExpired()) {
      userSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Clean up every hour

const sessionManager = {
  /**
   * Get or create a user session
   * @param {string} sessionId - The session ID
   * @returns {import('./HaywardSession')} The session instance
   */
  getSession(sessionId) {
    if (!userSessions.has(sessionId)) {
      userSessions.set(sessionId, new HaywardSession(sessionId));
    }

    const session = userSessions.get(sessionId);
    if (session.isExpired()) {
      userSessions.delete(sessionId);
      return new HaywardSession(sessionId);
    }

    return session;
  },

  /**
   * Store a session
   * @param {string} sessionId - The session ID
   * @param {import('./HaywardSession')} session - The session instance
   */
  setSession(sessionId, session) {
    userSessions.set(sessionId, session);
  },

  /**
   * Remove a session
   * @param {string} sessionId - The session ID
   */
  removeSession(sessionId) {
    userSessions.delete(sessionId);
  },

  /**
   * Get all active sessions
   * @returns {Map<string, import('./HaywardSession')>} Map of active sessions
   */
  getAllSessions() {
    return userSessions;
  }
};

module.exports = sessionManager;
