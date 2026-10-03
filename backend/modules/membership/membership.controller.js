// backend/modules/membership/membership.controller.js
const membershipService = require('./membership.service');

const membershipController = {
  /**
   * GET /api/membership/dashboard
   * Aggregated membership metrics
   */
  async getDashboard(req, res, next) {
    try {
      const data = await membershipService.getDashboard();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/membership/me
   * Retrieve current user's membership
   */
  async getMe(req, res, next) {
    try {
      const userId = req.user?.userId || req.headers['x-user-id'] || 1;
      const data = await membershipService.getMembership(userId);
      return res.status(200).json({
        success: true,
        data,
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
      const userId = req.user?.userId || req.query.userId || req.headers['x-user-id'] || 1;
      const data = await membershipService.getMemberPass(userId);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/membership/all
   * View all memberships (with status/search query filtering)
   */
  async getAll(req, res, next) {
    try {
      const { status, search } = req.query;
      const data = await membershipService.getAllMemberships({ status, search });
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/membership/:userId/history
   * Retrieve full membership history for a user
   */
  async getHistory(req, res, next) {
    try {
      const { userId } = req.params;
      const data = await membershipService.getMembershipHistory(userId);
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/membership/:userId
   * Retrieve current membership status for a user
   */
  async getByUserId(req, res, next) {
    try {
      const { userId } = req.params;
      if (userId === 'me') {
        return membershipController.getMe(req, res, next);
      }
      const data = await membershipService.getMembership(userId);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership
   * Create a new pending membership for user
   */
  async create(req, res, next) {
    try {
      const userId =
        req.body?.user_id || req.user?.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(400).json({
          error: {
            message: 'user_id is required to create a membership',
            status: 400,
          },
        });
      }

      const duesAmount = req.body?.dues_amount || 500.00;
      const data = await membershipService.createMembership(userId, { dues_amount: duesAmount });

      return res.status(201).json({
        success: true,
        message: 'Membership initiated successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership/:id/pay
   * Activate membership upon successful dues payment
   */
  async pay(req, res, next) {
    try {
      const { id } = req.params;
      const { payment_mode = 'online' } = req.body || {};
      const data = await membershipService.payMembership(id, { payment_mode });
      return res.status(200).json({
        success: true,
        message: 'Membership dues paid successfully. Membership is now active.',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership/dues/pay (backwards compatible)
   */
  async payDues(req, res, next) {
    try {
      const userId = req.body?.user_id || req.user?.userId || req.headers['x-user-id'] || 1;
      const { payment_mode = 'online' } = req.body || {};
      const data = await membershipService.payDues(userId, payment_mode);
      return res.status(200).json({
        success: true,
        message: 'Membership dues paid successfully. Membership is now active.',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/membership/:id/cancel
   * Cancel an existing membership
   */
  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({
          error: {
            message: 'Cancellation reason is required',
            status: 400,
          },
        });
      }

      const data = await membershipService.cancelMembership(id, { reason: reason.trim() });
      return res.status(200).json({
        success: true,
        message: 'Membership cancelled successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership/:id/renew
   * Initiate renewal from an expired or cancelled membership
   */
  async renew(req, res, next) {
    try {
      const { id } = req.params;
      const { dues_amount = 500.00 } = req.body || {};
      const data = await membershipService.renewMembership(id, { dues_amount });
      return res.status(201).json({
        success: true,
        message: 'Membership renewal initiated successfully. Please complete payment to activate.',
        data,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = membershipController;
