// backend/modules/membership/membership.routes.js
const express = require('express');
const router = express.Router();
const membershipController = require('./membership.controller');

// 1. Static and Dashboard endpoints (Must precede /:userId to prevent param collision)
router.get('/dashboard', membershipController.getDashboard);
router.get('/me', membershipController.getMe);
router.get('/pass', membershipController.getPass);
router.get('/all', membershipController.getAll);

// 2. Member status and history by User ID
router.get('/:userId/history', membershipController.getHistory);
router.get('/:userId', membershipController.getByUserId);

// 3. Create new membership
router.post('/', membershipController.create);

// 4. Payment / Activation
router.post('/dues/pay', membershipController.payDues);
router.post('/:id/pay', membershipController.pay);

// 5. Cancellation
router.patch('/:id/cancel', membershipController.cancel);

// 6. Renewal
router.post('/:id/renew', membershipController.renew);

module.exports = router;
