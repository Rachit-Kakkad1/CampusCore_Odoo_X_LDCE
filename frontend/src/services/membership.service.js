// frontend/src/services/membership.service.js
import api from './api.js';

export const membershipService = {
  /**
   * Fetch current user's membership details and status.
   */
  async getMembership() {
    const res = await api.get('/membership/me');
    return res.data;
  },

  /**
   * Fetch all organization memberships (Admin)
   */
  async getAllMemberships(params = {}) {
    const res = await api.get('/membership/all', { params });
    return res.data;
  },

  /**
   * Fetch membership metrics overview (Admin)
   */
  async getDashboard() {
    const res = await api.get('/membership/dashboard');
    return res.data;
  },

  /**
   * Initiate new membership registration.
   */
  async createMembership(duesAmount = 500.00) {
    const res = await api.post('/membership', { dues_amount: duesAmount });
    return res.data;
  },

  /**
   * Process membership dues payment by user / endpoint.
   */
  async payDues(paymentMode = 'online') {
    const res = await api.post('/membership/dues/pay', { payment_mode: paymentMode });
    return res.data;
  },

  /**
   * Pay dues for a specific membership ID.
   */
  async payMembership(id, paymentMode = 'online') {
    const res = await api.post(`/membership/${id}/pay`, { payment_mode: paymentMode });
    return res.data;
  },

  /**
   * Renew an expired or cancelled membership.
   */
  async renewMembership(id, duesAmount = 500.00) {
    const res = await api.post(`/membership/${id}/renew`, { dues_amount: duesAmount });
    return res.data;
  },

  /**
   * Cancel an active membership.
   */
  async cancelMembership(id, reason) {
    const res = await api.patch(`/membership/${id}/cancel`, { reason });
    return res.data;
  },

  /**
   * Retrieve digital Member Pass data.
   */
  async getMemberPass() {
    const res = await api.get('/membership/pass');
    return res.data;
  },

  /**
   * Retrieve full membership history for current user.
   */
  async getHistory(userId) {
    const res = await api.get(`/membership/${userId}/history`);
    return res.data;
  }
};

export default membershipService;
