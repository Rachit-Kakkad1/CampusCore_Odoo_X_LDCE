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
   * Initiate new membership registration.
   */
  async createMembership() {
    const res = await api.post('/membership', {});
    return res.data;
  },

  /**
   * Process membership dues payment (MVP mock flow).
   */
  async payDues(paymentMode = 'online') {
    const res = await api.post('/membership/dues/pay', { payment_mode: paymentMode });
    return res.data;
  },

  /**
   * Retrieve digital Member Pass data.
   */
  async getMemberPass() {
    const res = await api.get('/membership/pass');
    return res.data;
  }
};

export default membershipService;
