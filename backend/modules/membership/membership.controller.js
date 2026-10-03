const membershipService = require('./membership.service');

/**
 * Membership Controller
 * Handles HTTP requests for memberships and passes.
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
      const members = await membershipService.getAllMembers();
      return res.status(200).json({ members });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }
}

module.exports = new MembershipController();
