// backend/modules/auth/auth.controller.js
const authService = require('./auth.service');
const { getCurrentUser } = require('../../shared/auth/getCurrentUser');

const authController = {
  async register(req, res, next) {
    try {
      const { name, email, password, role } = req.body;
      const result = await authService.register({ name, email, password, role });
      return res.status(201).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      return res.status(200).json({
        success: true,
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req, res, next) {
    try {
      const currentUser = getCurrentUser(req);
      const user = await authService.getCurrentUserProfile(currentUser.userId || currentUser.id);
      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = authController;
