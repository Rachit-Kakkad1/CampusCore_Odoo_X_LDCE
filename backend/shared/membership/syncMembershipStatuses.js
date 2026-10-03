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
  try {
    const checkSql = `SELECT column_name FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'status';`;
    const checkRes = client ? await client.query(checkSql) : await query(checkSql);
    
    if (checkRes.rows && checkRes.rows.length > 0) {
      const sql = `
        UPDATE memberships
        SET
          status = 'expired'
        WHERE
          status = 'active'
          AND expiry_date <= NOW()
        RETURNING id;
      `;
      const res = client ? await client.query(sql) : await query(sql);
      const count = res.rowCount || 0;
      if (count > 0) {
        console.log(`[Membership Sync] Automatically expired ${count} membership(s).`);
      }
      const result = new Number(count);
      result.updatedCount = count;
      result.expiredCount = count;
      return result;
    }

    const result = new Number(0);
    result.updatedCount = 0;
    result.expiredCount = 0;
    return result;
  } catch (err) {
    console.warn('[Membership Sync Warning]', err.message);
    const result = new Number(0);
    result.updatedCount = 0;
    result.expiredCount = 0;
    return result;
  }
}

syncMembershipStatuses.syncMembershipStatuses = syncMembershipStatuses;
module.exports = syncMembershipStatuses;
module.exports.syncMembershipStatuses = syncMembershipStatuses;
