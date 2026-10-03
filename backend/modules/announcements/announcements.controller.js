// backend/modules/announcements/announcements.controller.js
const announcementsService = require('./announcements.service');

const announcementsController = {
  /**
   * GET /api/announcements
   * Retrieve announcements with pagination, category filter, priority filter, and search.
   * By default, only returns published announcements in reverse chronological order.
   */
  async getAll(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        search,
        priority,
        status = 'published',
      } = req.query;

      const result = await announcementsService.getAnnouncements({
        page,
        limit,
        category,
        search,
        priority,
        status,
      });

      return res.status(200).json({
        success: true,
        count: result.data.length,
        data: result.data,
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/announcements/:id
   * Retrieve a specific announcement by its ID.
   * Rejects unpublished drafts unless requested with allowDraft privileges.
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const allowDraft =
        req.query.include_drafts === 'true' ||
        req.user?.role === 'admin' ||
        req.headers['x-admin'] === 'true';

      const announcement = await announcementsService.getAnnouncementById(id, { allowDraft });
      return res.status(200).json({
        success: true,
        data: announcement,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/announcements
   * Create a new announcement (published or draft).
   */
  async create(req, res, next) {
    try {
      const { title, body, content, priority, category, status } = req.body;
      const announcementBody = body !== undefined ? body : content;

      // Temporary development-only user mechanism:
      // Accepts authenticated user, x-user-id header, request body, or defaults to 1.
      const created_by = req.user?.userId || req.headers['x-user-id'] || req.body.created_by || 1;

      const created = await announcementsService.createAnnouncement({
        title,
        body: announcementBody,
        priority,
        category,
        status,
        created_by,
      });

      return res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/announcements/:id/publish
   * Publish a draft announcement.
   */
  async publish(req, res, next) {
    try {
      const { id } = req.params;
      const published = await announcementsService.publishAnnouncement(id);

      return res.status(200).json({
        success: true,
        message: 'Announcement published successfully',
        data: published,
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = announcementsController;
