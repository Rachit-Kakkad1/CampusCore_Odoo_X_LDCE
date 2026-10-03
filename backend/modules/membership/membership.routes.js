// backend/modules/membership/membership.routes.js
const express = require('express');
const membershipController = require('./membership.controller');

const router = express.Router();

// 1. Static and Dashboard endpoints (Must precede /:userId to prevent param collision)
router.get('/dashboard', (req, res, next) => membershipController.getDashboard(req, res, next));
router.get('/plans', (req, res, next) => membershipController.getPlans(req, res, next));
router.post('/checkout', (req, res, next) => membershipController.checkout(req, res, next));
router.get('/me', (req, res, next) => membershipController.getMe(req, res, next));
router.get('/pass', (req, res, next) => membershipController.getPass(req, res, next));
router.get('/all', (req, res, next) => membershipController.getAll(req, res, next));
router.get('/expiring', (req, res, next) => membershipController.getExpiring(req, res, next));
router.get('/history', (req, res, next) => membershipController.getHistory(req, res, next));
router.post('/sync', (req, res, next) => membershipController.syncStatuses(req, res, next));

// 2. Member status and history by User ID & verification
router.get('/:userId/history', (req, res, next) => membershipController.getHistory(req, res, next));
router.get('/history/:userId', (req, res, next) => membershipController.getHistory(req, res, next));
router.get('/verify/:memberCode', (req, res, next) => membershipController.verifyMemberCode(req, res, next));
router.get('/:userId', (req, res, next) => membershipController.getByUserId(req, res, next));

// 3. Collection root
router.get('/', (req, res, next) => membershipController.getAll(req, res, next));
router.post('/', (req, res, next) => membershipController.create(req, res, next));

// 4. Payment / Activation
router.post('/dues/pay', (req, res, next) => membershipController.payDues(req, res, next));
router.post('/pay', (req, res, next) => membershipController.payDues(req, res, next));
router.post('/:id/pay', (req, res, next) => membershipController.pay(req, res, next));

// 5. Cancellation
router.patch('/:id/cancel', (req, res, next) => membershipController.cancel(req, res, next));
router.post('/:id/cancel', (req, res, next) => membershipController.cancel(req, res, next));
router.post('/cancel', (req, res, next) => membershipController.cancel(req, res, next));

// 6. Renewal
router.post('/:id/renew', (req, res, next) => membershipController.renew(req, res, next));
router.post('/renew', (req, res, next) => membershipController.renewMembership(req, res, next));

// Members Router (/members)
const membersRouter = express.Router();
membersRouter.get('/', (req, res, next) => membershipController.getAll(req, res, next));

// Dual export for backwards and cross compatibility with app.js
module.exports = router;
module.exports.membershipRouter = router;
module.exports.membersRouter = membersRouter;
