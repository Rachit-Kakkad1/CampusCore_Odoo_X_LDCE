// backend/modules/auth/auth.repository.js
const { query } = require('../../db/connection');

const authRepository = {
  /**
   * Find a user by their email address.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    const res = await query(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1 LIMIT 1;',
      [email]
    );
    return res.rows[0] || null;
  },

  /**
   * Find a user by their ID.
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const res = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1 LIMIT 1;',
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Create a new user record.
   * @param {Object} userData
   * @returns {Promise<Object>}
   */
  async createUser({ name, email, password_hash, role = 'member' }) {
    const res = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at;`,
      [name, email, password_hash, role]
    );
    return res.rows[0];
  },
};

module.exports = authRepository;
