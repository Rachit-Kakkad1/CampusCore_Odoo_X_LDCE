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

// Transactions ledger
router.get('/transactions', requireAuth, requireRole('admin', 'treasurer'), financeController.getTransactions);

// Expense claims
router.get('/expenses', requireAuth, requireRole('admin', 'treasurer'), financeController.getExpenses);
router.post('/expenses', requireAuth, financeController.createExpense);
router.patch('/expenses/:id/approve', requireAuth, requireRole('admin', 'treasurer'), financeController.approveExpense);

module.exports = router;
