const { pool } = require('../../config/database');

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'session_token',
  'jwt',
  'secret',
  'secret_encrypted',
  'token_hash',
  'qr_payload',
  'card_number',
  'cvv',
]);

/**
 * Recursively strips sensitive fields from objects/JSON before writing to audit logs.
 */
function sanitizeAuditPayload(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeAuditPayload);
  }

  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      clean[key] = sanitizeAuditPayload(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

class AuditService {
  /**
   * Appends an immutable audit event to audit_logs table.
   */
  async recordLog({
    actorId = null,
    action,
    entityType,
    entityId = null,
    oldValue = null,
    newValue = null,
    metadata = {},
    req = null,
  }, client = pool) {
    try {
      const sanitizedOld = oldValue ? JSON.stringify(sanitizeAuditPayload(oldValue)) : null;
      const sanitizedNew = newValue ? JSON.stringify(sanitizeAuditPayload(newValue)) : null;
      const sanitizedMeta = JSON.stringify(sanitizeAuditPayload(metadata || {}));

      let ipAddress = null;
      let userAgent = null;
      let requestId = null;

      if (req) {
        ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || null;
        userAgent = req.headers ? (req.headers['user-agent'] || null) : null;
        requestId = req.id || req.requestId || (req.headers ? req.headers['x-request-id'] : null) || null;
        if (!actorId && req.user) {
          actorId = req.user.id || req.user.userId || null;
        }
      }

      const queryText = `
        INSERT INTO audit_logs (
          actor_user_id, action, entity_type, entity_id,
          old_value, new_value, metadata,
          ip_address, user_agent, request_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *;
      `;

      const res = await client.query(queryText, [
        actorId,
        action,
        entityType,
        entityId,
        sanitizedOld,
        sanitizedNew,
        sanitizedMeta,
        ipAddress,
        userAgent,
        requestId,
      ]);

      return res.rows[0];
    } catch (err) {
      console.warn('Audit log write error (non-fatal):', err.message);
      return null;
    }
  }

  /**
   * Retrieves paginated audit logs with search/filter options.
   */
  async getAuditLogs({ limit = 50, page = 1, entityType = null, action = null, actorId = null }) {
    const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (parsedPage - 1) * parsedLimit;

    const conditions = [];
    const values = [];

    if (entityType) {
      values.push(entityType);
      conditions.push(`al.entity_type = $${values.length}`);
    }

    if (action) {
      values.push(action);
      conditions.push(`al.action = $${values.length}`);
    }

    if (actorId) {
      values.push(parseInt(actorId, 10));
      conditions.push(`al.actor_user_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int as total FROM audit_logs al ${whereClause};`;
    const countRes = await pool.query(countQuery, values);
    const total = countRes.rows[0]?.total || 0;

    const queryText = `
      SELECT al.*, u.name as actor_name, u.email as actor_email, u.role as actor_role
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2};
    `;

    const res = await pool.query(queryText, [...values, parsedLimit, offset]);

    const totalPages = total > 0 ? Math.ceil(total / parsedLimit) : 0;
    return {
      data: res.rows,
      logs: res.rows,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
      pagination: {
        page: parsedPage,
        pageSize: parsedLimit,
        totalItems: total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPreviousPage: parsedPage > 1,
      },
    };
  }

  /**
   * Retrieves summary security statistics for the admin security dashboard.
   */
  async getSecurityOverview() {
    const recentLogsQuery = `
      SELECT al.*, u.name as actor_name, u.email as actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 20;
    `;
    const recentLogsRes = await pool.query(recentLogsQuery);

    const activeSessionsQuery = `
      SELECT COUNT(*)::int as active_sessions
      FROM user_sessions
      WHERE revoked_at IS NULL AND expires_at > NOW();
    `;
    const activeSessionsRes = await pool.query(activeSessionsQuery);

    const lockedUsersQuery = `
      SELECT id, name, email, role, failed_login_attempts, locked_until
      FROM users
      WHERE locked_until IS NOT NULL AND locked_until > NOW();
    `;
    const lockedUsersRes = await pool.query(lockedUsersQuery);

    const countsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE action = 'USER_LOGIN_FAILED' AND created_at > NOW() - INTERVAL '24 hours') as login_failures_24h,
        COUNT(*) FILTER (WHERE action = 'CHECKIN_REJECTED' AND created_at > NOW() - INTERVAL '24 hours') as checkin_failures_24h,
        COUNT(*) FILTER (WHERE action = 'SESSION_REVOKED' AND created_at > NOW() - INTERVAL '24 hours') as session_revocations_24h,
        COUNT(*) FILTER (WHERE action LIKE 'ADMIN_%' AND created_at > NOW() - INTERVAL '24 hours') as admin_actions_24h
      FROM audit_logs;
    `;
    const countsRes = await pool.query(countsQuery);

    return {
      activeSessions: activeSessionsRes.rows[0]?.active_sessions || 0,
      lockedUsers: lockedUsersRes.rows,
      stats24h: countsRes.rows[0] || {},
      recentLogs: recentLogsRes.rows,
    };
  }
}

module.exports = new AuditService();
