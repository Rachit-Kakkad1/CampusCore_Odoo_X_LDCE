const express = require('express');
const membershipController = require('./membership.controller');
const requireAuth = require('../../shared/auth/requireAuth');
const requireRole = require('../../shared/auth/requireRole');

const membershipRouter = express.Router();

// User membership routes
membershipRouter.get('/me', requireAuth, (req, res) => membershipController.getMyMembership(req, res));
membershipRouter.post('/pay', requireAuth, (req, res) => membershipController.payDues(req, res));
membershipRouter.post('/cancel', requireAuth, (req, res) => membershipController.cancelMembership(req, res));
membershipRouter.post('/renew', requireAuth, (req, res) => membershipController.renewMembership(req, res));
membershipRouter.get('/pass', requireAuth, (req, res) => membershipController.getMemberPass(req, res));
membershipRouter.get('/history', requireAuth, (req, res) => membershipController.getRenewalHistory(req, res));
membershipRouter.get('/history/:userId', requireRole('admin', 'treasurer'), (req, res) => membershipController.getRenewalHistory(req, res));
membershipRouter.get('/verify/:memberCode', (req, res) => membershipController.verifyMemberCode(req, res));

// Admin / Treasurer management routes
membershipRouter.get('/dashboard', requireRole('admin', 'treasurer'), (req, res) => membershipController.getExpiryDashboard(req, res));
membershipRouter.get('/expiring', requireRole('admin', 'treasurer'), (req, res) => membershipController.getExpiringMemberships(req, res));
membershipRouter.post('/sync', requireRole('admin', 'treasurer'), (req, res) => membershipController.syncStatuses(req, res));
membershipRouter.get('/', requireRole('admin', 'treasurer'), (req, res) => membershipController.getAllMembers(req, res));

// Members Router (/members)
const membersRouter = express.Router();
membersRouter.get('/', requireRole('admin', 'treasurer'), (req, res) => membershipController.getAllMembers(req, res));

module.exports = {
  membershipRouter,
  membersRouter,
};
