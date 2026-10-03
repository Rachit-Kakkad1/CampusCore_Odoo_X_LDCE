const notificationService = require('./notification.service');

class NotificationController {
  async getNotifications(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const { limit, page } = req.query;
      const result = await notificationService.getUserNotifications(userId, { limit, page });
      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
        requestId: req.requestId || null,
      });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const unreadCount = await notificationService.getUnreadCount(userId);
      return res.status(200).json({
        success: true,
        unreadCount,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
        requestId: req.requestId || null,
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const { id } = req.params;
      const updated = await notificationService.markAsRead(id, userId);
      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        notification: updated,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
        requestId: req.requestId || null,
      });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const result = await notificationService.markAllAsRead(userId);
      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        ...result,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
        requestId: req.requestId || null,
      });
    }
  }
}

module.exports = new NotificationController();
