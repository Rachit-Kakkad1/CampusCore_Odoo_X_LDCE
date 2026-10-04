const { pool } = require('../../config/database');

class NotificationService {
  /**
   * Dispatches an in-app notification for a user.
   */
  async createNotification({ userId, type, title, message, data = {} }, client = pool) {
    if (!userId || !title || !message) return null;

    const queryText = `
      INSERT INTO notifications (user_id, type, title, message, data, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `;
    const res = await client.query(queryText, [
      userId,
      type || 'general',
      title,
      message,
      JSON.stringify(data || {}),
    ]);
    return res.rows[0];
  }

  /**
   * Retrieves paginated notifications for a user.
   */
  async getUserNotifications(userId, { limit = 20, page = 1 } = {}) {
    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 50);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const countQuery = `SELECT COUNT(*)::int as total FROM notifications WHERE user_id = $1;`;
    const countRes = await pool.query(countQuery, [userId]);
    const total = countRes.rows[0]?.total || 0;

    const queryText = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const res = await pool.query(queryText, [userId, parsedLimit, offset]);

    const totalPages = total > 0 ? Math.ceil(total / parsedLimit) : 0;
    return {
      data: res.rows,
      notifications: res.rows,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      pagination: {
        page: parsedPage,
        pageSize: parsedLimit,
        totalItems: total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPreviousPage: parsedPage > 1,
      },
    };
  }

  /**
   * Retrieves count of unread notifications for a user.
   */
  async getUnreadCount(userId) {
    const queryText = `
      SELECT COUNT(*)::int as unread_count
      FROM notifications
      WHERE user_id = $1 AND read_at IS NULL;
    `;
    const res = await pool.query(queryText, [userId]);
    return res.rows[0]?.unread_count || 0;
  }

  /**
   * Marks a specific notification as read with object-level ownership check.
   */
  async markAsRead(notificationId, userId) {
    const notifId = parseInt(notificationId, 10);
    if (isNaN(notifId)) {
      const err = new Error('Invalid notification ID');
      err.status = 400;
      throw err;
    }

    const queryText = `
      UPDATE notifications
      SET read_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
    const res = await pool.query(queryText, [notifId, userId]);
    if (res.rows.length === 0) {
      const err = new Error('Notification not found or unauthorized');
      err.status = 404;
      throw err;
    }
    return res.rows[0];
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllAsRead(userId) {
    const queryText = `
      UPDATE notifications
      SET read_at = NOW()
      WHERE user_id = $1 AND read_at IS NULL;
    `;
    const res = await pool.query(queryText, [userId]);
    return { updatedCount: res.rowCount };
  }
}

module.exports = new NotificationService();
