// backend/modules/announcements/announcements.service.js
const announcementsRepository = require('./announcements.repository');

class AnnouncementsService {
  /**
   * Retrieve all announcements ordered newest first.
   */
  async getAllAnnouncements() {
    return await announcementsRepository.findAll();
  }

  /**
   * Retrieve single announcement by ID with validation.
   */
  async getAnnouncementById(id) {
    const numericId = parseInt(id, 10);
    if (!numericId || isNaN(numericId) || numericId <= 0) {
      const err = new Error('Invalid announcement ID.');
      err.status = 400;
      throw err;
    }

    const announcement = await announcementsRepository.findById(numericId);
    if (!announcement) {
      const err = new Error(`Announcement with ID ${numericId} not found.`);
      err.status = 404;
      throw err;
    }

    return announcement;
  }

  /**
   * Create an announcement with input validation and temporary development user handling.
   *
   * @param {Object} input
   * @param {string} input.title
   * @param {string} input.body
   * @param {number|string} [input.created_by]
   */
  async createAnnouncement({ title, body, created_by }) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      const err = new Error('Announcement title is required.');
      err.status = 400;
      throw err;
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 255) {
      const err = new Error('Announcement title must not exceed 255 characters.');
      err.status = 400;
      throw err;
    }

    if (!body || typeof body !== 'string' || !body.trim()) {
      const err = new Error('Announcement content/body is required.');
      err.status = 400;
      throw err;
    }

    const trimmedBody = body.trim();

    // TEMPORARY DEVELOPMENT-ONLY USER HANDLING:
    // If created_by is omitted, default to User 1 (Admin User) from seed data.
    // In production/later prompts, this will be provided by requireAuth (req.user.userId).
    let authorId = created_by ? parseInt(created_by, 10) : 1;
    if (isNaN(authorId) || authorId <= 0) {
      authorId = 1;
    }

    const created = await announcementsRepository.create({
      title: trimmedTitle,
      body: trimmedBody,
      created_by: authorId
    });

    // Return the announcement with author metadata populated
    const fullAnnouncement = await announcementsRepository.findById(created.id);
    return fullAnnouncement || created;
  }
}

module.exports = new AnnouncementsService();
