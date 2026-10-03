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

  async getOverview() {
    return await financeRepository.getOverview();
  },

  async getTransactions(options = {}) {
    return await financeRepository.getAllTransactions(options);
  },

  async getExpenses() {
    return await financeRepository.getAllExpenses();
  },

  async createExpense(data) {
    if (!data.amount || Number(data.amount) <= 0) {
      const err = new Error('Expense amount must be greater than zero');
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
    return await financeRepository.updateExpenseStatus(id, { status, approved_by });
  }
};

module.exports = financeService;
