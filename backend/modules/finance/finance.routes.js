// backend/modules/finance/finance.routes.js
const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const { requireAuth } = require('../../shared/auth/requireAuth');
const { requireRole } = require('../../shared/auth/requireRole');

// Ledger & Summary
router.get('/overview', requireAuth, requireRole('admin', 'treasurer'), financeController.getOverview);
router.get('/summary', requireAuth, requireRole('admin', 'treasurer'), financeController.getOverview);
router.get('/transactions', requireAuth, requireRole('admin', 'treasurer'), financeController.getTransactions);
router.get('/owing', requireAuth, requireRole('admin', 'treasurer'), financeController.getOwing);

// Expenses
router.get('/expenses', requireAuth, requireRole('admin', 'treasurer', 'event_manager', 'volunteer', 'member'), financeController.getExpenses);
router.get('/expenses/:id', requireAuth, requireRole('admin', 'treasurer', 'event_manager', 'volunteer', 'member'), financeController.getExpenseById);
router.post('/expenses', requireAuth, financeController.createExpense);
router.post('/expenses/:id/approve', requireAuth, requireRole('admin', 'treasurer'), financeController.approveExpense);
router.post('/expenses/:id/reject', requireAuth, requireRole('admin', 'treasurer'), financeController.rejectExpense);
router.post('/expenses/:id/reimburse', requireAuth, requireRole('admin', 'treasurer'), financeController.reimburseExpense);

// Fundraisers & Income
router.get('/fundraisers', financeController.getFundraisers);
router.post('/fundraisers', requireAuth, requireRole('admin', 'treasurer'), financeController.createFundraiser);
router.post('/fundraisers/:id/income', requireAuth, requireRole('admin', 'treasurer'), financeController.addFundraiserIncome);

// Transactions ledger
router.get('/transactions', requireAuth, requireRole('admin', 'treasurer'), financeController.getTransactions);

// Expense claims
router.get('/expenses', requireAuth, requireRole('admin', 'treasurer'), financeController.getExpenses);
router.post('/expenses', requireAuth, financeController.createExpense);
router.patch('/expenses/:id/approve', requireAuth, requireRole('admin', 'treasurer'), financeController.approveExpense);

module.exports = router;
