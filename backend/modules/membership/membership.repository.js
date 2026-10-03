// backend/modules/membership/membership.repository.js
const { query, pool } = require('../../db/connection');

const membershipRepository = {
  /**
   * Find a membership by its primary key ID.
   *
   * @param {number|string} id
   * @param {Object} [client] - Optional transactional client
   * @returns {Promise<Object|null>}
   */
  async findById(id, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Find current / latest active or pending membership for a user.
   *
   * @param {number|string} userId
   * @param {Object} [client] - Optional transactional client
   * @returns {Promise<Object|null>}
   */
  async findCurrentMembershipByUserId(userId, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1
      ORDER BY 
        CASE 
          WHEN m.status = 'active' THEN 1
          WHEN m.status = 'pending' THEN 2
          WHEN m.status = 'expired' THEN 3
          WHEN m.status = 'cancelled' THEN 4
          ELSE 5
        END,
        m.created_at DESC, m.id DESC
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
    return res.rows[0] || null;
  },

  /**
   * Alias for backwards compatibility with existing callers.
   */
  async findByUserId(userId, client = null) {
    return this.findCurrentMembershipByUserId(userId, client);
  },

  /**
   * Find a membership by unique member_code.
   *
   * @param {string} memberCode
   * @param {Object} [client]
   * @returns {Promise<Object|null>}
   */
  async findByMemberCode(memberCode, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.member_code = $1
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [memberCode]) : await query(sql, [memberCode]);
    return res.rows[0] || null;
  },

  /**
   * Create a new membership record.
   * Initial status: pending, dues_status: pending.
   *
   * @param {Object} data
   * @param {number} data.user_id
   * @param {string} data.member_code
   * @param {number|string} [data.dues_amount=500.00]
   * @param {string} [data.status='pending']
   * @param {string} [data.dues_status='pending']
   * @param {number|null} [data.renewed_from_membership_id=null]
   * @param {Object} [client]
   * @returns {Promise<Object>}
   */
  async createMembership(data, client = null) {
    const {
      user_id,
      member_code,
      dues_amount = 500.00,
      status = 'pending',
      dues_status = 'pending',
      renewed_from_membership_id = null,
    } = data;

    const sql = `
      INSERT INTO memberships (
        user_id,
        member_code,
        status,
        dues_status,
        dues_amount,
        started_at,
        expiry_date,
        payment_timestamp,
        renewed_from_membership_id,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NULL, NULL, NULL, $6, NOW(), NOW())
      RETURNING *;
    `;
    const params = [
      user_id,
      member_code,
      status,
      dues_status,
      dues_amount,
      renewed_from_membership_id,
    ];

    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0];
  },

  /**
   * Backwards compatible create method.
   */
  async create(data, client = null) {
    return this.createMembership(data, client);
  },

  /**
   * Activate membership upon successful payment using PostgreSQL interval arithmetic.
   * Sets:
   * dues_status = 'paid'
   * status = 'active'
   * started_at = NOW()
   * expiry_date = NOW() + INTERVAL '1 year'
   * payment_timestamp = NOW()
   * updated_at = NOW()
   *
   * @param {number|string} id
   * @param {Object} [client]
   * @returns {Promise<Object|null>}
   */
  async activateMembership(id, client = null) {
    const sql = `
      UPDATE memberships
      SET
        status = 'active',
        dues_status = 'paid',
        started_at = NOW(),
        expiry_date = NOW() + INTERVAL '1 year',
        payment_timestamp = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Cancel membership.
   * Sets status = 'cancelled', cancelled_at = NOW(), cancellation_reason = reason, updated_at = NOW().
   * Preserves started_at, expiry_date, and payment_timestamp for historical auditing.
   *
   * @param {number|string} id
   * @param {string} reason
   * @param {Object} [client]
   * @returns {Promise<Object|null>}
   */
  async cancelMembership(id, reason, client = null) {
    const sql = `
      UPDATE memberships
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const res = client ? await client.query(sql, [id, reason]) : await query(sql, [id, reason]);
    return res.rows[0] || null;
  },

  /**
   * Retrieve complete membership history for a user, ordered newest to oldest.
   *
   * @param {number|string} userId
   * @returns {Promise<Array>}
   */
  async findMembershipHistory(userId) {
    const sql = `
      SELECT 
        m.id,
        m.user_id,
        m.member_code,
        m.status,
        m.dues_status,
        m.dues_amount,
        m.started_at,
        m.expiry_date,
        m.cancelled_at,
        m.cancellation_reason,
        m.payment_timestamp,
        m.renewed_from_membership_id,
        m.created_at,
        m.updated_at,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC, m.id DESC;
    `;
    const res = await query(sql, [userId]);
    return res.rows;
  },

  /**
   * Aggregated dashboard counts directly via PostgreSQL.
   *
   * @returns {Promise<Object>}
   */
  async getDashboardCounts() {
    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active' AND (expiry_date IS NULL OR expiry_date > NOW())) AS total_active,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW() AND expiry_date <= NOW() + INTERVAL '7 days') AS expiring_7_days,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW() AND expiry_date <= NOW() + INTERVAL '30 days') AS expiring_30_days,
        COUNT(*) FILTER (WHERE status = 'expired') AS expired,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
      FROM memberships;
    `;
    const res = await query(sql);
    const row = res.rows[0] || {};
    const totalActive = parseInt(row.total_active || 0, 10);
    const expiring7Days = parseInt(row.expiring_7_days || 0, 10);
    const expiring30Days = parseInt(row.expiring_30_days || 0, 10);
    const expired = parseInt(row.expired || 0, 10);
    const pending = parseInt(row.pending || 0, 10);
    const cancelled = parseInt(row.cancelled || 0, 10);

    return {
      totalActive,
      expiring7Days,
      expiring30Days,
      expired,
      pending,
      cancelled,
      total_active: totalActive,
      expiring_7_days: expiring7Days,
      expiring_30_days: expiring30Days,
    };
  },

  /**
   * Retrieve memberships expiring within specified days.
   *
   * @param {number} [days=30]
   * @returns {Promise<Array>}
   */
  async getExpiringMemberships(days = 30) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active'
        AND m.expiry_date > NOW()
        AND m.expiry_date <= NOW() + ($1 || ' days')::INTERVAL
      ORDER BY m.expiry_date ASC;
    `;
    const res = await query(sql, [days]);
    return res.rows;
  },

  /**
   * Retrieve all memberships with optional status filtering and search.
   *
   * @param {Object} [filter]
   * @param {string} [filter.status]
   * @param {string} [filter.search]
   * @returns {Promise<Array>}
   */
  async findAll({ status, search } = {}) {
    let sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status.toLowerCase());
      sql += ` AND m.status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(m.member_code) LIKE $${params.length} OR LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`;
    }

    sql += ` ORDER BY m.created_at DESC, m.id DESC;`;
    const res = await query(sql, params);
    return res.rows;
  },

  /**
   * Alias for findMembershipHistory
   */
  async findHistoryByUserId(userId) {
    return this.findMembershipHistory(userId);
  },
};

module.exports = membershipRepository;
