// server/controllers/interviewController.js - Enhanced
const { livekitAudioProcessor } = require('../services/livekitAudioService');
const { generateAccessToken } = require('../services/livekitTokenService');
const { createSession, getSessionById, updateSession } = require('../services/sessionStore');
const logger = require('../utils/logger');

/**
 * Start AI interview session
 */
exports.startAIInterview = async (req, res) => {
  try {
    const { candidateName, position, resumeData } = req.body;

    // Create new session
    const session = createSession({
      candidateName,
      position,
      resumeData,
      type: 'ai-voice-interview',
      status: 'active'
    });

    const roomName = `interview-${session.id}`;

    // Start AI interview processing
    const result = await livekitAudioProcessor.startAIInterview(session.id, roomName);

    // Generate access token for candidate
    const candidateToken = await generateAccessToken(roomName, candidateName);

    // Update session with room info
    updateSession(session.id, {
      roomName,
      livekitToken: candidateToken,
      startedAt: new Date()
    });

    logger.info(`AI interview started for session: ${session.id}`);

    res.json({
      success: true,
      sessionId: session.id,
      roomName,
      accessToken: candidateToken,
      serverUrl: process.env.LIVEKIT_URL
    });

  } catch (error) {
    logger.error('Error starting AI interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start AI interview'
    });
  }
};

/**
 * End AI interview session
 */
exports.endAIInterview = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // End AI interview processing
    await livekitAudioProcessor.endAIInterview(sessionId);

    // Get conversation history
    const conversationHistory = livekitAudioProcessor.getConversationHistory(sessionId);

    // Update session
    updateSession(sessionId, {
      status: 'completed',
      endedAt: new Date(),
      conversationHistory
    });

    logger.info(`AI interview ended for session: ${sessionId}`);

    res.json({
      success: true,
      conversationHistory,
      session: getSessionById(sessionId)
    });

  } catch (error) {
    logger.error('Error ending AI interview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end AI interview'
    });
  }
};

/**
 * Get interview status and conversation
 */
exports.getInterviewStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const conversationHistory = livekitAudioProcessor.getConversationHistory(sessionId);

    res.json({
      success: true,
      session,
      conversationHistory,
      isActive: session.status === 'active'
    });

  } catch (error) {
    logger.error('Error getting interview status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interview status'
    });
  }
};