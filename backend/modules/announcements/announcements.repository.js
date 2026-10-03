// backend/modules/announcements/announcements.repository.js
const { query } = require('../../db/connection');

const announcementsRepository = {
  /**
   * Retrieve all announcements ordered newest first.
   * Joins users table to fetch author name and role.
   *
   * @returns {Promise<Array>}
   */
  async findAll() {
    const sql = `
      SELECT 
        a.id,
        a.title,
        a.body,
        a.created_by,
        a.created_at,
        u.name AS author_name,
        u.role AS author_role
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC, a.id DESC;
    `;
    const res = await query(sql);
    return res.rows;
  },

  /**
   * Retrieve a single announcement by primary key ID.
   *
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const sql = `
      SELECT 
        a.id,
        a.title,
        a.body,
        a.created_by,
        a.created_at,
        u.name AS author_name,
        u.role AS author_role
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Insert a new announcement.
   *
   * @param {Object} data
   * @param {string} data.title
   * @param {string} data.body
   * @param {number|null} [data.created_by]
   * @returns {Promise<Object>}
   */
  async create({ title, body, created_by }) {
    const sql = `
      INSERT INTO announcements (title, body, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, title, body, created_by, created_at;
    `;
    const res = await query(sql, [title, body, created_by]);
    return res.rows[0];
  }
};

module.exports = announcementsRepository;
