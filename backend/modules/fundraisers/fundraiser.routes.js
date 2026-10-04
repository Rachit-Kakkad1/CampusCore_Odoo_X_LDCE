const express = require('express');
const router = express.Router();
const fundraiserController = require('./fundraiser.controller');
const requireAuth = require('../../shared/auth/requireAuth');
const requireRole = require('../../shared/auth/requireRole');
const optionalAuth = require('../../shared/auth/optionalAuth');

// --- PUBLIC & GUEST CAMPAIGN ENDPOINTS ---
router.get('/', optionalAuth, (req, res) => fundraiserController.getPublicFundraisers(req, res));
router.get('/admin', requireAuth, requireRole('admin', 'treasurer'), (req, res) => fundraiserController.getAdminFundraisers(req, res));
router.get('/admin/stats', requireAuth, requireRole('admin', 'treasurer'), (req, res) => fundraiserController.getGlobalStats(req, res));

// --- ADMIN CAMPAIGN CREATION & MANAGEMENT ---
router.post('/', requireAuth, requireRole('admin'), (req, res) => fundraiserController.createFundraiser(req, res));
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => fundraiserController.updateFundraiser(req, res));
router.patch('/:id/status', requireAuth, requireRole('admin'), (req, res) => fundraiserController.setStatus(req, res));

// --- DONATION CHECKOUT & PAYMENT FLOW (GUEST + AUTHENTICATED) ---
router.post('/:id/donations/checkout', optionalAuth, (req, res) => fundraiserController.checkoutDonation(req, res));
router.post('/donations/:id/pay', optionalAuth, (req, res) => fundraiserController.payDonation(req, res));
router.post('/donations/:id/fail', optionalAuth, (req, res) => fundraiserController.failDonation(req, res));
router.get('/donations/:id', optionalAuth, (req, res) => fundraiserController.getDonationDetails(req, res));

// --- LOGGED-IN USER DONATION HISTORY ---
router.get('/donations/user/my', requireAuth, (req, res) => fundraiserController.getUserDonations(req, res));

// --- ADMIN DONATIONS & REFUNDS ---
router.get('/donations/admin/list', requireAuth, requireRole('admin', 'treasurer'), (req, res) => fundraiserController.getAdminDonations(req, res));
router.post('/donations/:id/refund', requireAuth, requireRole('admin', 'treasurer'), (req, res) => fundraiserController.refundDonation(req, res));

// --- PAYMENT PROVIDER WEBHOOK ---
router.post('/donations/webhook', (req, res) => fundraiserController.handleWebhook(req, res));

// --- SINGLE CAMPAIGN DETAILS (MUST BE LAST TO AVOID CLASH WITH NAMED ROUTES) ---
router.get('/:id', optionalAuth, (req, res) => fundraiserController.getFundraiserDetails(req, res));

module.exports = router;
