// backend/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { requireAuth } = require('../../shared/auth/requireAuth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
