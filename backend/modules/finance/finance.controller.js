// backend/modules/finance/finance.controller.js
const financeService = require('./finance.service');

const financeController = {
  async getFundraisers(req, res, next) {
    try {
      const data = await financeService.getFundraisers();
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async createFundraiser(req, res, next) {
    try {
      const { title, description } = req.body;
      const createdBy = req.user?.userId || req.body.created_by || 1;
      const data = await financeService.createFundraiser({
        title,
        description,
        created_by: createdBy,
      });
      return res.status(201).json({
        success: true,
        message: 'Fundraiser created successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getOverview(req, res, next) {
    try {
      const data = await financeService.getOverview();
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getTransactions(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const sourceType = req.query.source_type || req.query.sourceType || 'all';

      const data = await financeService.getTransactions({ limit, offset, sourceType });
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getExpenses(req, res, next) {
    try {
      const data = await financeService.getExpenses();
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async createExpense(req, res, next) {
    try {
      const { amount, description, receipt_url } = req.body;
      const submittedBy = req.user?.userId || req.user?.id || 1;

      const data = await financeService.createExpense({
        submitted_by: submittedBy,
        amount,
        description,
        receipt_url: receipt_url || null,
      });

      return res.status(201).json({
        success: true,
        message: 'Expense submitted successfully for review',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async approveExpense(req, res, next) {
    try {
      const { id } = req.params;
      const { status = 'approved' } = req.body;
      const approvedBy = req.user?.userId || req.user?.id || 1;

      const data = await financeService.updateExpenseStatus(id, {
        status,
        approved_by: approvedBy,
      });

      return res.status(200).json({
        success: true,
        message: `Expense ${status} successfully`,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = financeController;
