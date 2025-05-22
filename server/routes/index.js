const express = require('express');
const sessionRoutes = require('./sessionRoutes');

const router = express.Router();

router.use('/sessions', sessionRoutes);

module.exports = router;