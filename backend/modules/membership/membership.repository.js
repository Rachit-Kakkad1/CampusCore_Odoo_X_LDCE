// backend/modules/membership/membership.repository.js
const { query, pool } = require('../../config/database');

const membershipRepository = {
  /**
   * Find a membership by its primary key ID.
   */
  async findById(id, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role,
             COALESCE(m.status, CASE
               WHEN m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW()) THEN 'active'
               WHEN m.dues_status = 'paid' AND m.expiry_date <= NOW() THEN 'expired'
               ELSE 'pending'
             END) AS status,
             (COALESCE(m.status, 'pending') = 'active' AND m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW())) AS is_active,
             (COALESCE(m.status, 'pending') = 'expired' OR (m.dues_status = 'paid' AND m.expiry_date <= NOW())) AS is_expired,
             GREATEST(0, CEIL(EXTRACT(EPOCH FROM (m.expiry_date - NOW())) / 86400))::int AS days_remaining
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [id]) : await query(sql, [id]);
    return res.rows[0] || null;
  },

  async getMembershipById(id, client = pool) {
    return this.findById(id, client);
  },

  /**
   * Find current / latest membership for a user.
   */
  async findCurrentMembershipByUserId(userId, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role,
             COALESCE(m.status, CASE
               WHEN m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW()) THEN 'active'
               WHEN m.dues_status = 'paid' AND m.expiry_date <= NOW() THEN 'expired'
               ELSE 'pending'
             END) AS status,
             (COALESCE(m.status, 'pending') = 'active' AND m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW())) AS is_active,
             (COALESCE(m.status, 'pending') = 'expired' OR (m.dues_status = 'paid' AND m.expiry_date <= NOW())) AS is_expired,
             GREATEST(0, CEIL(EXTRACT(EPOCH FROM (m.expiry_date - NOW())) / 86400))::int AS days_remaining
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1
      ORDER BY
        CASE
          WHEN m.status = 'active' AND m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW()) THEN 1
          WHEN m.status = 'pending' OR m.dues_status = 'pending' THEN 2
          ELSE 3
        END, m.created_at DESC, m.id DESC
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
    return res.rows[0] || null;
  },

  async findByUserId(userId, client = null) {
    return this.findCurrentMembershipByUserId(userId, client);
  },

  async getMembershipByUserId(userId, client = pool) {
    return this.findCurrentMembershipByUserId(userId, client);
  },

  async getMembershipByUserIdForUpdate(userId, client) {
    const sql = `
      SELECT *
      FROM memberships
      WHERE user_id = $1
      ORDER BY
        CASE
          WHEN status = 'active' AND dues_status = 'paid' AND (expiry_date IS NULL OR expiry_date > NOW()) THEN 1
          WHEN status = 'pending' OR dues_status = 'pending' THEN 2
          ELSE 3
        END, id DESC
      LIMIT 1
      FOR UPDATE;
    `;
    const res = await client.query(sql, [userId]);
    return res.rows[0] || null;
  },

  /**
   * Find a membership by unique member_code.
   */
  async findByMemberCode(memberCode, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role,
             COALESCE(m.status, CASE
               WHEN m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW()) THEN 'active'
               WHEN m.dues_status = 'paid' AND m.expiry_date <= NOW() THEN 'expired'
               ELSE 'pending'
             END) AS status,
             (COALESCE(m.status, 'pending') = 'active' AND m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW())) AS is_active,
             (COALESCE(m.status, 'pending') = 'expired' OR (m.dues_status = 'paid' AND m.expiry_date <= NOW())) AS is_expired
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE UPPER(m.member_code) = UPPER($1)
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [memberCode]) : await query(sql, [memberCode]);
    return res.rows[0] || null;
  },

  async getMembershipByCode(memberCode, client = pool) {
    return this.findByMemberCode(memberCode, client);
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
      status = 'pending',
      renewed_from_membership_id = null,
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
        renewed_from_membership_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, NULL, NULL, NULL, $6, NOW())
      RETURNING *, started_at AS start_date, payment_timestamp AS paid_at;
    `;
    const params = [user_id, member_code, dues_amount, dues_status, status, renewed_from_membership_id];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0];
  },

  async create(data, client = null) {
    return this.createMembership(data, client);
  },

  /**
   * Activate membership upon successful payment.
   * Calculates expiry_date using dynamic PostgreSQL interval arithmetic.
   */
  async activateMembership(id, client = null, options = {}) {
    const interval = options?.interval || '12 months';
    const duesAmount = options?.duesAmount !== undefined && options?.duesAmount !== null ? options.duesAmount : null;

    const sql = `
      UPDATE memberships
      SET
        dues_status = 'paid',
        status = 'active',
        dues_amount = COALESCE($2, dues_amount),
        started_at = NOW(),
        expiry_date = NOW() + ($3)::INTERVAL,
        payment_timestamp = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *, started_at AS start_date, payment_timestamp AS paid_at;
    `;
    const params = [id, duesAmount, interval];
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows[0] || null;
  },

  /**
   * Cancels a membership.
   */
  async cancelMembership(membershipId, cancellationReason = 'Member requested cancellation', client = null) {
    const sql = `
      UPDATE memberships
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *, started_at AS start_date, payment_timestamp AS paid_at;
    `;
    const res = client ? await client.query(sql, [membershipId, cancellationReason]) : await query(sql, [membershipId, cancellationReason]);
    return res.rows[0] || null;
  },

  /**
   * Find membership history for a user.
   */
  async findMembershipHistory(userId, client = null) {
    const sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role,
             m.status,
             (m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW())) AS is_active,
             (m.status = 'expired' OR (m.dues_status = 'paid' AND m.expiry_date <= NOW())) AS is_expired
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1
      ORDER BY m.created_at DESC, m.id DESC;
    `;
    const res = client ? await client.query(sql, [userId]) : await query(sql, [userId]);
    return res.rows;
  },

  async findHistoryByUserId(userId, client = null) {
    return this.findMembershipHistory(userId, client);
  },

  async getRenewalHistory(userId, client = pool) {
    return this.findMembershipHistory(userId, client);
  },

  /**
   * Aggregate dashboard statistics.
   */
  async getDashboardCounts(client = null) {
    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active' OR (dues_status = 'paid' AND (expiry_date IS NULL OR expiry_date > NOW())))::INT AS total_active,
        COUNT(*) FILTER (WHERE dues_status = 'paid' AND expiry_date > NOW() AND expiry_date <= NOW() + INTERVAL '7 days')::INT AS expiring_7_days,
        COUNT(*) FILTER (WHERE dues_status = 'paid' AND expiry_date > NOW() AND expiry_date <= NOW() + INTERVAL '30 days')::INT AS expiring_30_days,
        COUNT(*) FILTER (WHERE status = 'expired' OR (dues_status = 'paid' AND expiry_date <= NOW()))::INT AS expired,
        COUNT(*) FILTER (WHERE status = 'pending' OR dues_status = 'pending')::INT AS pending,
        COUNT(*) FILTER (WHERE status = 'cancelled')::INT AS cancelled,
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

  async getExpiryDashboard(client = pool) {
    return this.getDashboardCounts(client);
  },

  async getExpiringMemberships(days = 30, client = null) {
    const numDays = typeof days === 'number' ? days : 30;
    const sql = `
      SELECT m.*, u.name as user_name, u.email as user_email, u.role as user_role,
             GREATEST(0, CEIL(EXTRACT(EPOCH FROM (m.expiry_date - NOW())) / 86400))::int as days_remaining
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.dues_status = 'paid'
        AND m.expiry_date > NOW()
        AND m.expiry_date <= NOW() + ($1 || ' days')::INTERVAL
      ORDER BY m.expiry_date ASC;
    `;
    const res = client ? await client.query(sql, [numDays]) : await query(sql, [numDays]);
    return res.rows;
  },

  /**
   * Retrieve all memberships with optional status filtering and search.
   */
  async findAll(filter = {}, client = null) {
    const { status, search } = filter;
    let sql = `
      SELECT m.*, u.name AS user_name, u.email AS user_email, u.role AS user_role,
             CASE
               WHEN m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW()) THEN 'active'
               WHEN m.dues_status = 'paid' AND m.expiry_date <= NOW() THEN 'expired'
               ELSE 'pending'
             END AS status,
             (m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW())) as is_active,
             GREATEST(0, CEIL(EXTRACT(EPOCH FROM (m.expiry_date - NOW())) / 86400))::int as days_remaining
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      const normStatus = status.toLowerCase();
      if (normStatus === 'active') {
        sql += ` AND (m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW()))`;
      } else if (normStatus === 'expired') {
        sql += ` AND (m.dues_status = 'paid' AND m.expiry_date <= NOW())`;
      } else if (normStatus === 'pending') {
        sql += ` AND (m.dues_status = 'pending')`;
      }
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR m.member_code ILIKE $${params.length})`;
    }

    sql += ' ORDER BY m.created_at DESC';
    const res = client ? await client.query(sql, params) : await query(sql, params);
    return res.rows;
  },

  async getAllMembers(filter = {}, client = null) {
    return this.findAll(filter, client);
  },
};

module.exports = membershipRepository;
