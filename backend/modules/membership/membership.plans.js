// backend/modules/membership/membership.plans.js

/**
 * Official Membership Plans Configuration
 * Source of truth for membership pricing, durations, intervals, and benefits.
 */
const MEMBERSHIP_PLANS = {
  '1_month': {
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
  '6_months': {
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
  '12_months': {
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
};

/**
 * Resolves a plan key ('1_month', '6_months', '12_months') into plan metadata.
 * Case-insensitive, hyphen-tolerant ('1-month' -> '1_month').
 * Defaults to '12_months' if empty.
 * Throws 400 INVALID_MEMBERSHIP_PLAN if unrecognized.
 */
function resolvePlan(planKey) {
  if (!planKey) {
    return MEMBERSHIP_PLANS['12_months'];
  }
  const normalizedKey = String(planKey).toLowerCase().trim().replace(/-/g, '_');
  const plan = MEMBERSHIP_PLANS[normalizedKey];
  if (!plan) {
    const err = new Error(`Invalid membership plan: "${planKey}". Allowed plans: 1_month, 6_months, 12_months`);
    err.status = 400;
    err.code = 'INVALID_MEMBERSHIP_PLAN';
    throw err;
  }
  return plan;
}

module.exports = {
  MEMBERSHIP_PLANS,
  resolvePlan,
};
