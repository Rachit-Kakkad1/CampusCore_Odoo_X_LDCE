const { pool } = require('../../config/database');

/**
 * Auth Repository
 * Database queries for user accounts and authentication.
 */
class AuthRepository {
  /**
   * Inserts a new user into the database.
   */
  async createUser({ name, email, password_hash, role = 'member' }, client = pool) {
    const queryText = `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at;
    `;
    const result = await client.query(queryText, [name, email, password_hash, role]);
    return result.rows[0];
  }

  /**
   * Retrieves user by email, including password_hash for credential verification.
   */
  async getUserByEmail(email, client = pool) {
    const queryText = `
      SELECT id, name, email, password_hash, role, failed_login_attempts, locked_until, last_login_at, created_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const result = await client.query(queryText, [email]);
    return result.rows[0] || null;
  }

  /**
   * Retrieves safe user profile by ID (without password_hash) including phone, updated_at and membership.
   */
  async getUserById(id, client = pool) {
    const queryText = `
      SELECT 
        u.id, u.name, u.email, u.phone, u.role, u.created_at, u.updated_at,
        m.id AS membership_id, m.member_code, m.status AS membership_status,
        m.dues_status, m.dues_amount, m.expiry_date
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id
      WHERE u.id = $1;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Updates user profile fields (name, phone) safely.
   */
  async updateUserProfile(id, { name, phone }, client = pool) {
    const queryText = `
      UPDATE users
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, name, email, phone, role, created_at, updated_at;
    `;
    const result = await client.query(queryText, [name || null, phone !== undefined ? phone : null, id]);
    return result.rows[0] || null;
  }

  /**
   * Retrieves all users with associated membership information and counts.
   */
  async getAllUsers(filter = {}, client = pool) {
    const {
      role,
      search,
      page = null,
      pageSize = null,
      limit = null,
      offset = 0,
      sort = 'id',
      sortDirection = 'ASC',
    } = filter;

    const where = [];
    const params = [];

    if (role && role !== 'all' && role !== 'ALL') {
      params.push(role.toLowerCase());
      where.push(`LOWER(u.role) = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      where.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR m.member_code ILIKE $${idx})`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const effectiveLimit = pageSize || limit;
    const isPaginated = effectiveLimit !== null && effectiveLimit !== undefined;

    let totalItems = 0;
    if (isPaginated) {
      const countSql = `
        SELECT COUNT(DISTINCT u.id)::int AS total
        FROM users u
        LEFT JOIN memberships m ON u.id = m.user_id
        ${whereClause};
      `;
      const countRes = await client.query(countSql, params);
      totalItems = countRes.rows[0] ? parseInt(countRes.rows[0].total, 10) : 0;
    }

    const safeSortCol = ['id', 'name', 'email', 'role', 'created_at'].includes(sort)
      ? `u.${sort}`
      : 'u.id';
    const safeDir = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let queryText = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        m.id AS membership_id,
        m.member_code,
        m.status AS membership_raw_status,
        m.dues_status,
        m.dues_amount,
        m.started_at,
        m.expiry_date,
        CASE 
          WHEN m.id IS NULL THEN 'NO_MEMBERSHIP'
          WHEN m.status = 'cancelled' THEN 'CANCELLED'
          WHEN m.status = 'expired' OR (m.status = 'active' AND m.expiry_date <= NOW()) THEN 'EXPIRED'
          WHEN m.status = 'active' AND m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW()) THEN 'ACTIVE'
          WHEN m.dues_status = 'pending' THEN 'PENDING'
          ELSE UPPER(COALESCE(m.status, 'PENDING'))
        END AS membership_status,
        COALESCE((SELECT COUNT(*) FROM tickets t WHERE t.user_id = u.id), 0)::int AS ticket_count,
        COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id), 0)::int AS order_count
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) *
        FROM memberships
        ORDER BY user_id, 
          CASE status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'expired' THEN 3
            WHEN 'cancelled' THEN 4
            ELSE 5
          END,
          created_at DESC
      ) m ON u.id = m.user_id
      ${whereClause}
      ORDER BY ${safeSortCol} ${safeDir}, u.id ${safeDir}
    `;

    const dataParams = [...params];
    if (isPaginated) {
      dataParams.push(effectiveLimit, offset);
      queryText += ` LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    }

    const result = await client.query(queryText, dataParams);
    const rows = result.rows;

    if (isPaginated) {
      return {
        rows,
        totalItems,
      };
    }

    return rows;
  }

  /**
   * Updates a user's role.
   */
  async updateUserRole(id, role, client = pool) {
    const queryText = `
      UPDATE users
      SET role = $2
      WHERE id = $1
      RETURNING id, name, email, role, created_at;
    `;
    const result = await client.query(queryText, [id, role]);
    return result.rows[0] || null;
  }

  /**
   * Deletes a user by ID.
   */
  async deleteUser(id, client = pool) {
    const queryText = `
      DELETE FROM users
      WHERE id = $1
      RETURNING id, name, email, role;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Aggregates user metrics for dashboard analytics.
   */
  async getUserStats(client = pool) {
    const totalUsersRes = await client.query('SELECT COUNT(*)::int AS total FROM users');
    const rolesRes = await client.query(`
      SELECT role, COUNT(*)::int AS count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);
    const membershipStatusRes = await client.query(`
      SELECT 
        CASE 
          WHEN m.id IS NULL THEN 'NO_MEMBERSHIP'
          WHEN m.status = 'cancelled' THEN 'CANCELLED'
          WHEN m.status = 'expired' OR (m.status = 'active' AND m.expiry_date <= NOW()) THEN 'EXPIRED'
          WHEN m.status = 'active' AND m.dues_status = 'paid' AND (m.expiry_date IS NULL OR m.expiry_date > NOW()) THEN 'ACTIVE'
          WHEN m.dues_status = 'pending' THEN 'PENDING'
          ELSE UPPER(COALESCE(m.status, 'PENDING'))
        END AS status,
        COUNT(*)::int AS count
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) *
        FROM memberships
        ORDER BY user_id, 
          CASE status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'expired' THEN 3
            WHEN 'cancelled' THEN 4
            ELSE 5
          END,
          created_at DESC
      ) m ON u.id = m.user_id
      GROUP BY 1
    `);
    
    const timelineRes = await client.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*)::int AS count
      FROM users
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `);

    return {
      totalUsers: totalUsersRes.rows[0].total,
      roleDistribution: rolesRes.rows,
      membershipDistribution: membershipStatusRes.rows,
      timeline: timelineRes.rows,
    };
  }
}

module.exports = new AuthRepository();
