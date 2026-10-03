// backend/shared/membership/syncMembershipStatuses.js
const { pool, query } = require('../../db/connection');

/**
 * Shared Membership Helper: syncMembershipStatuses
 * Idempotently updates active memberships whose expiry date has passed to 'expired'.
 * Never alters pending or cancelled memberships.
 *
 * @param {Object} [client] - Optional transactional DB client
 * @returns {Promise<Number>} Number of memberships marked as expired (with .updatedCount property for compatibility)
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
    const count = res.rowCount || 0;
    if (count > 0) {
      console.log(`[Membership Sync] Automatically expired ${count} membership(s).`);
    }
    // Return a primitive-compatible Number object that also supports .updatedCount and .expiredCount
    const result = new Number(count);
    result.updatedCount = count;
    result.expiredCount = count;
    return result;
  } catch (err) {
    console.error('[Membership Sync Error] Failed to synchronize membership statuses:', err.message);
    throw err;
  }
}

syncMembershipStatuses.syncMembershipStatuses = syncMembershipStatuses;
module.exports = syncMembershipStatuses;
module.exports.syncMembershipStatuses = syncMembershipStatuses;
