// frontend/src/services/announcements.service.js
import api from './api.js';

export const announcementsService = {
  /**
   * Fetch all announcements (ordered newest first).
   *
   * @returns {Promise<Array>}
   */
  async getAnnouncements() {
    const res = await api.get('/announcements');
    return res.data;
  },

  /**
   * Fetch single announcement by ID.
   *
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async getAnnouncementById(id) {
    const res = await api.get(`/announcements/${id}`);
    return res.data;
  },

  /**
   * Create a new announcement.
   *
   * @param {Object} data
   * @param {string} data.title
   * @param {string} data.body
   * @returns {Promise<Object>}
   */
  async createAnnouncement(data) {
    const res = await api.post('/announcements', data);
    return res.data;
  }
};

export default announcementsService;
