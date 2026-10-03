const { pool } = require('../../config/database');

/**
 * Synchronizes membership statuses against expiry dates.
 * Automatically marks any active memberships whose expiry date has passed as 'expired'.
 *
 * Requirements:
 * - Idempotent: Can be run multiple times safely.
 * - Source of truth: memberships table in PostgreSQL.
 *
 * @param {object} [client] - Optional database client (for transactions)
 * @returns {Promise<{ updatedCount: number }>}
 */
async function syncMembershipStatuses(client = pool) {
  const queryText = `
    UPDATE memberships
    SET
      status = 'expired',
      updated_at = NOW()
    WHERE
      status = 'active'
      AND expiry_date <= NOW()
    RETURNING id;
  `;

  const result = await client.query(queryText);
  return { updatedCount: result.rowCount };
}

syncMembershipStatuses.syncMembershipStatuses = syncMembershipStatuses;
module.exports = syncMembershipStatuses;
