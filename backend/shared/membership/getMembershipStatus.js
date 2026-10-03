// backend/shared/membership/getMembershipStatus.js
const { query, pool } = require('../../config/database');

/**
 * Calculates non-negative days remaining from expiry_date.
 * Returns 0 if expired, missing, or negative.
 *
 * @param {Date|string|null} expiryDate
 * @returns {number}
 */
function calculateDaysRemaining(expiryDate) {
  if (!expiryDate) return 0;
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return 0;

  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return 0;

  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine dynamic expiry category based on remaining days.
 *
 * Categories:
 * - 'expired': membership has expired
 * - 'expiring_7_days' (critical): active with <= 7 days remaining
 * - 'expiring_30_days' (expiring soon): active with <= 30 days remaining
 * - 'normal': active with > 30 days or pending
 *
 * @param {boolean} isActive
 * @param {number} daysRemaining
 * @param {string} status
 * @returns {string}
 */
function determineExpiryCategory(isActive, daysRemaining, status) {
  if (!isActive) {
    return status === 'expired' ? 'expired' : 'normal';
  }
  if (daysRemaining <= 7) return 'expiring_7_days';
  if (daysRemaining <= 30) return 'expiring_30_days';
  return 'normal';
}

/**
 * Derives normalized status (ACTIVE, EXPIRED, PENDING, NONE)
 */
function computeStatus(row) {
  if (!row) return 'NONE';
  if (row.dues_status === 'pending' || !row.expiry_date) {
    return 'PENDING';
  }
  const expiry = new Date(row.expiry_date);
  if (expiry > new Date()) {
    return 'ACTIVE';
  }
  return 'EXPIRED';
}

/**
 * Shared Membership Helper: getMembershipStatus
 * Centralized membership status engine.
 *
 * @param {number|string} userId
 * @param {Object} [client] - Optional DB client
 * @returns {Promise<Object>}
 */
async function getMembershipStatus(userId, client = null) {
  const numId = parseInt(userId, 10);
  if (!numId || isNaN(numId) || numId <= 0) {
    return {
      status: 'NONE',
      dues_status: 'NONE',
      started_at: null,
      expiry_date: null,
      days_remaining: 0,
      is_active: false,
      membership: null,
    };
  }

  const sql = `
    SELECT *
    FROM memberships
    WHERE user_id = $1
    ORDER BY
      CASE
        WHEN dues_status = 'paid' AND (expiry_date IS NULL OR expiry_date > NOW()) THEN 1
        WHEN dues_status = 'pending' THEN 2
        ELSE 3
      END, created_at DESC, id DESC
    LIMIT 1;
  `;

  const res = client ? await client.query(sql, [numId]) : await query(sql, [numId]);
  const row = res.rows ? res.rows[0] : null;

  if (!row) {
    return {
      status: 'NONE',
      dues_status: 'NONE',
      started_at: null,
      expiry_date: null,
      days_remaining: 0,
      is_active: false,
      membership: null,
    };
  }

  const status = computeStatus(row);
  const daysRemaining = calculateDaysRemaining(row.expiry_date);
  const isCurrentlyActive = status === 'ACTIVE';

  const formattedMembership = {
    id: row.id,
    user_id: row.user_id,
    member_code: row.member_code,
    status: status.toLowerCase(),
    computed_status: status,
    dues_status: row.dues_status,
    dues_amount: row.dues_amount,
    started_at: row.started_at || row.start_date,
    start_date: row.started_at || row.start_date,
    expiry_date: row.expiry_date,
    paid_at: row.paid_at || row.payment_timestamp,
    payment_timestamp: row.paid_at || row.payment_timestamp,
    created_at: row.created_at,
    updated_at: row.updated_at,
    days_remaining: daysRemaining,
    daysRemaining,
    is_active: isCurrentlyActive,
    isActive: isCurrentlyActive,
  };

  const expiryCategory = determineExpiryCategory(isCurrentlyActive, daysRemaining, row.status);

  return {
    status,
    dues_status: row.dues_status ? row.dues_status.toUpperCase() : 'PENDING',
    started_at: row.started_at || row.start_date,
    start_date: row.started_at || row.start_date,
    startedAt: row.started_at || row.start_date,
    expiry_date: row.expiry_date,
    expiryDate: row.expiry_date,
    days_remaining: daysRemaining,
    daysRemaining,
    is_active: isCurrentlyActive,
    isActive: isCurrentlyActive,
    expiryCategory,
    membership: formattedMembership,
  };
}

module.exports = {
  getMembershipStatus,
  calculateDaysRemaining,
  determineExpiryCategory,
  computeStatus,
};
