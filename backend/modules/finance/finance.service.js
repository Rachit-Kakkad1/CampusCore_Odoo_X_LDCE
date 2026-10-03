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
  }
};

module.exports = financeService;
