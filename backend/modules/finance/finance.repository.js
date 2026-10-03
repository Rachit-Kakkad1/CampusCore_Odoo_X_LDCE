// backend/modules/finance/finance.repository.js
const { query } = require('../../db/connection');

const financeRepository = {
  /**
   * Retrieve all fundraisers with total raised and task counts
   */
  async getAllFundraisers() {
    const sql = `
      SELECT 
        f.id,
        f.title,
        f.description,
        f.created_by,
        f.created_at,
        COALESCE(SUM(DISTINCT fi.amount), 0)::NUMERIC AS total_raised,
        COUNT(DISTINCT t.id)::INT AS total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END)::INT AS completed_tasks
      FROM fundraisers f
      LEFT JOIN fundraiser_income fi ON f.id = fi.fundraiser_id
      LEFT JOIN tasks t ON f.id = t.fundraiser_id
      GROUP BY f.id
      ORDER BY f.created_at DESC;
    `;
    const res = await query(sql);
    return res.rows;
  },

  /**
   * Find fundraiser by ID
   */
  async findFundraiserById(id) {
    const res = await query('SELECT * FROM fundraisers WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  /**
   * Create new fundraiser
   */
  async createFundraiser({ title, description, created_by = 1 }) {
    const sql = `
      INSERT INTO fundraisers (title, description, created_by, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *;
    `;
    const res = await query(sql, [title, description, created_by]);
    return res.rows[0];
  },

  /**
   * Get financial summary overview with telemetry, stream breakdown and pending claims
   */
  async getOverview() {
    try {
      // 1. Balance and totals
      const totalsSql = `
        SELECT
          COALESCE(SUM(CASE WHEN direction = 'in' AND status = 'paid' THEN amount END), 0)::NUMERIC AS total_income,
          COALESCE(SUM(CASE WHEN direction = 'out' AND status = 'paid' THEN amount END), 0)::NUMERIC AS total_expenses,
          (COALESCE(SUM(CASE WHEN direction = 'in' AND status = 'paid' THEN amount END), 0) - COALESCE(SUM(CASE WHEN direction = 'out' AND status = 'paid' THEN amount END), 0))::NUMERIC AS balance
        FROM transactions;
      `;
      const totalsRes = await query(totalsSql);
      const totals = totalsRes.rows[0] || { total_income: '0.00', total_expenses: '0.00', balance: '0.00' };

      // 2. Pending expenses count and sum
      const expSql = `
        SELECT
          COUNT(*)::INT as count,
          COALESCE(SUM(amount), 0)::NUMERIC as total
        FROM expenses
        WHERE status = 'pending';
      `;
      const expRes = await query(expSql);
      const pendingExpenses = expRes.rows[0] || { count: 0, total: '0.00' };

      // 3. Pending membership dues
      const duesSql = `
        SELECT
          COUNT(*)::INT as count,
          COALESCE(SUM(dues_amount), 0)::NUMERIC as total
        FROM memberships
        WHERE dues_status = 'pending';
      `;
      const duesRes = await query(duesSql);
      const pendingDues = duesRes.rows[0] || { count: 0, total: '0.00' };

      // 4. Stream breakdown by source_type (paid inflows)
      const streamsSql = `
        SELECT
          source_type,
          COALESCE(SUM(amount), 0)::NUMERIC as total,
          COUNT(*)::INT as count
        FROM transactions
        WHERE status = 'paid' AND direction = 'in'
        GROUP BY source_type
        ORDER BY total DESC;
      `;
      const streamsRes = await query(streamsSql);
      const streams = streamsRes.rows || [];

      // 5. Recent transactions
      const recentSql = `
        SELECT *
        FROM transactions
        ORDER BY created_at DESC
        LIMIT 15;
      `;
      const recentRes = await query(recentSql);

      return {
        ...totals,
        pending_expenses: pendingExpenses,
        pending_dues: pendingDues,
        stream_breakdown: streams,
        recent_transactions: recentRes.rows || [],
      };
    } catch (err) {
      console.error('Error fetching financial overview:', err);
      return {
        total_income: '0.00',
        total_expenses: '0.00',
        balance: '0.00',
        pending_expenses: { count: 0, total: '0.00' },
        pending_dues: { count: 0, total: '0.00' },
        stream_breakdown: [],
        recent_transactions: [],
      };
    }
  },

  /**
   * Get all transactions with optional filter
   */
  async getAllTransactions({ limit = 50, offset = 0, sourceType = null }) {
    let sql = 'SELECT * FROM transactions';
    const params = [];

    if (sourceType && sourceType !== 'all') {
      params.push(sourceType);
      sql += ` WHERE source_type = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    params.push(limit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const res = await query(sql, params);
    return res.rows;
  },

  /**
   * Get all expenses with submitter and approver details
   */
  async getAllExpenses() {
    const sql = `
      SELECT 
        e.*,
        u.name AS submitter_name,
        u.email AS submitter_email,
        a.name AS approver_name
      FROM expenses e
      LEFT JOIN users u ON e.submitted_by = u.id
      LEFT JOIN users a ON e.approved_by = a.id
      ORDER BY e.created_at DESC;
    `;
    const res = await query(sql);
    return res.rows;
  },

  /**
   * Create an expense claim
   */
  async createExpense({ submitted_by, amount, description, receipt_url }) {
    const sql = `
      INSERT INTO expenses (submitted_by, amount, description, receipt_url, status, created_at)
      VALUES ($1, $2, $3, $4, 'pending', NOW())
      RETURNING *;
    `;
    const res = await query(sql, [submitted_by, amount, description, receipt_url]);
    return res.rows[0];
  },

  /**
   * Approve or reject an expense claim
   */
  async updateExpenseStatus(id, { status, approved_by }) {
    const sql = `
      UPDATE expenses
      SET status = $1, approved_by = $2, approved_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;
    const res = await query(sql, [status, approved_by, id]);
    const updated = res.rows[0];

    // If approved, create a corresponding transaction outflow
    if (updated && status === 'approved') {
      const txSql = `
        INSERT INTO transactions (source_type, source_id, amount, direction, status, created_at)
        VALUES ('expense', $1, $2, 'out', 'paid', NOW())
        ON CONFLICT DO NOTHING;
      `;
      await query(txSql, [updated.id, updated.amount]);
    }

    return updated;
  }
};

module.exports = financeRepository;
