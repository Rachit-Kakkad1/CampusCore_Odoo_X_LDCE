// backend/modules/membership/membership.controller.js
const membershipService = require('./membership.service');
const getCurrentUser = require('../../shared/auth/getCurrentUser');

const membershipController = {
  /**
   * GET /api/membership/plans
   * Retrieve official membership plans and pricing
   */
  async getPlans(req, res, next) {
    try {
      const plans = membershipService.getPlans();
      return res.status(200).json({
        success: true,
        count: plans.length,
        plans,
        data: plans,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership/checkout
   * Server determines plan duration, price, and dynamic PostgreSQL interval expiry.
   */
  async checkout(req, res, next) {
    try {
      const authUser = getCurrentUser(req);
      const userId = req.body?.user_id || authUser?.id || authUser?.userId || req.user?.id || req.user?.userId;
      const { plan, payment_mode = 'online', name, email, mobile } = req.body || {};

      const result = await membershipService.checkout({
        userId,
        plan,
        payment_mode,
        name,
        email,
        mobile,
      });

      return res.status(200).json({
        success: true,
        message: 'Membership activated successfully',
        ...result,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        error: err.code || 'MEMBERSHIP_CHECKOUT_ERROR',
        code: err.code || 'MEMBERSHIP_CHECKOUT_ERROR',
        message: err.message,
        expiry_date: err.expiry_date || undefined,
      });
    }
  },

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
        dashboard: data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getExpiryDashboard(req, res, next) {
    return this.getDashboard(req, res, next);
  },

  /**
   * GET /api/membership/me
   * Retrieve current user's membership
   */
  async getMe(req, res, next) {
    try {
      const authUser = getCurrentUser(req);
      const userId = authUser?.id || authUser?.userId || req.user?.id || req.user?.userId || req.headers['x-user-id'] || 1;
      const data = await membershipService.getMembership(userId);
      return res.status(200).json({
        success: true,
        ...data,
        data,
        membership: data.membership,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMyMembership(req, res, next) {
    return this.getMe(req, res, next);
  },

  /**
   * GET /api/membership/pass
   * Retrieve digital Member Pass
   */
  async getPass(req, res, next) {
    try {
      const authUser = getCurrentUser(req);
      const userId = authUser?.id || authUser?.userId || req.user?.id || req.user?.userId || req.query.userId || req.headers['x-user-id'] || 1;
      const data = await membershipService.getMemberPass(userId);
      return res.status(200).json({
        success: true,
        pass: data,
        data,
        ...data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getMemberPass(req, res, next) {
    return this.getPass(req, res, next);
  },

  /**
   * GET /api/membership/all or /api/members
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
        members: data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAllMembers(req, res, next) {
    return this.getAll(req, res, next);
  },

  /**
   * GET /api/membership/expiring
   */
  async getExpiring(req, res, next) {
    try {
      const days = req.query.days ? parseInt(req.query.days, 10) : 30;
      const data = await membershipService.getExpiring(days);
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
        expiring: data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getExpiringMemberships(req, res, next) {
    return this.getExpiring(req, res, next);
  },

  /**
   * GET /api/membership/:userId/history or /api/membership/history
   * Retrieve full membership history for a user
   */
  async getHistory(req, res, next) {
    try {
      const authUser = getCurrentUser(req);
      const userId = req.params.userId || authUser?.id || authUser?.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(400).json({ error: 'USER_ID_REQUIRED', message: 'User ID is required' });
      }
      const data = await membershipService.getMembershipHistory(userId);
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
        history: data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getRenewalHistory(req, res, next) {
    return this.getHistory(req, res, next);
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
        ...data,
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
      const authUser = getCurrentUser(req);
      const userId =
        req.body?.user_id || authUser?.id || authUser?.userId || req.user?.id || req.user?.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(400).json({
          error: {
            message: 'user_id is required to create a membership',
            status: 400,
          },
        });
      }

      const { dues_amount, plan } = req.body || {};
      const data = await membershipService.createMembership(userId, { dues_amount, plan });

      return res.status(201).json({
        success: true,
        message: 'Membership initiated successfully',
        data,
        ...data,
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
      const { payment_mode = 'online', plan } = req.body || {};
      const result = await membershipService.payMembership(id, { payment_mode, plan });
      return res.status(200).json({
        success: true,
        message: 'Membership dues paid successfully. Membership is now active.',
        data: result.formatted,
        membership: result.formatted,
        transaction: result.transaction,
        ...result.formatted,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership/dues/pay & POST /api/membership/pay
   */
  async payDues(req, res, next) {
    try {
      const authUser = getCurrentUser(req);
      const userId =
        req.body?.user_id || authUser?.id || authUser?.userId || req.user?.id || req.user?.userId || req.headers['x-user-id'] || 1;
      const { payment_mode = 'online', plan } = req.body || {};
      const data = await membershipService.payDues(userId, payment_mode, plan);
      return res.status(200).json({
        success: true,
        message: 'Membership dues paid successfully. Membership is now active.',
        ...data,
        data: data.membership,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/membership/:id/cancel or POST /api/membership/cancel
   * Cancel an existing membership
   */
  async cancel(req, res, next) {
    try {
      const authUser = getCurrentUser(req);
      const targetId =
        req.params?.id || req.body?.id || req.body?.user_id || authUser?.id || authUser?.userId || req.user?.id || req.user?.userId;

      const reason = req.body?.reason || req.body?.cancellation_reason;
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({
          error: {
            message: 'Cancellation reason is required',
            status: 400,
          },
        });
      }

      const data = await membershipService.cancelMembership(targetId, reason.trim());
      return res.status(200).json({
        success: true,
        message: 'Membership cancelled successfully',
        ...data,
        data: data.membership,
      });
    } catch (err) {
      next(err);
    }
  },

  async cancelMembership(req, res, next) {
    return this.cancel(req, res, next);
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
        ...data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership/renew
   * Complete renewal and payment for authenticated user
   */
  async renewUser(req, res, next) {
    try {
      const authUser = getCurrentUser(req);
      const userId = req.body?.user_id || authUser?.id || authUser?.userId || req.user?.id || req.user?.userId;
      const { payment_mode = 'online' } = req.body || {};
      const data = await membershipService.renewUserMembership(userId, payment_mode);
      return res.status(200).json({
        success: true,
        message: 'Membership renewed successfully',
        ...data,
        data: data.membership,
      });
    } catch (err) {
      next(err);
    }
  },

  async renewMembership(req, res, next) {
    if (req.params?.id) {
      return this.renew(req, res, next);
    }
    return this.renewUser(req, res, next);
  },

  /**
   * GET /api/membership/verify/:memberCode
   */
  async verifyMemberCode(req, res, next) {
    try {
      const { memberCode } = req.params;
      const data = await membershipService.verifyMemberCode(memberCode);
      return res.status(200).json({
        success: true,
        ...data,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/membership/sync
   */
  async syncStatuses(req, res, next) {
    try {
      const data = await membershipService.syncStatuses();
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = membershipController;
