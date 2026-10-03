// backend/shared/membership/isActiveMember.js
const { query } = require('../../db/connection');

/**
 * Shared Membership Helper: isActiveMember
 * Evaluates whether a given user holds an active membership.
 *
 * ACTIVE MEMBER strictly requires:
 * - status = 'active'
 * - dues_status = 'paid'
 * - expiry_date > NOW()
 *
 * @param {number|string} userId
 * @param {Object} [client] - Optional DB client for transactional consistency
 * @returns {Promise<boolean>}
 */
async function isActiveMember(userId, client = null) {
  if (!userId) return false;
  const numId = parseInt(userId, 10);
  if (isNaN(numId) || numId <= 0) return false;

  try {
    const sql = `
      SELECT id, status, dues_status, expiry_date
      FROM memberships
      WHERE user_id = $1
        AND status = 'active'
        AND dues_status = 'paid'
        AND expiry_date > NOW()
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [numId]) : await query(sql, [numId]);
    return res.rows.length > 0;
  } catch (err) {
    console.error('Error evaluating isActiveMember:', err.message);
    return false;
  }
}

module.exports = { isActiveMember };
