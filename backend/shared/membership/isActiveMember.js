const { pool } = require('../../config/database');

/**
 * Checks whether a given user is currently an active member.
 * Per specification:
 *   The ONLY condition for true is:
 *     status = 'active'
 *     AND dues_status = 'paid'
 *     AND expiry_date > NOW()
 *
 * Cancelled members must return false.
 * Expired members must return false.
 * Pending members must return false.
 * Unpaid members must return false.
 *
 * @param {number} userId - The user ID to check
 * @param {object} [client] - Optional pg client for use within a transaction
 * @returns {Promise<boolean>}
 */
async function isActiveMember(userId, client = pool) {
  if (!userId) return false;

  const queryText = `
    SELECT (
      status = 'active'
      AND dues_status = 'paid'
      AND expiry_date > NOW()
    ) AS is_active
    FROM memberships
    WHERE user_id = $1
    ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'expired' THEN 3
        WHEN 'cancelled' THEN 4
        ELSE 5
      END, id DESC
    LIMIT 1;
  `;

  const result = await client.query(queryText, [userId]);
  if (result.rows.length === 0) {
    return false;
  }

  return Boolean(result.rows[0].is_active);
}

/**
 * Retrieves the full membership status and timeline info for a user.
 * Possible statuses: 'ACTIVE', 'EXPIRED', 'PENDING', 'CANCELLED', 'NONE'.
 *
 * Returns:
 * {
 *   status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'CANCELLED' | 'NONE',
 *   started_at: Date | string | null,
 *   expiry_date: Date | string | null,
 *   days_remaining: number,
 *   is_active: boolean,
 *   membership: object | null
 * }
 *
 * @param {number} userId
 * @param {object} [client]
 */
async function getMembershipStatus(userId, client = pool) {
  if (!userId) {
    return {
      status: 'NONE',
      started_at: null,
      expiry_date: null,
      days_remaining: 0,
      is_active: false,
      membership: null,
    };
  }

  const queryText = `
    SELECT id, user_id, member_code, status, dues_status, dues_amount,
           started_at, expiry_date, cancelled_at, cancellation_reason,
           payment_timestamp, renewed_from_membership_id, created_at, updated_at
    FROM memberships
    WHERE user_id = $1
    ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'expired' THEN 3
        WHEN 'cancelled' THEN 4
        ELSE 5
      END, id DESC
    LIMIT 1;
  `;

  const result = await client.query(queryText, [userId]);
  if (result.rows.length === 0) {
    return {
      status: 'NONE',
      started_at: null,
      expiry_date: null,
      days_remaining: 0,
      is_active: false,
      membership: null,
    };
  }

  const row = result.rows[0];
  const now = new Date();
  const hasExpiry = row.expiry_date ? new Date(row.expiry_date) : null;
  const isPastExpiry = hasExpiry ? hasExpiry.getTime() <= now.getTime() : false;

  let computedStatus = (row.status || 'pending').toUpperCase();

  // If status in db was active but expiry_date has passed, business rule marks it expired
  if (computedStatus === 'ACTIVE' && isPastExpiry) {
    computedStatus = 'EXPIRED';
  }

  const isActuallyActive =
    computedStatus === 'ACTIVE' &&
    row.dues_status === 'paid' &&
    hasExpiry &&
    hasExpiry.getTime() > now.getTime();

  let daysRemaining = 0;
  if (isActuallyActive && hasExpiry) {
    const diffMs = hasExpiry.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    status: computedStatus,
    started_at: row.started_at,
    expiry_date: row.expiry_date,
    days_remaining: daysRemaining,
    is_active: Boolean(isActuallyActive),
    membership: row,
  };
}

isActiveMember.isActiveMember = isActiveMember;
isActiveMember.getMembershipStatus = getMembershipStatus;

module.exports = isActiveMember;
