const express = require('express');
const { handleLivekitWebhook } = require('../controllers/webhookController');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to capture raw body for webhook signature verification
// This needs to be placed *before* express.json() for this specific route.
// So, we'll add it directly here.
router.use((req, res, next) => {
  if (req.originalUrl === '/api/webhooks/livekit' && req.method === 'POST') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
});

router.post('/livekit', handleLivekitWebhook);

module.exports = router;