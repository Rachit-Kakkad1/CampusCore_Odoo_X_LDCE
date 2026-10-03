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
  }
};

module.exports = financeController;
