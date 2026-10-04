const { pool } = require('../../config/database');

/**
 * Fundraiser Repository
 * Handles all direct PostgreSQL interactions for fundraisers and real donation records.
 */
class FundraiserRepository {
  /**
   * Retrieves all public active/completed fundraisers with live real-time financial aggregates.
   * Excludes 'draft' and 'cancelled' unless explicitly requested by admin.
   */
  async getPublicFundraisers({
    status = null,
    search = '',
    page = null,
    pageSize = null,
    limit = null,
    offset = 0,
    sort = 'created_at',
    sortDirection = 'DESC',
  } = {}) {
    let whereConditions = ["f.status IN ('active', 'completed', 'paused')"];
    const values = [];

    if (status && ['active', 'completed', 'paused'].includes(status)) {
      values.push(status);
      whereConditions.push(`f.status = $${values.length}`);
    }

    if (search && search.trim()) {
      values.push(`%${search.trim()}%`);
      whereConditions.push(`(f.title ILIKE $${values.length} OR f.short_description ILIKE $${values.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const effectiveLimit = pageSize || limit;
    const isPaginated = effectiveLimit !== null && effectiveLimit !== undefined;

    let totalItems = 0;
    if (isPaginated) {
      const countSql = `SELECT COUNT(*)::int AS total FROM fundraisers f ${whereClause};`;
      const countRes = await pool.query(countSql, values);
      totalItems = countRes.rows[0] ? parseInt(countRes.rows[0].total, 10) : 0;
    }

    const safeSortCol = ['created_at', 'goal_amount', 'title', 'end_at', 'id'].includes(sort)
      ? `f.${sort}`
      : 'f.created_at';
    const safeDir = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let sql = `
      SELECT 
        f.id,
        f.public_id,
        f.slug,
        f.title,
        f.short_description,
        f.description,
        f.image_url,
        f.goal_amount,
        f.currency,
        f.status,
        f.start_at,
        f.end_at,
        f.created_at,
        f.updated_at,
        u.name AS organizer_name,
        (COALESCE(stats.gross_amount, 0) + COALESCE(fi.income_amount, 0))::numeric(12,2) AS gross_raised,
        COALESCE(stats.refunded_amount, 0)::numeric(12,2) AS refunded_amount,
        (COALESCE(stats.net_amount, 0) + COALESCE(fi.income_amount, 0))::numeric(12,2) AS total_raised,
        (COALESCE(stats.donor_count, 0) + COALESCE(fi.income_count, 0))::int AS donor_count,
        CASE 
          WHEN f.goal_amount > 0 THEN 
            ROUND(((COALESCE(stats.net_amount, 0) + COALESCE(fi.income_amount, 0)) / f.goal_amount * 100)::numeric, 1)
          ELSE 0.0 
        END AS percentage_raised
      FROM fundraisers f
      LEFT JOIN users u ON f.created_by = u.id
      LEFT JOIN (
        SELECT 
          fundraiser_id,
          SUM(CASE WHEN status IN ('paid', 'refunded') THEN amount ELSE 0 END) AS gross_amount,
          SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END) AS refunded_amount,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS net_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 ELSE NULL END) AS donor_count
        FROM donations
        GROUP BY fundraiser_id
      ) stats ON f.id = stats.fundraiser_id
      LEFT JOIN (
        SELECT 
          fundraiser_id,
          SUM(amount) AS income_amount,
          COUNT(*) AS income_count
        FROM fundraiser_income
        GROUP BY fundraiser_id
      ) fi ON f.id = fi.fundraiser_id
      ${whereClause}
      ORDER BY ${safeSortCol} ${safeDir}, f.id ${safeDir}
    `;

    const dataParams = [...values];
    if (isPaginated) {
      dataParams.push(effectiveLimit, offset);
      sql += ` LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    }

    const res = await pool.query(sql, dataParams);
    const rows = res.rows;

    if (isPaginated) {
      return {
        rows,
        totalItems,
      };
    }

