// backend/modules/finance/finance.repository.js
const { pool, query } = require('../../db/connection');
const createTransaction = require('../../shared/transactions/createTransaction');

const financeRepository = {
  /**
   * Retrieve all fundraisers with total raised and task counts
   */
  async getAllFundraisers() {
    const sql = `
      SELECT 
        f.id,
        f.public_id,
        f.slug,
        f.title,
        f.short_description,
        f.description,
        f.image_url,
        f.goal_amount,
        f.currency,
        f.status,
        f.start_at,
        f.end_at,
        f.created_by,
        f.created_at,
        (
          COALESCE((SELECT SUM(amount) FROM fundraiser_income WHERE fundraiser_id = f.id), 0) +
          COALESCE((SELECT SUM(CASE WHEN status = 'paid' THEN amount WHEN status = 'refunded' THEN amount - refund_amount ELSE 0 END) FROM donations WHERE fundraiser_id = f.id), 0)
        )::NUMERIC(12,2) AS total_raised,
        COALESCE((SELECT COUNT(*) FROM donations WHERE fundraiser_id = f.id AND status = 'paid'), 0)::INT AS donor_count,
        COUNT(DISTINCT t.id)::INT AS total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' OR t.status = 'completed' THEN t.id END)::INT AS completed_tasks
      FROM fundraisers f
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
   * Record fundraiser income batch and create transaction in financial ledger
   */
  async addFundraiserIncome({ fundraiser_id, amount, note = '', recorded_by = 1, payment_mode = 'cash' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const incomeSql = `
        INSERT INTO fundraiser_income (fundraiser_id, amount, note, recorded_by, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *;
      `;
      const incomeRes = await client.query(incomeSql, [fundraiser_id, amount, note, recorded_by]);
      const income = incomeRes.rows[0];

      // Insert transaction in ledger
      const tx = await createTransaction({
        source_type: 'fundraiser',
        source_id: income.id,
        user_id: recorded_by,
        amount: Number(amount),
        direction: 'in',
        payment_mode: payment_mode || 'cash',
        status: 'paid'
      }, client);

      await client.query('COMMIT');
      return { income, transaction: tx };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
          (COALESCE(SUM(CASE WHEN direction = 'in' AND status = 'paid' THEN amount END), 0) - COALESCE(SUM(CASE WHEN direction = 'out' AND status = 'paid' THEN amount END), 0))::NUMERIC AS balance,
          COUNT(*)::INT AS total_transactions
        FROM transactions;
      `;
      const totalsRes = await query(totalsSql);
      const totals = totalsRes.rows[0] || { total_income: '0.00', total_expenses: '0.00', balance: '0.00', total_transactions: 0 };

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
        SELECT 
          t.*,
          u.name AS user_name,
          u.email AS user_email
        FROM transactions t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
        LIMIT 15;
      `;
      const recentRes = await query(recentSql);

      return {
        ...totals,
        pending_expenses: pendingExpenses,
        pending_expenses_count: pendingExpenses.count,
        pending_dues: pendingDues,
        unpaid_dues_total: pendingDues.total,
        unpaid_dues_count: pendingDues.count,
        stream_breakdown: streams,
        recent_transactions: recentRes.rows || [],
      };
    } catch (err) {
      console.error('Error fetching financial overview:', err);
      return {
        total_income: '0.00',
        total_expenses: '0.00',
        balance: '0.00',
        total_transactions: 0,
        pending_expenses: { count: 0, total: '0.00' },
        pending_expenses_count: 0,
        pending_dues: { count: 0, total: '0.00' },
        unpaid_dues_total: '0.00',
        unpaid_dues_count: 0,
        stream_breakdown: [],
        recent_transactions: [],
      };
    }
  },

  /**
   * Get all transactions with optional filter
   */
  async getAllTransactions({ limit = 100, offset = 0, sourceType = null, source_type = null, direction = null } = {}) {
    const filterSource = sourceType || source_type;
    let sql = `
      SELECT 
        t.*,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filterSource && filterSource !== 'all') {
      params.push(filterSource);
      sql += ` AND t.source_type = $${params.length}`;
    }

    if (direction) {
      params.push(direction);
      sql += ` AND t.direction = $${params.length}`;
    }

    sql += ' ORDER BY t.created_at DESC';

    params.push(limit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const res = await query(sql, params);
    return res.rows;
  },

  /**
   * Get members who still owe dues
   */
  async getOwingMembers() {
    const sql = `
      SELECT 
        m.id AS membership_id,
        m.user_id,
        m.member_code,
        m.dues_status,
        m.dues_amount,
        m.created_at AS registration_date,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.dues_status = 'pending'
      ORDER BY m.created_at DESC;
    `;
    const res = await query(sql);
    return res.rows;
  },

  /**
   * Get all expenses with submitter and approver details
   */
  async getAllExpenses({ status = null } = {}) {
    let sql = `
      SELECT 
        e.*,
        u_sub.name AS submitter_name,
        u_sub.email AS submitter_email,
        u_sub.role AS submitter_role,
        u_app.name AS approver_name,
        u_reimb.name AS reimburser_name
      FROM expenses e
      LEFT JOIN users u_sub ON e.submitted_by = u_sub.id
      LEFT JOIN users u_app ON e.approved_by = u_app.id
      LEFT JOIN users u_reimb ON e.reimbursed_by = u_reimb.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }

    sql += ` ORDER BY e.created_at DESC;`;
    const res = await query(sql, params);
    return res.rows;
  },

  /**
   * Get single expense by ID
   */
  async getExpenseById(id) {
    const sql = `
      SELECT 
        e.*,
        u_sub.name AS submitter_name,
        u_sub.email AS submitter_email,
        u_app.name AS approver_name,
        u_reimb.name AS reimburser_name
      FROM expenses e
      LEFT JOIN users u_sub ON e.submitted_by = u_sub.id
      LEFT JOIN users u_app ON e.approved_by = u_app.id
      LEFT JOIN users u_reimb ON e.reimbursed_by = u_reimb.id
      WHERE e.id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Create an expense claim
   */
  async createExpense({ submitted_by, amount, description, receipt_url = null }) {
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
  async updateExpenseStatus(id, { status, approved_by } = {}) {
    const approver = approved_by || arguments[2];
    const newStatus = typeof status === 'string' ? status : arguments[1];

    let sql;
    let params;
    if (newStatus === 'approved') {
      sql = `
        UPDATE expenses
        SET status = 'approved', approved_by = $2, approved_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      params = [id, approver];
    } else if (newStatus === 'rejected') {
      sql = `
        UPDATE expenses
        SET status = 'rejected', approved_by = $2, approved_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      params = [id, approver];
    } else {
      sql = `
        UPDATE expenses
        SET status = $2
        WHERE id = $1
        RETURNING *;
      `;
      params = [id, newStatus];
    }

    const res = await query(sql, params);
    const updated = res.rows[0];

    // If approved, create a corresponding transaction outflow
    if (updated && newStatus === 'approved') {
      const txSql = `
        INSERT INTO transactions (source_type, source_id, amount, direction, status, created_at)
        VALUES ('expense', $1, $2, 'out', 'paid', NOW())
        ON CONFLICT DO NOTHING;
      `;
      await query(txSql, [updated.id, updated.amount]);
    }

    return updated;
  },

  /**
   * Reimburse expense and atomically record transaction in ledger
   */
  async reimburseExpense(id, reimburserId, paymentMode = 'online') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const expenseRes = await client.query('SELECT * FROM expenses WHERE id = $1 FOR UPDATE', [id]);
      const expense = expenseRes.rows[0];

      if (!expense) {
        const err = new Error('Expense not found');
        err.status = 404;
        throw err;
      }

      if (expense.status === 'reimbursed') {
        const err = new Error('Expense is already reimbursed');
        err.status = 400;
        throw err;
      }

      // Update expense
      const updateSql = `
        UPDATE expenses
        SET status = 'reimbursed', reimbursed_by = $2, reimbursed_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      const updatedExpenseRes = await client.query(updateSql, [id, reimburserId]);
      const updatedExpense = updatedExpenseRes.rows[0];

      // Create outgoing transaction in ledger
      const tx = await createTransaction({
        source_type: 'expense',
        source_id: expense.id,
        user_id: expense.submitted_by,
        amount: Number(expense.amount),
        direction: 'out',
        payment_mode: paymentMode || 'online',
        status: 'paid'
      }, client);

      await client.query('COMMIT');
      return { expense: updatedExpense, transaction: tx };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = financeRepository;
