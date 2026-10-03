// backend/modules/announcements/announcements.routes.js
const express = require('express');
const router = express.Router();
const announcementsController = require('./announcements.controller');

router.get('/', (req, res) => {
  res.json({ module: 'announcements', status: 'ready' });
});

module.exports = router;
