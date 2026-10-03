const announcementsService = require('./announcements.service');

/**
 * Announcements Controller
 * Coordinates HTTP requests for announcements.
 */
class AnnouncementsController {
  async createAnnouncement(req, res) {
    try {
      const { title, body, content } = req.body;
      const announcementBody = body !== undefined ? body : content;
      const created_by = req.user ? (req.user.id || req.user.userId) : (req.body.created_by || 1);
      const announcement = await announcementsService.createAnnouncement({ title, body: announcementBody, created_by });
      return res.status(201).json({ success: true, announcement, data: announcement });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAllAnnouncements(req, res) {
    try {
      const announcements = await announcementsService.getAllAnnouncements();
      return res.status(200).json({ success: true, count: announcements.length, announcements, data: announcements });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAnnouncementById(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      const announcement = await announcementsService.getAnnouncementById(id);
      if (!announcement) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Announcement not found' });
      }
      return res.status(200).json({ success: true, announcement, data: announcement });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  getAll(req, res) { return this.getAllAnnouncements(req, res); }
  getById(req, res) { return this.getAnnouncementById(req, res); }
  create(req, res) { return this.createAnnouncement(req, res); }
}

module.exports = new AnnouncementsController();

