import api from './api';

/**
 * Fundraiser Service
 * Provides frontend API client methods for public fundraisers, checkout,
 * real payment confirmation, user donation history, and admin management.
 */
export const fundraiserService = {
  /**
   * Fetch public active/completed fundraisers with live real totals.
   */
  async getPublicFundraisers(params = {}) {
    const res = await api.get('/fundraisers', { params });
    return res.data;
  },

  /**
   * Fetch single campaign details by ID or slug.
   */
  async getFundraiser(idOrSlug) {
    const res = await api.get(`/fundraisers/${idOrSlug}`);
    return res.data;
  },

  /**
   * Initiate a pending donation checkout session (Guest or Logged in).
   */
  async checkoutDonation(fundraiserId, donationData) {
    const res = await api.post(`/fundraisers/${fundraiserId}/donations/checkout`, donationData);
    return res.data;
  },

  /**
   * Process and finalize payment for a pending donation.
   */
  async payDonation(donationId, paymentPayload = {}) {
    const res = await api.post(`/fundraisers/donations/${donationId}/pay`, paymentPayload);
    return res.data;
  },

  /**
   * Mark a donation payment as failed.
   */
  async failDonation(donationId, reason = '') {
    const res = await api.post(`/fundraisers/donations/${donationId}/fail`, { reason });
    return res.data;
  },

  /**
   * Retrieve single donation details / receipt.
   */
  async getDonation(donationId) {
    const res = await api.get(`/fundraisers/donations/${donationId}`);
    return res.data;
  },

  /**
   * Retrieve logged-in user's personal donation history.
   */
  async getUserDonations() {
    const res = await api.get('/fundraisers/donations/user/my');
    return res.data;
  },

  /**
   * Fetch all fundraisers for Admin/Treasurer view.
   */
  async getAdminFundraisers(params = {}) {
    const res = await api.get('/fundraisers/admin', { params });
    return res.data;
  },

  /**
   * Fetch aggregate financial stats for Admin dashboard.
   */
  async getGlobalStats() {
    const res = await api.get('/fundraisers/admin/stats');
    return res.data;
  },

  /**
   * Fetch paginated and filtered donation transactions for Admin audit.
   */
  async getAdminDonations(params = {}) {
    const res = await api.get('/fundraisers/donations/admin/list', { params });
    return res.data;
  },

  /**
   * Create a new fundraiser campaign (Admin/Treasurer only).
   */
  async createFundraiser(data) {
    const res = await api.post('/fundraisers', data);
    return res.data;
  },

  /**
   * Update an existing fundraiser campaign.
   */
  async updateFundraiser(id, data) {
    const res = await api.put(`/fundraisers/${id}`, data);
    return res.data;
  },

  /**
   * Change fundraiser campaign status.
   */
  async setStatus(id, status) {
    const res = await api.patch(`/fundraisers/${id}/status`, { status });
    return res.data;
  },

  /**
   * Issue a refund for a donation (Admin/Treasurer only).
   */
  async refundDonation(donationId, reason = '') {
    const res = await api.post(`/fundraisers/donations/${donationId}/refund`, { reason });
    return res.data;
  },
};

export default fundraiserService;
