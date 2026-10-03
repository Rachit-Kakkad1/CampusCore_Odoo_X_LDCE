// backend/shared/transactions/createTransaction.js
const { query } = require('../../db/connection');

/**
 * Shared Transaction Helper: createTransaction
 * Records a financial transaction record in the centralized transactions ledger.
 * Uses ON CONFLICT (source_type, source_id) for idempotent updates.
 *
 * @param {Object} txData
 * @param {string} txData.source_type - 'dues' | 'ticket' | 'merch' | 'fundraiser' | 'expense'
 * @param {number} txData.source_id - Foreign key to source entity (e.g. membership.id)
 * @param {number} [txData.user_id] - Associated user ID
 * @param {number|string} txData.amount - Transaction monetary amount
 * @param {string} [txData.direction='in'] - 'in' | 'out'
 * @param {string} [txData.payment_mode='online'] - 'cash' | 'online' | 'upi' | 'card'
 * @param {string} [txData.status='paid'] - 'pending' | 'paid' | 'failed'
 * @param {Object} [client] - Optional database transaction client for atomic execution
 * @returns {Promise<Object>} Created/updated transaction record
 */
async function createTransaction(txData, client = null) {
  const {
    source_type,
    source_id,
    user_id = null,
    amount,
    direction = 'in',
    payment_mode = 'online',
    status = 'paid'
  } = txData;

  const sql = `
    INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (source_type, source_id)
    DO UPDATE SET
      amount = EXCLUDED.amount,
      direction = EXCLUDED.direction,
      payment_mode = EXCLUDED.payment_mode,
      status = EXCLUDED.status
    RETURNING *;
  `;
  const params = [source_type, source_id, user_id, amount, direction, payment_mode, status];

  if (client) {
    const res = await client.query(sql, params);
    return res.rows[0];
  } else {
    const res = await query(sql, params);
    return res.rows[0];
  }
}

module.exports = { createTransaction };
