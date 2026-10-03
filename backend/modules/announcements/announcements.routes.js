// backend/modules/announcements/announcements.routes.js
const express = require('express');
const router = express.Router();
const announcementsController = require('./announcements.controller');

// List announcements with pagination, filtering, and search (newest first)
router.get('/', announcementsController.getAll);

// Get single announcement by ID
router.get('/:id', announcementsController.getById);

// Create new announcement (draft or published)
router.post('/', announcementsController.create);

// Publish a draft announcement
router.patch('/:id/publish', announcementsController.publish);

module.exports = router;
