const express = require('express');
const securityController = require('./security.controller');
const requireAuth = require('../../shared/auth/requireAuth');
const requireRole = require('../../shared/auth/requireRole');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/overview', (req, res) => securityController.getOverview(req, res));
router.get('/audit-logs', (req, res) => securityController.getAuditLogs(req, res));
router.post('/unlock-user/:id', (req, res) => securityController.unlockUser(req, res));
router.post('/revoke-session/:id', (req, res) => securityController.revokeSession(req, res));

module.exports = router;
