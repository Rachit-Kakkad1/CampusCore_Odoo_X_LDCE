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
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      if (hasPagination) {
        const { page, pageSize, offset, sort, sortDirection } = parsePaginationParams(req.query, {
          defaultPageSize: 12,
          maxPageSize: 100,
          allowedSortFields: ['created_at', 'goal_amount', 'title', 'end_at'],
          defaultSort: 'created_at',
          defaultSortDirection: 'DESC',
        });

        const result = await fundraiserService.getPublicFundraisers({
          status,
          search,
          page,
          pageSize,
          limit: pageSize,
          offset,
          sort,
          sortDirection,
        });

        const rows = result.rows || [];
        const totalItems = result.totalItems || 0;
        const responsePayload = buildPaginationResponse(rows, totalItems, page, pageSize);

        return res.status(200).json({
          ...responsePayload,
          fundraisers: rows,
        });
      }

      const fundraisers = await fundraiserService.getPublicFundraisers({ status, search });
      const list = Array.isArray(fundraisers) ? fundraisers : (fundraisers.rows || []);
      res.status(200).json({
        success: true,
        count: list.length,
        data: list,
        fundraisers: list,
      });
    } catch (err) {
      const statusCode = err.status || 500;
      res.status(statusCode).json({
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
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      if (hasPagination) {
        const { page, pageSize, offset, sort, sortDirection } = parsePaginationParams(req.query, {
          defaultPageSize: 20,
          maxPageSize: 100,
          allowedSortFields: ['created_at', 'goal_amount', 'title', 'end_at'],
          defaultSort: 'created_at',
          defaultSortDirection: 'DESC',
        });

        const result = await fundraiserService.getAdminFundraisers({
          status,
          search,
          page,
          pageSize,
          limit: pageSize,
          offset,
          sort,
          sortDirection,
        });

        const rows = result.rows || [];
        const totalItems = result.totalItems || 0;
        const responsePayload = buildPaginationResponse(rows, totalItems, page, pageSize);

        return res.status(200).json({
          ...responsePayload,
          fundraisers: rows,
        });
      }

      const fundraisers = await fundraiserService.getAdminFundraisers({ status, search });
      const list = Array.isArray(fundraisers) ? fundraisers : (fundraisers.rows || []);
      res.status(200).json({
        success: true,
        count: list.length,
        data: list,
        fundraisers: list,
      });
    } catch (err) {
      const statusCode = err.status || 500;
      res.status(statusCode).json({
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
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      const donations = await donationService.getUserDonations(req.user.id);
      const list = Array.isArray(donations) ? donations : (donations.rows || []);

      if (hasPagination) {
        const { page, pageSize, offset } = parsePaginationParams(req.query, {
          defaultPageSize: 10,
          maxPageSize: 100,
        });

        const pagedData = list.slice(offset, offset + pageSize);
        const responsePayload = buildPaginationResponse(pagedData, list.length, page, pageSize);
        return res.status(200).json({
          ...responsePayload,
          donations: pagedData,
        });
      }

      res.status(200).json({
        success: true,
        count: list.length,
        data: list,
        donations: list,
      });
    } catch (err) {
      const statusCode = err.status || 500;
      res.status(statusCode).json({
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
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const { fundraiserId, status, search } = req.query;

      const { page, pageSize, offset } = parsePaginationParams(req.query, {
        defaultPageSize: 25,
        maxPageSize: 100,
      });

      const result = await donationService.getAdminDonations({
        fundraiserId: fundraiserId ? parseInt(fundraiserId, 10) : null,
        status,
        search,
        limit: pageSize,
        offset,
      });

      const dataRows = result.data || [];
      const totalCount = result.total || 0;
      const paginationResponse = buildPaginationResponse(dataRows, totalCount, page, pageSize);

      res.status(200).json({
        ...paginationResponse,
        ...result, // keep total, limit, offset for backwards compatibility
        data: dataRows,
        donations: dataRows,
      });
    } catch (err) {
      const statusCode = err.status || 500;
      res.status(statusCode).json({
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
