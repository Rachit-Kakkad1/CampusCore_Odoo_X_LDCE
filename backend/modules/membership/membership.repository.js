// backend/modules/membership/membership.repository.js
const { query } = require('../../db/connection');

const membershipRepository = {
  /**
   * Find a membership by user ID.
   */
  async findByUserId(userId) {
    const res = await query(
      `SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
       FROM memberships m
       JOIN users u ON m.user_id = u.id
       WHERE m.user_id = $1
       LIMIT 1;`,
      [userId]
    );
    return res.rows[0] || null;
  },

  /**
   * Find a membership by primary key ID.
   */
  async findById(id) {
    const res = await query(
      `SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
       FROM memberships m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = $1
       LIMIT 1;`,
      [id]
    );
    return res.rows[0] || null;
  },

  /**
   * Find a membership by unique member_code.
   */
  async findByMemberCode(memberCode) {
    const res = await query(
      `SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
       FROM memberships m
       JOIN users u ON m.user_id = u.id
       WHERE m.member_code = $1
       LIMIT 1;`,
      [memberCode]
    );
    return res.rows[0] || null;
  },

  /**
   * Create a new membership record.
   */
  async create({ user_id, member_code, dues_amount = 500.00, dues_status = 'pending', start_date = null, expiry_date = null, paid_at = null }) {
    const res = await query(
      `INSERT INTO memberships (user_id, member_code, dues_amount, dues_status, start_date, expiry_date, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *;`,
      [user_id, member_code, dues_amount, dues_status, start_date, expiry_date, paid_at]
    );
    return res.rows[0];
  },

  /**
   * Update payment and dues status for a membership.
   */
  async updatePayment(id, { dues_status, start_date, expiry_date, paid_at }) {
    const res = await query(
      `UPDATE memberships
       SET dues_status = $1, start_date = $2, expiry_date = $3, paid_at = $4
       WHERE id = $5
       RETURNING *;`,
      [dues_status, start_date, expiry_date, paid_at, id]
    );
    return res.rows[0];
  },

  /**
   * Retrieve all memberships (admin/treasurer oversight).
   */
  async findAll() {
    const res = await query(
      `SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
       FROM memberships m
       JOIN users u ON m.user_id = u.id
       ORDER BY m.id DESC;`
    );
    return res.rows;
  },
};

module.exports = membershipRepository;
