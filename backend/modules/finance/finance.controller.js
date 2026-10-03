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

  async addFundraiserIncome(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, note, payment_mode } = req.body;
      const recorded_by = req.user?.userId || 1;
      const result = await financeService.addFundraiserIncome({
        fundraiser_id: id,
        amount,
        note,
        recorded_by,
        payment_mode: payment_mode || 'cash'
      });
      return res.status(201).json({
        success: true,
        message: 'Fundraiser income recorded successfully in ledger',
        data: result,
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
      const limit = parseInt(req.query.limit, 10) || 100;
      const offset = parseInt(req.query.offset, 10) || 0;
      const sourceType = req.query.source_type || req.query.sourceType || 'all';
      const direction = req.query.direction;

      const data = await financeService.getTransactions({ limit, offset, sourceType, direction });
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getOwing(req, res, next) {
    try {
      const data = await financeService.getOwingMembers();
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
      const { status } = req.query;
      const data = await financeService.getExpenses({ status });
      return res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async getExpenseById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await financeService.getExpenseById(id);
      return res.status(200).json({
        success: true,
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
      const status = req.body.status || 'approved';
      const approverId = req.user?.userId || req.user?.id || 1;

      const data = await financeService.updateExpenseStatus(id, {
        status,
        approved_by: approverId,
      });

      return res.status(200).json({
        success: true,
        message: `Expense ${status} successfully`,
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async rejectExpense(req, res, next) {
    try {
      const { id } = req.params;
      const approverId = req.user?.userId || req.user?.id || 1;
      const data = await financeService.updateExpenseStatus(id, {
        status: 'rejected',
        approved_by: approverId,
      });
      return res.status(200).json({
        success: true,
        message: 'Expense rejected',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async reimburseExpense(req, res, next) {
    try {
      const { id } = req.params;
      const { payment_mode } = req.body;
      const reimburserId = req.user?.userId || req.user?.id || 1;
      const data = await financeService.reimburseExpense(id, reimburserId, payment_mode);
      return res.status(200).json({
        success: true,
        message: 'Expense reimbursed and ledger transaction recorded',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = financeController;
