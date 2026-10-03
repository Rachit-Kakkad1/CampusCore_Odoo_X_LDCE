const { pool } = require('../../config/database');

/**
 * Announcements Repository
 * Database queries for organization announcements.
 */
class AnnouncementsRepository {
  async createAnnouncement({ title, body, created_by }) {
    const queryText = `
      INSERT INTO announcements (title, body, created_by)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(queryText, [title, body, created_by]);
    return result.rows[0];
  }

  async getAllAnnouncements() {
    const queryText = `
      SELECT a.id, a.title, a.body, a.created_at,
             u.id as author_id, u.name as author_name, u.email as author_email
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC;
    `;
    const result = await pool.query(queryText);
    return result.rows;
  }
}

module.exports = new AnnouncementsRepository();
