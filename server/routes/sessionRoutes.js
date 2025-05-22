// server/routes/sessionRoutes.js
const express = require('express');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

// Create a new interview session
router.post('/', sessionController.createSession);

// Get a specific session
router.get('/:sessionId', sessionController.getSession);

// End a session
router.delete('/:sessionId', sessionController.endSession);

module.exports = router;