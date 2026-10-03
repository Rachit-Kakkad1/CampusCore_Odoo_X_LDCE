const { pool } = require('../../config/database');

/**
 * Auth Repository
 * Database queries for user accounts and authentication.
 */
class AuthRepository {
  /**
   * Inserts a new user into the database.
   */
  async createUser({ name, email, password_hash, role = 'member' }, client = pool) {
    const queryText = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at;
    `;
    const result = await client.query(queryText, [name, email, password_hash, role]);
    return result.rows[0];
  }

  /**
   * Retrieves user by email, including password_hash for credential verification.
   */
  async getUserByEmail(email, client = pool) {
    const queryText = `
      SELECT id, name, email, password_hash, role, created_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const result = await client.query(queryText, [email]);
    return result.rows[0] || null;
  }

  /**
   * Retrieves safe user profile by ID (without password_hash).
   */
  async getUserById(id, client = pool) {
    const queryText = `
      SELECT id, name, email, role, created_at
      FROM users
      WHERE id = $1;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }
}

module.exports = new AuthRepository();
