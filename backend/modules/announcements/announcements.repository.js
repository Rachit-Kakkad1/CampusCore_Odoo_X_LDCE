// backend/modules/announcements/announcements.repository.js
const { query } = require('../../db/connection');

const announcementsRepository = {
  /**
   * Retrieve announcements with filtering, search, and pagination.
   * Parameterized PostgreSQL queries with SQL LIMIT/OFFSET.
   *
   * @param {Object} options
   * @param {string} [options.category]
   * @param {string} [options.search]
   * @param {string} [options.priority]
   * @param {string} [options.status] - 'published', 'draft', or 'all'
   * @param {number} [options.page=1]
   * @param {number} [options.limit=10]
   * @returns {Promise<{ data: Array, total: number, page: number, limit: number, totalPages: number }>}
   */
  async findAll({ category, search, priority, status = 'published', page = 1, limit = 10 } = {}) {
    const whereClauses = [];
    const params = [];

    // Filter by publication status
    if (status && status !== 'all') {
      params.push(status);
      whereClauses.push(`a.status = $${params.length}`);
    }

    // Filter by category (case-insensitive)
    if (category) {
      params.push(category.toLowerCase());
      whereClauses.push(`LOWER(a.category) = $${params.length}`);
    }

    // Filter by priority (case-insensitive)
    if (priority) {
      params.push(priority.toLowerCase());
      whereClauses.push(`LOWER(a.priority) = $${params.length}`);
    }

    // Search query on title and body (case-insensitive ILIKE)
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      whereClauses.push(`(a.title ILIKE $${idx} OR a.body ILIKE $${idx})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Efficient total count query
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM announcements a
      ${whereSql};
    `;
    const countRes = await query(countSql, params);
    const total = countRes.rows[0] ? parseInt(countRes.rows[0].total, 10) : 0;

    // 2. Paginated rows query
    const offset = Math.max(0, (page - 1) * limit);
    const itemParams = [...params, limit, offset];
    const limitIdx = itemParams.length - 1;
    const offsetIdx = itemParams.length;

    const itemsSql = `
      SELECT 
        a.id,
        a.title,
        a.body,
        a.body AS content,
        a.priority,
        a.category,
        a.status,
        a.published_at,
        a.created_by,
        a.created_at,
        u.name AS author_name,
        u.role AS author_role
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      ${whereSql}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const itemsRes = await query(itemsSql, itemParams);
    const totalPages = Math.ceil(total / limit) || 0;

    return {
      data: itemsRes.rows,
      total,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Retrieve a single announcement by primary key ID.
   *
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const sql = `
      SELECT 
        a.id,
        a.title,
        a.body,
        a.body AS content,
        a.priority,
        a.category,
        a.status,
        a.published_at,
        a.created_by,
        a.created_at,
        u.name AS author_name,
        u.role AS author_role
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = $1;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Insert a new announcement.
   *
   * @param {Object} data
   * @param {string} data.title
   * @param {string} data.body
   * @param {number|null} [data.created_by]
   * @param {string} [data.priority='normal']
   * @param {string} [data.category='general']
   * @param {string} [data.status='published']
   * @param {Date|null} [data.published_at]
   * @returns {Promise<Object>}
   */
  async create({
    title,
    body,
    created_by,
    priority = 'normal',
    category = 'general',
    status = 'published',
    published_at = null,
  }) {
    const sql = `
      INSERT INTO announcements (title, body, created_by, priority, category, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, title, body, priority, category, status, created_by, published_at, created_at;
    `;
    const res = await query(sql, [
      title,
      body,
      created_by,
      priority,
      category,
      status,
      published_at,
    ]);
    return res.rows[0];
  },

  /**
   * Publish a draft announcement by ID.
   * Sets status to 'published' and published_at to NOW().
   *
   * @param {number|string} id
   * @returns {Promise<Object|null>}
   */
  async publish(id) {
    const sql = `
      UPDATE announcements
      SET status = 'published',
          published_at = NOW()
      WHERE id = $1
      RETURNING id, title, body, priority, category, status, created_by, published_at, created_at;
    `;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  },
};

module.exports = announcementsRepository;
