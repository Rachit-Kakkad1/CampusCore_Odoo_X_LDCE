// backend/modules/announcements/announcements.service.js
const announcementsRepository = require('./announcements.repository');

const ALLOWED_PRIORITIES = ['normal', 'important', 'urgent'];
const ALLOWED_CATEGORIES = ['general', 'event', 'urgent', 'academic', 'membership', 'finance'];
const ALLOWED_STATUSES = ['draft', 'published'];

class AnnouncementsService {
  /**
   * Retrieve announcements with filtering, search, and pagination.
   *
   * @param {Object} options
   * @param {string} [options.category]
   * @param {string} [options.search]
   * @param {string} [options.priority]
   * @param {string} [options.status='published']
   * @param {number|string} [options.page=1]
   * @param {number|string} [options.limit=10]
   */
  async getAnnouncements({
    category,
    search,
    priority,
    status = 'published',
    page = 1,
    limit = 10,
  } = {}) {
    // Validate page
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      const err = new Error('Page must be a positive integer greater than or equal to 1.');
      err.status = 400;
      throw err;
    }

    // Validate limit
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      const err = new Error('Limit must be an integer between 1 and 100.');
      err.status = 400;
      throw err;
    }

    // Validate priority if supplied
    let normalizedPriority = undefined;
    if (priority) {
      const p = String(priority).trim().toLowerCase();
      if (!ALLOWED_PRIORITIES.includes(p)) {
        const err = new Error(
          `Invalid priority "${priority}". Allowed priorities are: ${ALLOWED_PRIORITIES.join(', ')}.`
        );
        err.status = 400;
        throw err;
      }
      normalizedPriority = p;
    }

    // Validate category if supplied
    let normalizedCategory = undefined;
    if (category) {
      const c = String(category).trim().toLowerCase();
      if (!ALLOWED_CATEGORIES.includes(c)) {
        const err = new Error(
          `Invalid category "${category}". Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}.`
        );
        err.status = 400;
        throw err;
      }
      normalizedCategory = c;
    }

    // Validate status if supplied
    let normalizedStatus = status;
    if (status && status !== 'all') {
      const s = String(status).trim().toLowerCase();
      if (!ALLOWED_STATUSES.includes(s)) {
        const err = new Error(
          `Invalid status "${status}". Allowed statuses are: ${ALLOWED_STATUSES.join(', ')} or "all".`
        );
        err.status = 400;
        throw err;
      }
      normalizedStatus = s;
    }

    // Validate search length
    let sanitizedSearch = undefined;
    if (search !== undefined && search !== null) {
      const s = String(search).trim();
      if (s.length > 100) {
        const err = new Error('Search query must not exceed 100 characters.');
        err.status = 400;
        throw err;
      }
      sanitizedSearch = s;
    }

    return await announcementsRepository.findAll({
      category: normalizedCategory,
      search: sanitizedSearch,
      priority: normalizedPriority,
      status: normalizedStatus,
      page: pageNum,
      limit: limitNum,
    });
  }

  /**
   * Compatibility alias for existing code calling getAllAnnouncements() without args.
   */
  async getAllAnnouncements(options = {}) {
    const res = await this.getAnnouncements(options);
    return res.data;
  }

  /**
   * Retrieve single announcement by ID with validation.
   * Prevents leaking drafts to public consumers unless allowDraft is true.
   *
   * @param {number|string} id
   * @param {Object} [options]
   * @param {boolean} [options.allowDraft=false]
   */
  async getAnnouncementById(id, { allowDraft = false } = {}) {
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

    // If draft and draft viewing not allowed, return 404 to avoid leaking draft presence
    if (announcement.status === 'draft' && !allowDraft) {
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
   * @param {string} [input.body]
   * @param {string} [input.content]
   * @param {string} [input.priority='normal']
   * @param {string} [input.category='general']
   * @param {string} [input.status='published']
   * @param {number|string} [input.created_by]
   */
  async createAnnouncement({
    title,
    body,
    content,
    priority = 'normal',
    category = 'general',
    status = 'published',
    created_by,
  }) {
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

    const rawBody = body !== undefined ? body : content;
    if (!rawBody || typeof rawBody !== 'string' || !rawBody.trim()) {
      const err = new Error('Announcement content/body is required.');
      err.status = 400;
      throw err;
    }

    const trimmedBody = rawBody.trim();
    if (trimmedBody.length > 10000) {
      const err = new Error('Announcement content must not exceed 10000 characters.');
      err.status = 400;
      throw err;
    }

    // Validate priority
    const normalizedPriority = String(priority || 'normal').trim().toLowerCase();
    if (!ALLOWED_PRIORITIES.includes(normalizedPriority)) {
      const err = new Error(
        `Invalid priority "${priority}". Allowed priorities are: ${ALLOWED_PRIORITIES.join(', ')}.`
      );
      err.status = 400;
      throw err;
    }

    // Validate category
    const normalizedCategory = String(category || 'general').trim().toLowerCase();
    if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
      const err = new Error(
        `Invalid category "${category}". Allowed categories are: ${ALLOWED_CATEGORIES.join(', ')}.`
      );
      err.status = 400;
      throw err;
    }

    // Validate status
    const normalizedStatus = String(status || 'published').trim().toLowerCase();
    if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
      const err = new Error(
        `Invalid status "${status}". Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}.`
      );
      err.status = 400;
      throw err;
    }

    // If published, set published_at to now, else null
    const publishedAt = normalizedStatus === 'published' ? new Date() : null;

    // Temporary development user fallback
    let authorId = created_by ? parseInt(created_by, 10) : 1;
    if (isNaN(authorId) || authorId <= 0) {
      authorId = 1;
    }

    const created = await announcementsRepository.create({
      title: trimmedTitle,
      body: trimmedBody,
      created_by: authorId,
      priority: normalizedPriority,
      category: normalizedCategory,
      status: normalizedStatus,
      published_at: publishedAt,
    });

    const fullAnnouncement = await announcementsRepository.findById(created.id);
    return fullAnnouncement || created;
  }

  /**
   * Publish a draft announcement.
   *
   * @param {number|string} id
   */
  async publishAnnouncement(id) {
    const numericId = parseInt(id, 10);
    if (!numericId || isNaN(numericId) || numericId <= 0) {
      const err = new Error('Invalid announcement ID.');
      err.status = 400;
      throw err;
    }

    // Check existence
    const existing = await announcementsRepository.findById(numericId);
    if (!existing) {
      const err = new Error(`Announcement with ID ${numericId} not found.`);
      err.status = 404;
      throw err;
    }

    // If already published, return it idempotently
    if (existing.status === 'published') {
      return existing;
    }

    const updated = await announcementsRepository.publish(numericId);
    return updated;
  }
}

module.exports = new AnnouncementsService();
