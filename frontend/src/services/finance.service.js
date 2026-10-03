// frontend/src/services/finance.service.js
import api from './api.js';

export const financeService = {
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
   * Get financial summary metrics & telemetry
   */
  async getOverview() {
    const res = await api.get('/finance/overview');
    return res.data;
  },

  /**
   * Get paginated transactions
   */
  async getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/finance/transactions?${query}`);
    return res.data;
  },

  /**
   * Get expense claims
   */
  async getExpenses() {
    const res = await api.get('/finance/expenses');
    return res.data;
  },

  /**
   * Create an expense claim
   */
  async createExpense(data) {
    const res = await api.post('/finance/expenses', data);
    return res.data;
  },

  /**
   * Approve or reject an expense claim
   */
  async approveExpense(id, status = 'approved') {
    const res = await api.patch(`/finance/expenses/${id}/approve`, { status });
    return res.data;
  }
};

export default financeService;
