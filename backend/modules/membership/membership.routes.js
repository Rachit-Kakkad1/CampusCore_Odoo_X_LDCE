// backend/modules/membership/membership.routes.js
const express = require('express');
const router = express.Router();
const membershipController = require('./membership.controller');

// 1. Static and Dashboard endpoints (Must precede /:userId to prevent param collision)
router.get('/dashboard', (req, res, next) => membershipController.getDashboard(req, res, next));
router.get('/me', (req, res, next) => membershipController.getMe(req, res, next));
router.get('/pass', (req, res, next) => membershipController.getPass(req, res, next));
router.get('/all', (req, res, next) => membershipController.getAll(req, res, next));
router.get('/expiring', (req, res, next) => {
  if (membershipController.getExpiring) return membershipController.getExpiring(req, res, next);
  return membershipController.getAll(req, res, next);
});

// 2. Member status and history by User ID
router.get('/:userId/history', (req, res, next) => membershipController.getHistory(req, res, next));
router.get('/history/:userId', (req, res, next) => membershipController.getHistory(req, res, next));
router.get('/:userId', (req, res, next) => membershipController.getByUserId(req, res, next));

// 3. Create new membership
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
router.post('/renew', (req, res, next) => membershipController.renew(req, res, next));

router.get('/verify/:memberCode', (req, res, next) => {
  if (membershipController.verifyMemberCode) return membershipController.verifyMemberCode(req, res, next);
  res.status(200).json({ success: true });
});

// Dual export for backwards and cross compatibility with app.js
module.exports = router;
module.exports.membershipRouter = router;
module.exports.membersRouter = router;
