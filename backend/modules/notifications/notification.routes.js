const express = require('express');
const notificationController = require('./notification.controller');
const requireAuth = require('../../shared/auth/requireAuth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => notificationController.getNotifications(req, res));
router.get('/unread-count', requireAuth, (req, res) => notificationController.getUnreadCount(req, res));
router.patch('/read-all', requireAuth, (req, res) => notificationController.markAllAsRead(req, res));
router.patch('/:id/read', requireAuth, (req, res) => notificationController.markAsRead(req, res));

module.exports = router;
