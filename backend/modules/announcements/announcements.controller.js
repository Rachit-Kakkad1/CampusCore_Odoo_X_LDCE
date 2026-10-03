const announcementsService = require('./announcements.service');

/**
 * Announcements Controller
 * Coordinates HTTP requests for announcements.
 */
class AnnouncementsController {
  async createAnnouncement(req, res) {
    try {
      const { title, body } = req.body;
      const created_by = req.user.id;
      const announcement = await announcementsService.createAnnouncement({ title, body, created_by });
      return res.status(201).json({ announcement });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAllAnnouncements(req, res) {
    try {
      const announcements = await announcementsService.getAllAnnouncements();
      return res.status(200).json({ announcements });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }
}

module.exports = new AnnouncementsController();
