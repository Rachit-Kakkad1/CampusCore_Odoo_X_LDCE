const express = require('express');
const announcementsController = require('./announcements.controller');
const requireRole = require('../../shared/auth/requireRole');

const announcementsRouter = express.Router();

announcementsRouter.get('/', (req, res) => announcementsController.getAllAnnouncements(req, res));
announcementsRouter.post('/', requireRole('admin', 'event_manager'), (req, res) => announcementsController.createAnnouncement(req, res));

module.exports = announcementsRouter;
