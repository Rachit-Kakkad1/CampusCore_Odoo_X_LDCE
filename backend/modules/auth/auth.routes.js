const express = require('express');
const authController = require('./auth.controller');
const requireAuth = require('../../shared/auth/requireAuth');

const authRouter = express.Router();

authRouter.post('/register', (req, res) => authController.register(req, res));
authRouter.post('/login', (req, res) => authController.login(req, res));
authRouter.get('/me', requireAuth, (req, res) => authController.getMe(req, res));

module.exports = authRouter;
