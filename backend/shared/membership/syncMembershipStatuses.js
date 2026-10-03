// backend/shared/membership/syncMembershipStatuses.js
const { query } = require('../../db/connection');

/**
 * Shared Membership Helper: syncMembershipStatuses
 * Idempotently updates active memberships whose expiry date has passed to 'expired'.
 * Never alters pending or cancelled memberships.
 *
 * @param {Object} [client] - Optional transactional DB client
 * @returns {Promise<number>} Number of memberships marked as expired
 */
async function syncMembershipStatuses(client = null) {
  const sql = `
    UPDATE memberships
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE
      status = 'active'
      AND expiry_date <= NOW()
    RETURNING id;
  `;

  try {
    const res = client ? await client.query(sql) : await query(sql);
    if (res.rowCount > 0) {
      console.log(`[Membership Sync] Automatically expired ${res.rowCount} membership(s).`);
    }
    return res.rowCount;
  } catch (err) {
    console.error('[Membership Sync Error] Failed to synchronize membership statuses:', err.message);
    throw err;
  }
}

module.exports = { syncMembershipStatuses };
