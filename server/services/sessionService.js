const { AccessToken } = require('livekit-server-sdk');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Generate a unique session ID
 * @returns {string} - Unique session ID
 */
exports.generateSessionId = () => {
  return uuidv4();
};

/**
 * Create a LiveKit token for a participant
 * @param {string} sessionId - The session ID (used as room name)
 * @param {string} participantName - The participant's name
 * @returns {string} - LiveKit token
 */
exports.createLivekitToken = (sessionId, participantName) => {
  const { apiKey, apiSecret } = config.livekit;
  
  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API key and secret must be configured');
  }
  
  // Create access token with the participant's identity
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  });
  
  // Grant permission to join room with sessionId
  token.addGrant({
    roomJoin: true,
    room: sessionId,
    canPublish: true,
    canSubscribe: true,
  });
  
  return token.toJwt();
};