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
      const { limit, offset, source_type, direction } = req.query;
      const data = await financeService.getTransactions({
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0,
        source_type,
        direction
      });
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
      const submitted_by = req.user?.userId || 1;
      const data = await financeService.createExpense({
        submitted_by,
        amount,
        description,
        receipt_url
      });
      return res.status(201).json({
        success: true,
        message: 'Expense submitted successfully for treasurer approval',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async approveExpense(req, res, next) {
    try {
      const { id } = req.params;
      const approverId = req.user?.userId || 1;
      const data = await financeService.approveExpense(id, approverId);
      return res.status(200).json({
        success: true,
        message: 'Expense approved successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  },

  async rejectExpense(req, res, next) {
    try {
      const { id } = req.params;
      const approverId = req.user?.userId || 1;
      const data = await financeService.rejectExpense(id, approverId);
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
      const reimburserId = req.user?.userId || 1;
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
