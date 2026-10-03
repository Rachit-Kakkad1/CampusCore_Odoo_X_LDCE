// backend/shared/membership/getMembershipStatus.js
const { query } = require('../../db/connection');

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
 * Shared Membership Helper: getMembershipStatus
 * Retrieves current membership status and derived metrics for a user.
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
        WHEN status = 'active' THEN 1
        WHEN status = 'pending' THEN 2
        WHEN status = 'expired' THEN 3
        WHEN status = 'cancelled' THEN 4
        ELSE 5
      END,
      created_at DESC, id DESC
    LIMIT 1;
  `;

  const res = client ? await client.query(sql, [numId]) : await query(sql, [numId]);
  const row = res.rows[0];

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

  const daysRemaining = calculateDaysRemaining(row.expiry_date);
  const isCurrentlyActive =
    row.status === 'active' &&
    row.dues_status === 'paid' &&
    row.expiry_date &&
    new Date(row.expiry_date) > new Date();

  return {
    status: row.status.toUpperCase(),
    dues_status: row.dues_status.toUpperCase(),
    started_at: row.started_at,
    expiry_date: row.expiry_date,
    days_remaining: daysRemaining,
    is_active: isCurrentlyActive,
    membership: {
      id: row.id,
      user_id: row.user_id,
      member_code: row.member_code,
      status: row.status,
      dues_status: row.dues_status,
      dues_amount: row.dues_amount,
      started_at: row.started_at,
      expiry_date: row.expiry_date,
      cancelled_at: row.cancelled_at,
      cancellation_reason: row.cancellation_reason,
      payment_timestamp: row.payment_timestamp,
      renewed_from_membership_id: row.renewed_from_membership_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      days_remaining: daysRemaining,
      is_active: isCurrentlyActive,
    },
  };
}

module.exports = {
  getMembershipStatus,
  calculateDaysRemaining,
};
