const membershipService = require('./membership.service');

/**
 * Membership Controller
 * Handles HTTP requests for memberships, lifecycle transitions, passes, and admin dashboards.
 */
class MembershipController {
  async getMyMembership(req, res) {
    try {
      const result = await membershipService.getMyMembership(req.user.id);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async payDues(req, res) {
    try {
      const paymentMode = req.body.payment_mode || 'online';
      const result = await membershipService.payDues(req.user.id, paymentMode);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async cancelMembership(req, res) {
    try {
      const reason = req.body.cancellation_reason || req.body.reason || 'Member requested cancellation';
      // If admin specified a target user_id in params or body, allow admin cancellation, else default to req.user.id
      const targetUserId = (req.user.role === 'admin' && (req.body.user_id || req.params.userId))
        ? (req.body.user_id || req.params.userId)
        : req.user.id;
      const result = await membershipService.cancelMembership(targetUserId, reason);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async renewMembership(req, res) {
    try {
      const paymentMode = req.body.payment_mode || 'online';
      const targetUserId = (req.user.role === 'admin' && (req.body.user_id || req.params.userId))
        ? (req.body.user_id || req.params.userId)
        : req.user.id;
      const result = await membershipService.renewMembership(targetUserId, paymentMode);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getMemberPass(req, res) {
    try {
      const pass = await membershipService.getMemberPass(req.user.id);
      return res.status(200).json({ pass });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async verifyMemberCode(req, res) {
    try {
      const result = await membershipService.verifyMemberCode(req.params.memberCode);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getExpiryDashboard(req, res) {
    try {
      const dashboard = await membershipService.getExpiryDashboard();
      return res.status(200).json({ dashboard });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getExpiringMemberships(req, res) {
    try {
      const expiring = await membershipService.getExpiringMemberships();
      return res.status(200).json({ expiring });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAllMembers(req, res) {
    try {
      const filters = {
        status: req.query.status || null,
        search: req.query.search || null,
      };
      const members = await membershipService.getAllMembers(filters);
      return res.status(200).json({ members });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getRenewalHistory(req, res) {
    try {
      const targetUserId = req.params.userId || req.user.id;
      const history = await membershipService.getRenewalHistory(targetUserId);
      return res.status(200).json({ history });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async syncStatuses(req, res) {
    try {
      const result = await membershipService.syncStatuses();
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }
}

module.exports = new MembershipController();
