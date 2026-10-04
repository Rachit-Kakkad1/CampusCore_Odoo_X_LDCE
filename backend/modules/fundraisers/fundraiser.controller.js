const fundraiserService = require('./fundraiser.service');
const donationService = require('./donation.service');

/**
 * Fundraiser Controller
 * Handles HTTP requests for campaigns, donations, payments, and refunds.
 */
class FundraiserController {
  /**
   * GET /fundraisers & GET /api/fundraisers
   * Lists public campaigns with real aggregated statistics.
   */
  async getPublicFundraisers(req, res) {
    try {
      const { status, search } = req.query;
      const fundraisers = await fundraiserService.getPublicFundraisers({ status, search });
      res.status(200).json({ success: true, count: fundraisers.length, data: fundraisers });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * GET /fundraisers/admin & GET /api/fundraisers/admin
   * Lists all campaigns for admin/treasurer view.
   */
  async getAdminFundraisers(req, res) {
    try {
      const { status, search } = req.query;
      const fundraisers = await fundraiserService.getAdminFundraisers({ status, search });
      res.status(200).json({ success: true, count: fundraisers.length, data: fundraisers });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * GET /fundraisers/:id & GET /api/fundraisers/:id
   * Retrieves single campaign with live financial progress.
   */
  async getFundraiserDetails(req, res) {
    try {
      const { id } = req.params;
      const fundraiser = await fundraiserService.getFundraiserDetails(id, req.user);
      res.status(200).json({ success: true, data: fundraiser });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * POST /fundraisers & POST /api/fundraisers
   * Creates a new campaign (Admin/Treasurer only).
   */
  async createFundraiser(req, res) {
    try {
      const created = await fundraiserService.createFundraiser(req.body, req.user, req);
      res.status(201).json({ success: true, data: created });
    } catch (err) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message },
      });
    }
  }

  /**
   * PUT /fundraisers/:id & PUT /api/fundraisers/:id
   * Updates an existing campaign.
   */
  async updateFundraiser(req, res) {
    try {
      const { id } = req.params;
      const updated = await fundraiserService.updateFundraiser(id, req.body, req.user, req);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message },
      });
    }
  }

  /**
   * PATCH /fundraisers/:id/status & PATCH /api/fundraisers/:id/status
   * Changes status (publish, pause, complete, cancel).
   */
  async setStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await fundraiserService.setStatus(id, status, req.user, req);
      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message },
      });
    }
  }

  /**
   * GET /fundraisers/admin/stats
   * Retrieves high-level financial dashboard statistics.
   */
  async getGlobalStats(req, res) {
    try {
      const stats = await fundraiserService.getGlobalOverview();
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * POST /fundraisers/:id/donations/checkout
   * Initiates donation session (Guest or Authenticated).
   */
  async checkoutDonation(req, res) {
    try {
      const { id } = req.params;
      const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key || null;
      const userId = req.user ? req.user.id : null;

      const donation = await donationService.checkoutDonation(id, req.body, userId, idempotencyKey, req);
      res.status(201).json({ success: true, data: donation });
    } catch (err) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message },
      });
    }
  }

  /**
   * POST /fundraisers/donations/:id/pay
   * Executes atomic payment, marks donation paid, increments ledger.
   */
  async payDonation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? req.user.id : null;

      const donation = await donationService.payDonation(id, req.body, userId, req);
      res.status(200).json({ success: true, data: donation });
    } catch (err) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'PAYMENT_FAILED', message: err.message },
      });
    }
  }

  /**
   * POST /fundraisers/donations/:id/fail
   * Marks donation payment as failed.
   */
  async failDonation(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const donation = await donationService.failDonation(id, reason, req);
      res.status(200).json({ success: true, data: donation });
    } catch (err) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'ERROR', message: err.message },
      });
    }
  }

  /**
   * GET /fundraisers/donations/:id
   * Retrieves single donation details for confirmation / receipt.
   */
  async getDonationDetails(req, res) {
    try {
      const { id } = req.params;
      const donation = await donationService.getDonationDetails(id, req.user);
      res.status(200).json({ success: true, data: donation });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: { code: err.code || 'NOT_FOUND', message: err.message },
      });
    }
  }

  /**
   * GET /fundraisers/donations/user/my
   * Retrieves current logged-in user's personal donation history.
   */
  async getUserDonations(req, res) {
    try {
      const donations = await donationService.getUserDonations(req.user.id);
      res.status(200).json({ success: true, count: donations.length, data: donations });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * GET /fundraisers/donations/admin/list
   * Retrieves paginated admin donation records.
   */
  async getAdminDonations(req, res) {
    try {
      const { fundraiserId, status, search, limit, offset } = req.query;
      const result = await donationService.getAdminDonations({
        fundraiserId: fundraiserId ? parseInt(fundraiserId, 10) : null,
        status,
        search,
        limit: limit ? parseInt(limit, 10) : 25,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      res.status(err.status || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
      });
    }
  }

  /**
   * POST /fundraisers/donations/:id/refund
   * Refunds a donation (Admin / Treasurer only).
   */
  async refundDonation(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const refunded = await donationService.refundDonation(id, reason, req.user, req);
      res.status(200).json({ success: true, data: refunded });
    } catch (err) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'REFUND_FAILED', message: err.message },
      });
    }
  }

  /**
   * POST /fundraisers/donations/webhook
   * Webhook endpoint for payment providers.
   */
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['x-razorpay-signature'] || req.headers['stripe-signature'] || null;
      const result = await donationService.handleWebhook(req.body, signature, req);
      res.status(200).json({ success: true, result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new FundraiserController();
