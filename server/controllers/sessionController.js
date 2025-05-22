const { createLivekitToken, generateSessionId } = require('../services/sessionService');
const { storeSession, getSessionById, removeSession } = require('../services/sessionStore');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Create a new interview session
 */
exports.createSession = async (req, res, next) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Generate a unique session ID
    const sessionId = generateSessionId();
    
    // Create LiveKit token
    const token = createLivekitToken(sessionId, name);
    
    // Store session
    storeSession(sessionId, {
      id: sessionId,
      name,
      createdAt: new Date(),
      messages: []
    });
    
    res.status(201).json({
      sessionId,
      token,
      livekitUrl: config.livekit.url
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    next(error);
  }
};

/**
 * Get a specific session
 */
exports.getSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = getSessionById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Create a new token for the user
    const token = createLivekitToken(sessionId, session.name);
    
    res.status(200).json({
      sessionId,
      token,
      livekitUrl: config.livekit.url,
      name: session.name
    });
  } catch (error) {
    logger.error('Error getting session:', error);
    next(error);
  }
};

/**
 * End an interview session
 */
exports.endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = getSessionById(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Remove the session
    removeSession(sessionId);
    
    res.status(200).json({ message: 'Session ended successfully' });
  } catch (error) {
    logger.error('Error ending session:', error);
    next(error);
  }
};