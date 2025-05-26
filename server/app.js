const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const mainRoutes = require('./routes'); // Renamed to avoid conflict
const webhookRoutes = require('./routes/webhookRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS
app.use(cors({
  origin: config.corsOrigin
}));

// Logging
app.use(morgan('dev'));

// IMPORTANT: Webhook routes that need raw body should be registered BEFORE express.json()
// The raw body parsing is handled within webhookRoutes.js itself.
app.use('/api/webhooks', webhookRoutes);

// Parse JSON bodies for other routes
app.use(express.json());

// API routes (main)
app.use('/api', mainRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use(errorMiddleware);

module.exports = app;
