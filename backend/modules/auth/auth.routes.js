// backend/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// Routes definitions to be hooked up in Auth phase
router.get('/', (req, res) => {
  res.json({ module: 'auth', status: 'ready' });
});

module.exports = router;
