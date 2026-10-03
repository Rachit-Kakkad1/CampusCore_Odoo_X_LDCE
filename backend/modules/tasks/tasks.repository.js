// backend/modules/tasks/tasks.repository.js
const { query } = require('../../db/connection');

const tasksRepository = {
  /**
   * Get all tasks with optional filters
   */
  async getAllTasks({ assignee_id, fundraiser_id, status } = {}) {
    let sql = `
      SELECT 
        t.id,
        t.fundraiser_id,
        t.title,
        t.assignee_id,
        t.status,
        t.created_at,
        f.title AS fundraiser_title,
        f.description AS fundraiser_description,
        u.name AS assignee_name,
        u.email AS assignee_email
      FROM tasks t
      LEFT JOIN fundraisers f ON t.fundraiser_id = f.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (assignee_id) {
      params.push(assignee_id);
      sql += ` AND t.assignee_id = $${params.length}`;
    }

    if (fundraiser_id) {
      params.push(fundraiser_id);
      sql += ` AND t.fundraiser_id = $${params.length}`;
    }

    if (status) {
      params.push(status.toUpperCase());
      sql += ` AND UPPER(t.status) = $${params.length}`;
    }

    sql += ` ORDER BY t.id ASC;`;

    const res = await query(sql, params);
    return res.rows;
  },

  /**
   * Find task by ID
   */
  async getTaskById(id) {
    const sql = `
      SELECT 
        t.id,
        t.fundraiser_id,
        t.title,
        t.assignee_id,
        t.status,
        t.created_at,
        f.title AS fundraiser_title,
        u.name AS assignee_name,
        u.email AS assignee_email
      FROM tasks t
      LEFT JOIN fundraisers f ON t.fundraiser_id = f.id
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Create a new task
   */
  async createTask({ fundraiser_id, title, assignee_id = null, status = 'TODO' }) {
    const normalizedStatus = status.toUpperCase();
    const sql = `
      INSERT INTO tasks (fundraiser_id, title, assignee_id, status, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    const res = await query(sql, [fundraiser_id, title, assignee_id, normalizedStatus]);
    return res.rows[0];
  },

  /**
   * Update task status
   */
  async updateTaskStatus(id, status) {
    const normalizedStatus = status.toUpperCase();
    const sql = `
      UPDATE tasks
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;
    const res = await query(sql, [normalizedStatus, id]);
    return res.rows[0] || null;
  },

  /**
   * Delete task
   */
  async deleteTask(id) {
    const res = await query('DELETE FROM tasks WHERE id = $1 RETURNING *;', [id]);
    return res.rows[0] || null;
  }
};

module.exports = tasksRepository;
