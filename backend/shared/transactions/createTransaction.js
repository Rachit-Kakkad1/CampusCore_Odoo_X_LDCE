const { pool } = require('../../config/database');

/**
 * Creates an immutable financial ledger transaction.
 * Enforces idempotency via UNIQUE(source_type, source_id).
 *
 * Contract:
 * @param {object} params
 * @param {'dues'|'ticket'|'merch'|'fundraiser'|'expense'} params.source_type
 * @param {number} params.source_id
 * @param {number|null} [params.user_id]
 * @param {number|string} params.amount
 * @param {'in'|'out'} params.direction
 * @param {'cash'|'online'|'upi'|'card'} params.payment_mode
 * @param {'paid'} [params.status='paid']
 * @param {object} [client=pool] - Optional pg client for running within an active transaction
 * @returns {Promise<object>} The created or existing transaction record
 */
async function createTransaction(
  { source_type, source_id, user_id = null, amount, direction, payment_mode, status = 'paid' },
  client = pool
) {
  if (!source_type || !source_id || amount === undefined || !direction || !payment_mode) {
    const error = new Error('Missing required transaction parameters');
    error.code = 'INVALID_TRANSACTION_PARAMS';
    throw error;
  }

  const insertSql = `
    INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (source_type, source_id) DO NOTHING
    RETURNING *;
  `;

  const result = await client.query(insertSql, [
    source_type,
    source_id,
    user_id,
    amount,
    direction,
    payment_mode,
    status,
  ]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Idempotent return: fetch and return existing transaction
  const existingSql = `
    SELECT * FROM transactions
    WHERE source_type = $1 AND source_id = $2
    LIMIT 1;
  `;
  const existing = await client.query(existingSql, [source_type, source_id]);
  return existing.rows[0];
}

module.exports = createTransaction;
