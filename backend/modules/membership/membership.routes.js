// backend/modules/membership/membership.routes.js
const express = require('express');
const router = express.Router();
const membershipController = require('./membership.controller');
const { requireAuth } = require('../../shared/auth/requireAuth');
const { requireRole } = require('../../shared/auth/requireRole');

// Get current authenticated user's membership details
router.get('/me', requireAuth, membershipController.getMe);

// Initiate / create membership for current user
router.post('/', requireAuth, membershipController.create);

// Pay membership dues (MVP workflow)
router.post('/dues/pay', requireAuth, membershipController.payDues);

// Get Member Pass card
router.get('/pass', requireAuth, membershipController.getPass);

// Admin & Treasurer: View all memberships
router.get('/all', requireAuth, requireRole('admin', 'treasurer'), membershipController.getAll);

module.exports = router;
