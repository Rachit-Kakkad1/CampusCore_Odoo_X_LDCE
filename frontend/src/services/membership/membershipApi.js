// frontend/src/services/membership/membershipApi.js
import api from '../api.js';

export const fallbackPlans = [
  {
    id: '1_month',
    name: '1 Month Membership',
    duration_months: 1,
    duration_label: '1 month',
    interval: '1 month',
    price: 99.00,
    benefits: [
      'Access to member-only benefits',
      'Member pricing on eligible events',
      'Member pricing on merchandise',
      'Membership badge/status',
      'Access to member announcements/offers',
    ],
  },
  {
    id: '6_months',
    name: '6 Month Membership',
    duration_months: 6,
    duration_label: '6 months',
    interval: '6 months',
    price: 499.00,
    benefits: [
      'Everything in 1 Month',
      'Member pricing on eligible events',
      'Member pricing on merchandise',
      'Membership remains active for 6 months',
      'Better value than monthly membership',
    ],
  },
  {
    id: '12_months',
    name: '12 Month Membership',
    duration_months: 12,
    duration_label: '12 months',
    interval: '12 months',
    price: 899.00,
    benefits: [
      'Everything in 6 Months',
      'Member pricing on eligible events',
      'Member pricing on merchandise',
      'Full-year membership',
      'Best long-term value',
    ],
  },
];

export const membershipApi = {
  /**
   * Fetch official membership plans from the backend source of truth.
   */
  async getPlans() {
    try {
      const res = await api.get('/membership/plans');
      if (res.data?.plans && Array.isArray(res.data.plans) && res.data.plans.length > 0) {
        return res.data.plans;
      }
      return fallbackPlans;
    } catch {
      return fallbackPlans;
    }
  },

  /**
   * Fetch current authenticated user's membership details.
   */
  async getMembership() {
    const res = await api.get('/membership/me');
    return res.data;
  },

  /**
   * Complete membership checkout with chosen plan and personal info.
   * Backend remains source of truth for duration, price, and dynamic PostgreSQL expiry.
   */
  async checkout({ plan = '12_months', payment_mode = 'online', name, email, mobile }) {
    const res = await api.post('/membership/checkout', {
      plan,
      payment_mode,
      name,
      email,
      mobile,
    });
    return res.data;
  },

  /**
   * Process renewal or direct dues payment.
   */
  async payDues(paymentMode = 'online', plan = null) {
    const res = await api.post('/membership/dues/pay', {
      payment_mode: paymentMode,
      plan,
    });
    return res.data;
  },
};

export default membershipApi;
