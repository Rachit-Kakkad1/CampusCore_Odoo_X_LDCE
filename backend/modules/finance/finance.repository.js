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
        f.title,
        f.description,
        f.created_by,
        f.created_at,
        COALESCE(SUM(DISTINCT fi.amount), 0)::NUMERIC AS total_raised,
        COUNT(DISTINCT t.id)::INT AS total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' OR t.status = 'completed' THEN t.id END)::INT AS completed_tasks
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
   * Get financial summary overview
   */
  async getOverview() {
    try {
      const sql = `
        SELECT
          COALESCE(SUM(CASE WHEN direction = 'in' AND status = 'paid' THEN amount END), 0)::NUMERIC AS total_income,
          COALESCE(SUM(CASE WHEN direction = 'out' AND status = 'paid' THEN amount END), 0)::NUMERIC AS total_expenses,
          (COALESCE(SUM(CASE WHEN direction = 'in' AND status = 'paid' THEN amount END), 0) - COALESCE(SUM(CASE WHEN direction = 'out' AND status = 'paid' THEN amount END), 0))::NUMERIC AS balance,
          COUNT(*)::INT AS total_transactions,
          (SELECT COUNT(*)::INT FROM expenses WHERE status = 'pending') AS pending_expenses_count,
          (SELECT COALESCE(SUM(dues_amount), 0)::NUMERIC FROM memberships WHERE dues_status = 'pending') AS unpaid_dues_total,
          (SELECT COUNT(*)::INT FROM memberships WHERE dues_status = 'pending') AS unpaid_dues_count
        FROM transactions;
      `;
      const res = await query(sql);
      return res.rows[0] || {
        total_income: '0.00',
        total_expenses: '0.00',
        balance: '0.00',
        total_transactions: 0,
        pending_expenses_count: 0,
        unpaid_dues_total: '0.00',
        unpaid_dues_count: 0
      };
    } catch {
      return {
        total_income: '0.00',
        total_expenses: '0.00',
        balance: '0.00',
        total_transactions: 0,
        pending_expenses_count: 0,
        unpaid_dues_total: '0.00',
        unpaid_dues_count: 0
      };
    }
  },

  /**
   * Get all transactions in immutable ledger
   */
  async getAllTransactions({ limit = 100, offset = 0, source_type = null, direction = null } = {}) {
    let sql = `
      SELECT 
        t.id,
        t.source_type,
        t.source_id,
        t.user_id,
        t.amount,
        t.direction,
        t.payment_mode,
        t.status,
        t.created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (source_type) {
      params.push(source_type);
      sql += ` AND t.source_type = $${params.length}`;
    }

    if (direction) {
      params.push(direction);
      sql += ` AND t.direction = $${params.length}`;
    }

    sql += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2};`;
    params.push(limit, offset);

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
   * Get all expenses
   */
  async getAllExpenses({ status = null } = {}) {
    let sql = `
      SELECT 
        e.id,
        e.submitted_by,
        e.amount,
        e.description,
        e.receipt_url,
        e.status,
        e.approved_by,
        e.approved_at,
        e.reimbursed_by,
        e.reimbursed_at,
        e.created_at,
        u_sub.name AS submitter_name,
        u_sub.email AS submitter_email,
        u_sub.role AS submitter_role,
        u_app.name AS approver_name,
        u_reimb.name AS reimburser_name
      FROM expenses e
      JOIN users u_sub ON e.submitted_by = u_sub.id
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
        e.id,
        e.submitted_by,
        e.amount,
        e.description,
        e.receipt_url,
        e.status,
        e.approved_by,
        e.approved_at,
        e.reimbursed_by,
        e.reimbursed_at,
        e.created_at,
        u_sub.name AS submitter_name,
        u_sub.email AS submitter_email,
        u_app.name AS approver_name,
        u_reimb.name AS reimburser_name
      FROM expenses e
      JOIN users u_sub ON e.submitted_by = u_sub.id
      LEFT JOIN users u_app ON e.approved_by = u_app.id
      LEFT JOIN users u_reimb ON e.reimbursed_by = u_reimb.id
      WHERE e.id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Create new expense
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
   * Update expense status (approve or reject)
   */
  async updateExpenseStatus(id, status, approverId) {
    let sql;
    let params;
    if (status === 'approved') {
      sql = `
        UPDATE expenses
        SET status = 'approved', approved_by = $2, approved_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      params = [id, approverId];
    } else if (status === 'rejected') {
      sql = `
        UPDATE expenses
        SET status = 'rejected', approved_by = $2, approved_at = NOW()
        WHERE id = $1
        RETURNING *;
      `;
      params = [id, approverId];
    } else {
      sql = `
        UPDATE expenses
        SET status = $2
        WHERE id = $1
        RETURNING *;
      `;
      params = [id, status];
    }
    const res = await query(sql, params);
    return res.rows[0] || null;
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
