const { getClient } = require('./pool');

/**
 * Safely executes a set of database operations inside a PostgreSQL transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK, and ensures client release.
 *
 * @param {Function} callback - Async function that receives the transaction client: (client) => Promise<any>
 * @returns {Promise<any>} The result returned by callback
 */
async function withTransaction(callback) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to ROLLBACK transaction:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  withTransaction,
  transaction: withTransaction,
};
