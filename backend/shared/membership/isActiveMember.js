const { pool } = require('../../config/database');

/**
 * Checks whether a given user is currently an active member.
 * Per specification:
 *   isActiveMember(userId) -> true ONLY when dues_status = 'paid' AND expiry_date >= CURRENT_DATE
 *
 * @param {number} userId - The user ID to check
 * @param {object} [client] - Optional pg client for use within a transaction
 * @returns {Promise<boolean>}
 */
async function isActiveMember(userId, client = pool) {
  if (!userId) return false;

  const queryText = `
    SELECT (dues_status = 'paid' AND expiry_date >= CURRENT_DATE) AS is_active
    FROM memberships
    WHERE user_id = $1
    LIMIT 1;
  `;

  const result = await client.query(queryText, [userId]);
  if (result.rows.length === 0) {
    return false;
  }

  return Boolean(result.rows[0].is_active);
}

/**
 * Retrieves the full membership status for a user ('ACTIVE', 'EXPIRED', 'PENDING', 'NONE').
 * Useful for door check-in and display badges.
 *
 * @param {number} userId
 * @param {object} [client]
 * @returns {Promise<{ status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'NONE', membership: object | null }>}
 */
async function getMembershipStatus(userId, client = pool) {
  if (!userId) return { status: 'NONE', membership: null };

  const queryText = `
    SELECT id, member_code, dues_status, start_date, expiry_date, paid_at,
           (dues_status = 'paid' AND expiry_date >= CURRENT_DATE) AS is_active,
           (dues_status = 'paid' AND expiry_date < CURRENT_DATE) AS is_expired
    FROM memberships
    WHERE user_id = $1
    LIMIT 1;
  `;

  const result = await client.query(queryText, [userId]);
  if (result.rows.length === 0) {
    return { status: 'NONE', membership: null };
  }

  const row = result.rows[0];
  if (row.is_active) {
    return { status: 'ACTIVE', membership: row };
  } else if (row.is_expired) {
    return { status: 'EXPIRED', membership: row };
  } else {
    return { status: 'PENDING', membership: row };
  }
}

module.exports = {
  isActiveMember,
  getMembershipStatus,
};
