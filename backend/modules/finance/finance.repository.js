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
   * Get financial summary overview
   */
  async getOverview() {
    try {
      const sql = `
        SELECT
          COALESCE(SUM(CASE WHEN direction = 'in' AND status = 'paid' THEN amount END), 0)::NUMERIC AS total_income,
          COALESCE(SUM(CASE WHEN direction = 'out' AND status = 'paid' THEN amount END), 0)::NUMERIC AS total_expenses,
          (COALESCE(SUM(CASE WHEN direction = 'in' AND status = 'paid' THEN amount END), 0) - COALESCE(SUM(CASE WHEN direction = 'out' AND status = 'paid' THEN amount END), 0))::NUMERIC AS balance
        FROM transactions;
      `;
      const res = await query(sql);
      return res.rows[0] || { total_income: '0.00', total_expenses: '0.00', balance: '0.00' };
    } catch {
      return { total_income: '0.00', total_expenses: '0.00', balance: '0.00' };
    }
  },
};

module.exports = financeRepository;
