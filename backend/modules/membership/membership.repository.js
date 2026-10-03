// backend/modules/membership/membership.repository.js
const { query, pool } = require('../../config/database');

const membershipRepository = {
  /**
   * Find a membership by its primary key ID.
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
   * Find current / latest membership for a user.
   */
  async findCurrentMembershipByUserId(userId, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1
      ORDER BY
        CASE m.status
          WHEN 'active' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'expired' THEN 3
          WHEN 'cancelled' THEN 4
          ELSE 5
        END, m.created_at DESC, m.id DESC
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
    return res.rows[0] || null;
  },

  /**
   * Alias for backwards compatibility.
   */
  async findByUserId(userId, client = null) {
    return this.findCurrentMembershipByUserId(userId, client);
  },

  /**
   * Find a membership by unique member_code.
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
   */
  async createMembership(data, client = null) {
    const {
      user_id,
      member_code,
      dues_amount = 500.00,
      dues_status = 'pending',
    } = data;

    const sql = `
      INSERT INTO memberships (
        user_id,
        member_code,
        dues_amount,
        dues_status,
        status,
        started_at,
        expiry_date,
        payment_timestamp,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'pending', NULL, NULL, NULL, NOW(), NOW())
      RETURNING *;
    `;
    const params = [user_id, member_code, dues_amount, dues_status];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0];
  },

  async create(data, client = null) {
    return this.createMembership(data, client);
  },

  /**
   * Activate membership upon successful payment.
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
   * Find membership history for a user.
   */
  async findMembershipHistory(userId, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC, m.id DESC;
    `;
    const res = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
    return res.rows;
  },

  async findHistoryByUserId(userId) {
    return this.findMembershipHistory(userId);
  },

  /**
   * Aggregate dashboard statistics.
   */
  async getDashboardCounts(client = null) {
    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active' AND (expiry_date IS NULL OR expiry_date > NOW())) AS total_active,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW() AND expiry_date <= NOW() + INTERVAL '7 days') AS expiring_7_days,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW() AND expiry_date <= NOW() + INTERVAL '30 days') AS expiring_30_days,
        COUNT(*) FILTER (WHERE status = 'expired' OR (status = 'active' AND expiry_date <= NOW())) AS expired,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
        COUNT(*)::INT AS total
      FROM memberships;
    `;
    const res = client ? await client.query(sql) : await query(sql);
    const row = res.rows[0] || {};
    const totalActive = parseInt(row.total_active || 0, 10);
    const expiring7Days = parseInt(row.expiring_7_days || 0, 10);
    const expiring30Days = parseInt(row.expiring_30_days || 0, 10);
    const expired = parseInt(row.expired || 0, 10);
    const pending = parseInt(row.pending || 0, 10);
    const cancelled = parseInt(row.cancelled || 0, 10);
    const total = parseInt(row.total || 0, 10);

    return {
      total,
      active: totalActive,
      totalActive,
      total_active: totalActive,
      expiring7Days,
      expiring_7_days: expiring7Days,
      expiring30Days,
      expiring_30_days: expiring30Days,
      expired,
      pending,
      cancelled,
    };
  },

  /**
   * Retrieve all memberships with optional status filtering and search.
   */
  async findAll(filter = {}, client = null) {
    const { status, search } = filter;
    let sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status.toLowerCase());
      sql += ` AND m.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR m.member_code ILIKE $${params.length})`;
    }

    sql += ' ORDER BY m.created_at DESC';
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows;
  },
};

module.exports = membershipRepository;
