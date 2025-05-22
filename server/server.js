const http = require('http');
const app = require('./app');
const socketIo = require('socket.io');
const config = require('./config');
const { setupSocketHandlers } = require('./services/socketService');
const logger = require('./utils/logger');
console.log(process.env.LIVEKIT_API_KEY)
// Create HTTP server
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

// Initialize socket handlers
setupSocketHandlers(io);

// Start server
server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // In production, you might want to exit the process
  // process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // In production, you might want to exit the process
  // process.exit(1);
});
