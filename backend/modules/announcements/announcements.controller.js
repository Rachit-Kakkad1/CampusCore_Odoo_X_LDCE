// backend/modules/announcements/announcements.controller.js
const announcementsService = require('./announcements.service');

const announcementsController = {
  /**
   * GET /api/announcements
   * Retrieve all announcements in reverse chronological order.
   */
  async getAll(req, res, next) {
    try {
      const announcements = await announcementsService.getAllAnnouncements();
      return res.status(200).json({
        success: true,
        count: announcements.length,
        data: announcements
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/announcements/:id
   * Retrieve a specific announcement by its ID.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const announcement = await announcementsService.getAnnouncementById(id);
      return res.status(200).json({
        success: true,
        data: announcement
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/announcements
   * Create a new announcement.
   */
  async create(req, res, next) {
    try {
      const { title, body, content } = req.body;
      const announcementBody = body !== undefined ? body : content;

      // Temporary development-only user mechanism:
      // Accepts authenticated user, x-user-id header, request body, or defaults to 1.
      const created_by = req.user?.userId || req.headers['x-user-id'] || req.body.created_by || 1;

      const created = await announcementsService.createAnnouncement({
        title,
        body: announcementBody,
        created_by
      });

      return res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        data: created
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = announcementsController;
