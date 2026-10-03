// backend/modules/membership/membership.controller.js
const membershipService = require('./membership.service');

const membershipController = {
  /**
   * GET /api/membership/me
   * Retrieve current user's membership
   */
  async getMe(req, res, next) {
    try {
      const userId = req.user.userId;
      const data = await membershipService.getMembership(userId);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership
   * Initiate new membership for current user
   */
  async create(req, res, next) {
    try {
      const userId = req.user.userId;
      const data = await membershipService.createMembership(userId);
      return res.status(201).json({
        success: true,
        message: 'Membership initiated successfully',
        data
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership/dues/pay
   * Pay dues for membership (MVP flow)
   */
  async payDues(req, res, next) {
    try {
      const userId = req.user.userId;
      const { payment_mode = 'online' } = req.body;
      const data = await membershipService.payDues(userId, payment_mode);
      return res.status(200).json({
        success: true,
        message: 'Membership dues paid successfully. Membership is now active.',
        data
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/membership/pass
   * Retrieve digital Member Pass
   */
  async getPass(req, res, next) {
    try {
      const userId = req.user.userId;
      const data = await membershipService.getMemberPass(userId);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/membership/all
   * Admin / Treasurer: View all memberships
   */
  async getAll(req, res, next) {
    try {
      const data = await membershipService.getAllMemberships();
      return res.status(200).json({
        success: true,
        count: data.length,
        data
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = membershipController;
