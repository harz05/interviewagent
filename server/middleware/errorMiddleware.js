const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
module.exports = (err, req, res, next) => {
  // Log the error
  logger.error(`${err.name}: ${err.message}`, { 
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  // Set default error code and message
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Determine if this is a production environment
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, don't send the stack trace
  const responseBody = {
    error: {
      message,
      ...(isProduction ? {} : { stack: err.stack })
    }
  };
  
  res.status(statusCode).json(responseBody);
};