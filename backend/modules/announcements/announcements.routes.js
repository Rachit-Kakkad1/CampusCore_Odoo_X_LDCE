// backend/modules/announcements/announcements.routes.js
const express = require('express');
const router = express.Router();
const announcementsController = require('./announcements.controller');

// List all announcements (newest first)
router.get('/', announcementsController.getAll);

// Get single announcement by ID
router.get('/:id', announcementsController.getById);

// Create new announcement
router.post('/', announcementsController.create);

module.exports = router;
