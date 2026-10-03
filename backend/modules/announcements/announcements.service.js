const announcementsRepository = require('./announcements.repository');

/**
 * Announcements Service
 * Business logic for organization announcements.
 */
class AnnouncementsService {
  async createAnnouncement({ title, body, created_by }) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      const err = new Error('Title is required');
      err.code = 'INVALID_TITLE';
      err.status = 400;
      throw err;
    }

    if (!body || typeof body !== 'string' || !body.trim()) {
      const err = new Error('Body is required');
      err.code = 'INVALID_BODY';
      err.status = 400;
      throw err;
    }

    return await announcementsRepository.createAnnouncement({
      title: title.trim(),
      body: body.trim(),
      created_by,
    });
  }

  async getAllAnnouncements() {
    return await announcementsRepository.getAllAnnouncements();
  }

  async getAnnouncementById(id) {
    return await announcementsRepository.getAnnouncementById(id);
  }
}

module.exports = new AnnouncementsService();
