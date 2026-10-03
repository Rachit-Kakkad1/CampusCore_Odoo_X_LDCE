// backend/modules/finance/finance.service.js
const financeRepository = require('./finance.repository');

const financeService = {
  async getFundraisers() {
    return await financeRepository.getAllFundraisers();
  },

  async createFundraiser(data) {
    if (!data.title) {
      const err = new Error('Fundraiser title is required');
      err.status = 400;
      throw err;
    }
    return await financeRepository.createFundraiser(data);
  },

  async addFundraiserIncome({ fundraiser_id, amount, note, recorded_by, payment_mode }) {
    if (!fundraiser_id || !amount || Number(amount) <= 0) {
      const err = new Error('Valid fundraiser ID and positive amount are required');
      err.status = 400;
      throw err;
    }
    return await financeRepository.addFundraiserIncome({
      fundraiser_id,
      amount,
      note,
      recorded_by,
      payment_mode
    });
  },

  async getOverview() {
    return await financeRepository.getOverview();
  },

  async getTransactions(query = {}) {
    return await financeRepository.getAllTransactions(query);
  },

  async getOwingMembers() {
    return await financeRepository.getOwingMembers();
  },

  async getExpenses(query = {}) {
    return await financeRepository.getAllExpenses(query);
  },

  async getExpenseById(id) {
    const expense = await financeRepository.getExpenseById(id);
    if (!expense) {
      const err = new Error('Expense not found');
      err.status = 404;
      throw err;
    }
    return expense;
  },

  async createExpense(data) {
    if (!data.amount || Number(data.amount) <= 0) {
      const err = new Error('A valid positive expense amount is required');
      err.status = 400;
      throw err;
    }
    if (!data.description) {
      const err = new Error('Expense description is required');
      err.status = 400;
      throw err;
    }
    return await financeRepository.createExpense(data);
  },

  async updateExpenseStatus(id, { status, approved_by }) {
    if (!['approved', 'rejected'].includes(status)) {
      const err = new Error('Invalid status. Must be approved or rejected.');
      err.status = 400;
      throw err;
    }
    const expense = await financeRepository.getExpenseById(id);
    if (!expense) {
      const err = new Error('Expense not found');
      err.status = 404;
      throw err;
    }
    if (expense.status === 'reimbursed') {
      const err = new Error('Expense is already reimbursed');
      err.status = 400;
      throw err;
    }
    return await financeRepository.updateExpenseStatus(id, { status, approved_by });
  },

  async approveExpense(id, approverId) {
    return await this.updateExpenseStatus(id, { status: 'approved', approved_by: approverId });
  },

  async rejectExpense(id, approverId) {
    return await this.updateExpenseStatus(id, { status: 'rejected', approved_by: approverId });
  },

  async reimburseExpense(id, reimburserId, paymentMode) {
    const expense = await financeRepository.getExpenseById(id);
    if (!expense) {
      const err = new Error('Expense not found');
      err.status = 404;
      throw err;
    }
    return await financeRepository.reimburseExpense(id, reimburserId, paymentMode);
  }
};

module.exports = financeService;
