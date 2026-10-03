const express = require('express');
const authController = require('./auth.controller');
const requireAuth = require('../../shared/auth/requireAuth');
const requireRole = require('../../shared/auth/requireRole');
const { authRateLimiter, passwordResetRateLimiter } = require('../../shared/security/rateLimiter');

const authRouter = express.Router();

// Public / User Auth
authRouter.post('/register', (req, res) => authController.register(req, res));
authRouter.post('/login', authRateLimiter, (req, res) => authController.login(req, res));
authRouter.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
authRouter.post('/logout', requireAuth, (req, res) => authController.logout(req, res));

// Password Management
authRouter.post('/change-password', requireAuth, (req, res) => authController.changePassword(req, res));
authRouter.post('/password/change', requireAuth, (req, res) => authController.changePassword(req, res));
authRouter.post('/forgot-password', passwordResetRateLimiter, (req, res) => authController.requestPasswordReset(req, res));
authRouter.post('/password/reset-request', passwordResetRateLimiter, (req, res) => authController.requestPasswordReset(req, res));
authRouter.post('/reset-password', passwordResetRateLimiter, (req, res) => authController.resetPassword(req, res));
authRouter.post('/password/reset', passwordResetRateLimiter, (req, res) => authController.resetPassword(req, res));

// Session Management
authRouter.get('/sessions', requireAuth, (req, res) => authController.getSessions(req, res));
authRouter.delete('/sessions/:id', requireAuth, (req, res) => authController.revokeSession(req, res));
authRouter.post('/sessions/:id/revoke', requireAuth, (req, res) => authController.revokeSession(req, res));
authRouter.post('/sessions/revoke-others', requireAuth, (req, res) => authController.revokeOtherSessions(req, res));

// Admin User Management routes
authRouter.get('/users/stats', requireAuth, requireRole('admin'), (req, res) => authController.getStats(req, res));
authRouter.get('/stats', requireAuth, requireRole('admin'), (req, res) => authController.getStats(req, res));
authRouter.get('/users', requireAuth, requireRole('admin'), (req, res) => authController.getAllUsers(req, res));
authRouter.post('/users', requireAuth, requireRole('admin'), (req, res) => authController.createUser(req, res));
authRouter.patch('/users/:id/role', requireAuth, requireRole('admin'), (req, res) => authController.updateRole(req, res));
authRouter.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => authController.deleteUser(req, res));
authRouter.post('/users/:id/unlock', requireAuth, requireRole('admin'), (req, res) => authController.unlockUser(req, res));

module.exports = authRouter;
