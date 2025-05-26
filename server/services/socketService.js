const { getSessionById, addMessageToSession } = require('./sessionStore');
// const { generateAIResponse } = require('./llmService'); // LLM call will be handled by livekitAudioService
const logger = require('../utils/logger');
const { handleTranscript } = require('./livekitAudioService'); // For processing user's transcribed speech
// const { ensureAIConnected } = require('./aiParticipantService'); // AI client removed
const config = require('../config');

/**
 * Set up Socket.IO event handlers
 * @param {Object} io - Socket.IO server instance
 */
exports.setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join a specific interview session
    socket.on('join-session', async ({ sessionId }) => { // Made async
      const session = getSessionById(sessionId);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      socket.join(sessionId);
      logger.info(`Client ${socket.id} joined session room: ${sessionId}`);
      
      try {
        // With AI client removed, there's no 'ensureAIConnected' to call here.
        // The AI's presence is now managed by Server SDK actions (Ingress/Egress).
        // Webhooks for participant_joined could trigger initial AI actions if needed,
        // but the AI doesn't "connect" in the client sense anymore.
        logger.info(`[SocketService] User ${socket.id} joined session ${sessionId}. AI interaction managed by Server SDK.`);

        // Optionally, send the initial AI greeting message via livekitAudioService
        // This assumes handleTranscript can also be triggered programmatically for initial messages
        // or a dedicated function in livekitAudioService handles sending initial AI audio.
        // For now, the initial greeting is handled by client-side SessionContext.
        // If we want the AI to speak its first words:
        // const initialGreeting = "Hello! I'm your AI interviewer. Please introduce yourself.";
        // await handleTranscript(sessionId, config.aiParticipant.identity, initialGreeting, true); // 'true' to indicate it's an AI initial message

      } catch (error) {
        logger.error(`[SocketService] Error ensuring AI connected for session ${sessionId} on join:`, error);
        socket.emit('error', { message: 'Failed to initialize AI for the session.' });
      }
    });
    
    // Handle user messages (transcripts from client-side STT)
    socket.on('user-message', async ({ sessionId, message: transcript }) => {
      const session = getSessionById(sessionId);
      const userIdentity = session?.name || socket.id; // Or get identity from session if stored

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      if (!transcript || typeof transcript !== 'string' || transcript.trim() === "") {
        logger.warn(`[SocketService] Received empty or invalid transcript from ${userIdentity} for session ${sessionId}`);
        return;
      }

      logger.info(`[SocketService] Received user transcript from ${userIdentity} for session ${sessionId}: "${transcript.substring(0, 50)}..."`);
      
      // Save user transcript (message)
      addMessageToSession(sessionId, {
        sender: 'user', // Or use a more specific identity if available
        text: transcript,
        timestamp: new Date()
      });
      
      // The client will display the user's transcript immediately.
      // Now, process this transcript to get an AI audio response.
      try {
        // handleTranscript will manage LLM, TTS, and sending audio via LiveKit File Ingress
        // It will also save the AI's text response to sessionStore.
        // The 'ai-message' with AI's text will be emitted by handleTranscript or a related function
        // after the AI's audio is initiated.
        await handleTranscript(sessionId, userIdentity, transcript);
      } catch (error) {
        logger.error(`[SocketService] Error processing user transcript for session ${sessionId}:`, error);
        socket.emit('error', { message: 'Failed to process your message or generate AI response.' });
      }
    });
    
    // Handle session end
    socket.on('end-session', ({ sessionId }) => {
      // Notify all clients in the session
      io.to(sessionId).emit('session-ended');
      
      // Disconnect all clients from the session room
      socket.to(sessionId).disconnectSockets();
      
      logger.info(`Session ended: ${sessionId}`);
    });
    
    // Handle client disconnect
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });
};