    return rows;
  }

  /**
   * Retrieves all fundraisers for admin view, including drafts and cancelled, plus deep stats.
   */
  async getAdminFundraisers({
    status = null,
    search = '',
    page = null,
    pageSize = null,
    limit = null,
    offset = 0,
    sort = 'created_at',
    sortDirection = 'DESC',
  } = {}) {
    let whereConditions = [];
    const values = [];

    if (status) {
      values.push(status);
      whereConditions.push(`f.status = $${values.length}`);
    }

    if (search && search.trim()) {
      values.push(`%${search.trim()}%`);
      whereConditions.push(`(f.title ILIKE $${values.length} OR f.description ILIKE $${values.length})`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const effectiveLimit = pageSize || limit;
    const isPaginated = effectiveLimit !== null && effectiveLimit !== undefined;

    let totalItems = 0;
    if (isPaginated) {
      const countSql = `SELECT COUNT(*)::int AS total FROM fundraisers f ${whereClause};`;
      const countRes = await pool.query(countSql, values);
      totalItems = countRes.rows[0] ? parseInt(countRes.rows[0].total, 10) : 0;
    }

    const safeSortCol = ['created_at', 'goal_amount', 'title', 'end_at', 'id'].includes(sort)
      ? `f.${sort}`
      : 'f.created_at';
    const safeDir = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let sql = `
      SELECT 
        f.id,
        f.public_id,
        f.slug,
        f.title,
        f.short_description,
        f.description,
        f.image_url,
        f.goal_amount,
        f.currency,
        f.status,
        f.start_at,
        f.end_at,
        f.created_at,
        f.updated_at,
        u.name AS organizer_name,
        (COALESCE(stats.gross_amount, 0) + COALESCE(fi.income_amount, 0))::numeric(12,2) AS gross_raised,
        COALESCE(stats.refunded_amount, 0)::numeric(12,2) AS refunded_amount,
        (COALESCE(stats.net_amount, 0) + COALESCE(fi.income_amount, 0))::numeric(12,2) AS total_raised,
        (COALESCE(stats.donor_count, 0) + COALESCE(fi.income_count, 0))::int AS donor_count,
        COALESCE(stats.failed_count, 0)::int AS failed_count,
        COALESCE(stats.anonymous_count, 0)::int AS anonymous_count,
        COALESCE(
          (COALESCE(stats.net_amount, 0) + COALESCE(fi.income_amount, 0)) / NULLIF(COALESCE(stats.donor_count, 0) + COALESCE(fi.income_count, 0), 0),
          0
        )::numeric(10,2) AS avg_donation,
        CASE 
          WHEN f.goal_amount > 0 THEN 
            ROUND(((COALESCE(stats.net_amount, 0) + COALESCE(fi.income_amount, 0)) / f.goal_amount * 100)::numeric, 1)
          ELSE 0.0 
        END AS percentage_raised,
        COALESCE(task_stats.total_tasks, 0)::int AS total_tasks,
        COALESCE(task_stats.completed_tasks, 0)::int AS completed_tasks
      FROM fundraisers f
      LEFT JOIN users u ON f.created_by = u.id
      LEFT JOIN (
        SELECT 
          fundraiser_id,
          SUM(CASE WHEN status IN ('paid', 'refunded') THEN amount ELSE 0 END) AS gross_amount,
          SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END) AS refunded_amount,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS net_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 ELSE NULL END) AS donor_count,
          COUNT(CASE WHEN status = 'payment_failed' THEN 1 ELSE NULL END) AS failed_count,
          COUNT(CASE WHEN status = 'paid' AND anonymous = TRUE THEN 1 ELSE NULL END) AS anonymous_count,
          AVG(CASE WHEN status = 'paid' THEN amount ELSE NULL END) AS avg_donation
        FROM donations
        GROUP BY fundraiser_id
      ) stats ON f.id = stats.fundraiser_id
      LEFT JOIN (
        SELECT 
          fundraiser_id,
          SUM(amount) AS income_amount,
          COUNT(*) AS income_count
        FROM fundraiser_income
        GROUP BY fundraiser_id
      ) fi ON f.id = fi.fundraiser_id
      LEFT JOIN (
        SELECT 
          fundraiser_id,
          COUNT(*) AS total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 ELSE NULL END) AS completed_tasks
        FROM tasks
        GROUP BY fundraiser_id
      ) task_stats ON f.id = task_stats.fundraiser_id
      ${whereClause}
      ORDER BY ${safeSortCol} ${safeDir}, f.id ${safeDir}
    `;

    const dataParams = [...values];
    if (isPaginated) {
      dataParams.push(effectiveLimit, offset);
      sql += ` LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    }

    const res = await pool.query(sql, dataParams);
    const rows = res.rows;

    if (isPaginated) {
      return {
        rows,
        totalItems,
      };
    }

    return rows;
  }

  /**
   * Retrieves single fundraiser by ID or slug with real financial progress.
   */
  async getFundraiserByIdOrSlug(idOrSlug, client = pool) {
    const isNum = !isNaN(parseInt(idOrSlug, 10)) && /^\d+$/.test(String(idOrSlug));
    const param = isNum ? parseInt(idOrSlug, 10) : idOrSlug;

    const sql = `
      SELECT 
        f.id,
        f.public_id,
        f.slug,
        f.title,
        f.short_description,
        f.description,
        f.image_url,
        f.goal_amount,
        f.currency,
        f.status,
        f.start_at,
        f.end_at,
        f.created_at,
        f.updated_at,
        u.name AS organizer_name,
        (COALESCE(stats.gross_amount, 0) + COALESCE(fi.income_amount, 0))::numeric(12,2) AS gross_raised,
        COALESCE(stats.refunded_amount, 0)::numeric(12,2) AS refunded_amount,
        (COALESCE(stats.net_amount, 0) + COALESCE(fi.income_amount, 0))::numeric(12,2) AS total_raised,
        (COALESCE(stats.donor_count, 0) + COALESCE(fi.income_count, 0))::int AS donor_count,
        CASE 
          WHEN f.goal_amount > 0 THEN 
            ROUND(((COALESCE(stats.net_amount, 0) + COALESCE(fi.income_amount, 0)) / f.goal_amount * 100)::numeric, 1)
          ELSE 0.0 
        END AS percentage_raised
      FROM fundraisers f
      LEFT JOIN users u ON f.created_by = u.id
      LEFT JOIN (
        SELECT 
          fundraiser_id,
          SUM(CASE WHEN status IN ('paid', 'refunded') THEN amount ELSE 0 END) AS gross_amount,
          SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END) AS refunded_amount,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS net_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 ELSE NULL END) AS donor_count
        FROM donations
        GROUP BY fundraiser_id
      ) stats ON f.id = stats.fundraiser_id
      LEFT JOIN (
        SELECT 
          fundraiser_id,
          SUM(amount) AS income_amount,
          COUNT(*) AS income_count
        FROM fundraiser_income
        GROUP BY fundraiser_id
      ) fi ON f.id = fi.fundraiser_id
      WHERE ${isNum ? 'f.id = $1 OR f.public_id = $1::text' : 'f.slug = $1 OR f.public_id = $1'}
      LIMIT 1;
    `;

    const res = await client.query(sql, [param]);
    return res.rows[0] || null;
  }

  /**
   * Retrieves fundraiser row locked FOR UPDATE.
   */
  async getFundraiserByIdForUpdate(id, client) {
    const sql = `SELECT * FROM fundraisers WHERE id = $1 FOR UPDATE;`;
    const res = await client.query(sql, [id]);
    return res.rows[0] || null;
  }

  /**
   * Creates a new fundraiser campaign.
   */
  async createFundraiser({
    public_id,
    slug,
    title,
    short_description,
    description,
    image_url,
    goal_amount,
    currency = 'INR',
    status = 'active',
    start_at = new Date(),
    end_at = null,
    created_by = null,
  }) {
    const sql = `
      INSERT INTO fundraisers (
        public_id, slug, title, short_description, description, image_url,
        goal_amount, currency, status, start_at, end_at, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      public_id,
      slug,
      title,
      short_description,
      description,
      image_url,
      goal_amount,
      currency,
      status,
      start_at,
      end_at,
      created_by,
    ];
    const res = await pool.query(sql, values);
    return res.rows[0];
  }

  /**
   * Updates existing fundraiser.
   */
  async updateFundraiser(id, fields) {
    const setClauses = [];
    const values = [id];

    const allowed = [
      'title',
      'short_description',
      'description',
      'image_url',
      'goal_amount',
      'currency',
      'status',
      'start_at',
      'end_at',
      'slug',
    ];

    allowed.forEach((key) => {
      if (fields[key] !== undefined) {
        values.push(fields[key]);
        setClauses.push(`${key} = $${values.length}`);
      }
    });

    if (setClauses.length === 0) {
      return await this.getFundraiserByIdOrSlug(id);
    }

    setClauses.push(`updated_at = NOW()`);

    const sql = `
      UPDATE fundraisers
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;

    const res = await pool.query(sql, values);
    return res.rows[0];
  }

  /**
   * Creates a pending donation checkout session.
   */
  async createDonation({
    public_id,
    fundraiser_id,
    user_id = null,
    donor_name,
    donor_email,
    donor_phone,
    amount,
    currency = 'INR',
    status = 'pending',
    anonymous = false,
    message = null,
    payment_provider = 'online',
    payment_reference = null,
    idempotency_key = null,
  }, client = pool) {
    const sql = `
      INSERT INTO donations (
        public_id, fundraiser_id, user_id, donor_name, donor_email, donor_phone,
        amount, currency, status, anonymous, message, payment_provider,
        payment_reference, idempotency_key, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *;
    `;
    const values = [
      public_id,
      fundraiser_id,
      user_id,
      donor_name,
      donor_email,
      donor_phone,
      amount,
      currency,
      status,
      anonymous,
      message,
      payment_provider,
      payment_reference,
      idempotency_key,
    ];
    const res = await client.query(sql, values);
    return res.rows[0];
  }

  /**
   * Retrieves donation by internal ID or public_id.
   */
  async getDonationById(idOrPublicId, client = pool) {
    const isNum = !isNaN(parseInt(idOrPublicId, 10)) && /^\d+$/.test(String(idOrPublicId));
    const sql = `
      SELECT d.*, f.title AS fundraiser_title, f.slug AS fundraiser_slug, f.goal_amount AS fundraiser_goal
      FROM donations d
      JOIN fundraisers f ON d.fundraiser_id = f.id
      WHERE ${isNum ? 'd.id = $1 OR d.public_id = $1::text' : 'd.public_id = $1'}
      LIMIT 1;
    `;
    const res = await client.query(sql, [idOrPublicId]);
    return res.rows[0] || null;
  }

  /**
   * Retrieves donation by ID for transactional update.
   */
  async getDonationByIdForUpdate(id, client) {
    const sql = `
      SELECT d.*, f.title AS fundraiser_title
      FROM donations d
      JOIN fundraisers f ON d.fundraiser_id = f.id
      WHERE d.id = $1
      FOR UPDATE;
    `;
    const res = await client.query(sql, [id]);
    return res.rows[0] || null;
  }

  /**
   * Retrieves donation by Idempotency Key.
   */
  async getDonationByIdempotencyKey(key, client = pool) {
    if (!key) return null;
    const sql = `
      SELECT d.*, f.title AS fundraiser_title
      FROM donations d
      JOIN fundraisers f ON d.fundraiser_id = f.id
      WHERE d.idempotency_key = $1
      LIMIT 1;
    `;
    const res = await client.query(sql, [key]);
    return res.rows[0] || null;
  }

  /**
   * Marks a donation as paid.
   */
  async markDonationPaid(id, paymentReference = null, client = pool) {
    const sql = `
      UPDATE donations
      SET status = 'paid',
          payment_reference = COALESCE($2, payment_reference),
          paid_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const res = await client.query(sql, [id, paymentReference]);
    return res.rows[0];
  }

  /**
   * Marks a donation as failed.
   */
  async markDonationFailed(id, client = pool) {
    const sql = `
      UPDATE donations
      SET status = 'payment_failed',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const res = await client.query(sql, [id]);
    return res.rows[0];
  }

  /**
   * Refunds a donation.
   */
  async refundDonation(id, refundAmount, reason = null, refundedBy = null, client = pool) {
    const sql = `
      UPDATE donations
      SET status = 'refunded',
          refund_amount = $2,
          refund_reason = $3,
          refunded_by = $4,
          refunded_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const res = await client.query(sql, [id, refundAmount, reason, refundedBy]);
    return res.rows[0];
  }

  /**
   * Retrieves public recent donations for a campaign (masks anonymous donors).
   */
  async getPublicRecentDonations(fundraiserId, limit = 10) {
    const sql = `
      SELECT 
        id,
        public_id,
        CASE WHEN anonymous = TRUE THEN 'Anonymous Supporter' ELSE donor_name END AS donor_name,
        amount,
        currency,
        message,
        anonymous,
        paid_at,
        created_at
      FROM donations
      WHERE fundraiser_id = $1 AND status = 'paid'
      ORDER BY paid_at DESC NULLS LAST, created_at DESC
      LIMIT $2;
    `;
    const res = await pool.query(sql, [fundraiserId, limit]);
    return res.rows;
  }

  /**
   * Retrieves donations by user_id for logged-in user history ("My Donations").
   */
  async getDonationsByUserId(userId) {
    const sql = `
      SELECT 
        d.id,
        d.public_id,
        d.fundraiser_id,
        f.title AS fundraiser_title,
        f.slug AS fundraiser_slug,
        f.image_url AS fundraiser_image,
        d.amount,
        d.currency,
        d.status,
        d.anonymous,
        d.message,
        d.payment_reference,
        d.refund_amount,
        d.paid_at,
        d.refunded_at,
        d.created_at
      FROM donations d
      JOIN fundraisers f ON d.fundraiser_id = f.id
      WHERE d.user_id = $1
      ORDER BY d.created_at DESC;
    `;
    const res = await pool.query(sql, [userId]);
    return res.rows;
  }

  /**
   * Retrieves admin paginated and filtered donations list.
   */
  async getAdminDonations({
    fundraiserId = null,
    status = null,
    search = '',
    limit = 25,
    offset = 0,
  } = {}) {
    const where = [];
    const values = [];

    if (fundraiserId) {
      values.push(fundraiserId);
      where.push(`d.fundraiser_id = $${values.length}`);
    }

    if (status) {
      values.push(status);
      where.push(`d.status = $${values.length}`);
    }

    if (search && search.trim()) {
      values.push(`%${search.trim()}%`);
      where.push(`(
        d.donor_name ILIKE $${values.length} OR 
        d.donor_email ILIKE $${values.length} OR 
        d.public_id ILIKE $${values.length} OR 
        d.payment_reference ILIKE $${values.length}
      )`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS total_count
      FROM donations d
      ${whereClause};
    `;
    const countRes = await pool.query(countSql, values);
    const totalCount = parseInt(countRes.rows[0].total_count, 10) || 0;

    const queryValues = [...values, limit, offset];
    const dataSql = `
      SELECT 
        d.id,
        d.public_id,
        d.fundraiser_id,
        f.title AS fundraiser_title,
        d.user_id,
        u.name AS user_name,
        d.donor_name,
        d.donor_email,
        d.donor_phone,
        d.amount,
        d.currency,
        d.status,
        d.anonymous,
        d.message,
        d.payment_provider,
        d.payment_reference,
        d.refund_amount,
        d.refund_reason,
        d.paid_at,
        d.refunded_at,
        d.created_at
      FROM donations d
      JOIN fundraisers f ON d.fundraiser_id = f.id
      LEFT JOIN users u ON d.user_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${queryValues.length - 1} OFFSET $${queryValues.length};
    `;

    const dataRes = await pool.query(dataSql, queryValues);

    return {
      total: totalCount,
      limit,
      offset,
      data: dataRes.rows,
    };
  }

  /**
   * Real authoritative financial stats across all fundraisers for Admin/Treasurer dashboard.
   */
  async getGlobalFinancialStats() {
    const sql = `
      SELECT 
        (
          COALESCE((SELECT SUM(CASE WHEN status IN ('paid', 'refunded') THEN amount ELSE 0 END) FROM donations), 0) +
          COALESCE((SELECT SUM(amount) FROM fundraiser_income), 0)
        )::numeric(12,2) AS gross_donations,
        COALESCE((SELECT SUM(CASE WHEN status = 'refunded' THEN refund_amount ELSE 0 END) FROM donations), 0)::numeric(12,2) AS total_refunds,
        (
          COALESCE((SELECT SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) FROM donations), 0) +
          COALESCE((SELECT SUM(amount) FROM fundraiser_income), 0)
        )::numeric(12,2) AS net_raised,
        (
          COALESCE((SELECT COUNT(*) FROM donations WHERE status = 'paid'), 0) +
          COALESCE((SELECT COUNT(*) FROM fundraiser_income), 0)
        )::int AS successful_donations,
        COALESCE((SELECT COUNT(*) FROM donations WHERE status = 'payment_failed'), 0)::int AS failed_payments,
        COALESCE((SELECT COUNT(*) FROM donations WHERE status = 'paid' AND anonymous = TRUE), 0)::int AS anonymous_donations,
        COALESCE(
          ROUND(
            (
              (SELECT COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) FROM donations) +
              (SELECT COALESCE(SUM(amount), 0) FROM fundraiser_income)
            ) / NULLIF(
              (SELECT COUNT(*) FROM donations WHERE status = 'paid') + (SELECT COUNT(*) FROM fundraiser_income),
              0
            ),
            2
          ),
          0
        )::numeric(10,2) AS average_donation,
        (SELECT COUNT(*) FROM fundraisers WHERE status = 'active')::int AS active_campaigns_count,
        (SELECT COALESCE(SUM(goal_amount), 0)::numeric(12,2) FROM fundraisers WHERE status = 'active') AS active_campaigns_goal;
    `;
    const res = await pool.query(sql);
    return res.rows[0];
  }
}

module.exports = new FundraiserRepository();
