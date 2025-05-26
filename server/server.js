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
let ioInstance = null; // To store the io instance

const io = socketIo(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});
ioInstance = io; // Assign to the module-level variable

// Initialize socket handlers
setupSocketHandlers(io);

// Export a getter for the io instance
const getIoInstance = () => {
    if (!ioInstance) {
        logger.warn('Socket.IO instance requested before initialization!');
    }
    return ioInstance;
};

module.exports = { server, getIoInstance }; // Export server and getter

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


// Make sure this is at the very end or structured so `getIoInstance` is exported.
// If module.exports is overwritten later, this export might be lost.
// The current placement should be fine.
