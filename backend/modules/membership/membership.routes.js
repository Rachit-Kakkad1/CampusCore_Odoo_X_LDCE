// backend/modules/membership/membership.routes.js
const express = require('express');
const router = express.Router();
const membershipController = require('./membership.controller');

router.get('/', (req, res) => {
  res.json({ module: 'membership', status: 'ready' });
});

module.exports = router;
