// backend/modules/finance/finance.routes.js
const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const { requireAuth } = require('../../shared/auth/requireAuth');
const { requireRole } = require('../../shared/auth/requireRole');

// Fundraisers endpoints
router.get('/fundraisers', financeController.getFundraisers);
router.post('/fundraisers', requireAuth, requireRole('admin', 'treasurer'), financeController.createFundraiser);

// Ledger overview
router.get('/overview', requireAuth, requireRole('admin', 'treasurer'), financeController.getOverview);

module.exports = router;
