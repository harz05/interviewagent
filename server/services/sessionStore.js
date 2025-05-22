const config = require('../config');
const logger = require('../utils/logger');

// In-memory session store (replace with a database in production)
const sessions = new Map();

// Session cleanup interval
const SESSION_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Store a session in memory
 * @param {string} sessionId - The session ID
 * @param {object} sessionData - The session data
 */
exports.storeSession = (sessionId, sessionData) => {
  sessions.set(sessionId, sessionData);
  logger.info(`Session created: ${sessionId}`);
};

/**
 * Get a session by ID
 * @param {string} sessionId - The session ID
 * @returns {object|null} - The session data or null if not found
 */
exports.getSessionById = (sessionId) => {
  return sessions.get(sessionId) || null;
};

/**
 * Remove a session
 * @param {string} sessionId - The session ID
 */
exports.removeSession = (sessionId) => {
  sessions.delete(sessionId);
  logger.info(`Session removed: ${sessionId}`);
};

/**
 * Add a message to a session
 * @param {string} sessionId - The session ID
 * @param {object} message - The message object
 */
exports.addMessageToSession = (sessionId, message) => {
  const session = sessions.get(sessionId);
  if (session) {
    if (!session.messages) {
      session.messages = [];
    }
    session.messages.push(message);
    session.lastUpdated = new Date();
  }
};

/**
 * Get all messages for a session
 * @param {string} sessionId - The session ID
 * @returns {Array} - Array of message objects
 */
exports.getSessionMessages = (sessionId) => {
  const session = sessions.get(sessionId);
  return session?.messages || [];
};

// Clean up expired sessions
setInterval(() => {
  const now = new Date();
  sessions.forEach((session, sessionId) => {
    const lastUpdated = session.lastUpdated || session.createdAt;
    const timeDiff = now - lastUpdated;
    
    if (timeDiff > config.sessionTimeout) {
      exports.removeSession(sessionId);
      logger.info(`Session expired and removed: ${sessionId}`);
    }
  });
}, SESSION_CLEANUP_INTERVAL);