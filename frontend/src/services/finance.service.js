// frontend/src/services/finance.service.js
import api from './api.js';

export const financeService = {
  /**
   * Get financial summary metrics (income, expenses, balance, dues, pending count)
   */
  async getOverview() {
    const res = await api.get('/finance/overview');
    return res.data;
  },

  /**
   * Fetch immutable financial transaction ledger
   */
  async getTransactions(params = {}) {
    const res = await api.get('/finance/transactions', { params });
    return res.data;
  },

  /**
   * Fetch members with pending dues (who still owes)
   */
  async getOwing() {
    const res = await api.get('/finance/owing');
    return res.data;
  },

  /**
   * Fetch all expenses
   */
  async getExpenses(params = {}) {
    const res = await api.get('/finance/expenses', { params });
    return res.data;
  },

  /**
   * Fetch single expense by ID
   */
  async getExpenseById(id) {
    const res = await api.get(`/finance/expenses/${id}`);
    return res.data;
  },

  /**
   * Submit a new expense
   */
  async createExpense(data) {
    const res = await api.post('/finance/expenses', data);
    return res.data;
  },

  /**
   * Approve an expense (Treasurer / Admin)
   */
  async approveExpense(id, status = 'approved') {
    // Supports both endpoint conventions
    try {
      const res = await api.post(`/finance/expenses/${id}/approve`);
      return res.data;
    } catch {
      const res = await api.patch(`/finance/expenses/${id}/approve`, { status });
      return res.data;
    }
  },

  /**
   * Reject an expense (Treasurer / Admin)
   */
  async rejectExpense(id) {
    const res = await api.post(`/finance/expenses/${id}/reject`);
    return res.data;
  },

  /**
   * Reimburse an expense (Treasurer / Admin)
   * Creates an outgoing transaction in the financial ledger
   */
  async reimburseExpense(id, payment_mode = 'online') {
    const res = await api.post(`/finance/expenses/${id}/reimburse`, { payment_mode });
    return res.data;
  },

  /**
   * Fetch all organization fundraisers
   */
  async getFundraisers() {
    const res = await api.get('/finance/fundraisers');
    return res.data;
  },

  /**
   * Create a new fundraiser (Admin / Treasurer)
   */
  async createFundraiser(data) {
    const res = await api.post('/finance/fundraisers', data);
    return res.data;
  },

  /**
   * Record fundraiser income batch (Admin / Treasurer)
   * Creates an incoming transaction in the financial ledger
   */
  async addFundraiserIncome(id, data) {
    const res = await api.post(`/finance/fundraisers/${id}/income`, data);
    return res.data;
  }
};

export default financeService;
