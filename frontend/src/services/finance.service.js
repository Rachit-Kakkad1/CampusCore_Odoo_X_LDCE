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
   * Get financial summary metrics
   */
  async getOverview() {
    const res = await api.get('/finance/overview');
    return res.data;
  }
};

export default financeService;
