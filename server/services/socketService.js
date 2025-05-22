const { getSessionById, addMessageToSession } = require('./sessionStore');
const { generateAIResponse } = require('./llmService');
const logger = require('../utils/logger');

/**
 * Set up Socket.IO event handlers
 * @param {Object} io - Socket.IO server instance
 */
exports.setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Join a specific interview session
    socket.on('join-session', ({ sessionId }) => {
      const session = getSessionById(sessionId);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      // Join the session room
      socket.join(sessionId);
      logger.info(`Client ${socket.id} joined session: ${sessionId}`);
      
      // Welcome message can be sent here if needed
    });
    
    // Handle user messages
    socket.on('user-message', async ({ sessionId, message }) => {
      const session = getSessionById(sessionId);
      
      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }
      
      // Save user message
      addMessageToSession(sessionId, {
        sender: 'user',
        text: message,
        timestamp: new Date()
      });
      
      try {
        // Generate AI response
        const aiResponse = await generateAIResponse(sessionId, message);
        
        // Save AI response
        addMessageToSession(sessionId, {
          sender: 'ai',
          text: aiResponse,
          timestamp: new Date()
        });
        
        // Send AI response to all clients in the session
        io.to(sessionId).emit('ai-message', aiResponse);
      } catch (error) {
        logger.error(`Error generating AI response: ${error.message}`);
        socket.emit('error', { message: 'Failed to generate AI response' });
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