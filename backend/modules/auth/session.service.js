const crypto = require('crypto');
const { pool } = require('../../config/database');
const auditService = require('../../shared/audit/audit.service');

const SESSION_TTL_DAYS = 7;

class SessionService {
  /**
   * Creates a new user session and stores device metadata.
   */
  async createSession(userId, req) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const ipAddress = req?.ip || req?.connection?.remoteAddress || req?.headers?.['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Unknown Device';

    // Simple device parsing
    let deviceInfo = 'Desktop';
    if (/mobile/i.test(userAgent)) deviceInfo = 'Mobile Device';
    else if (/tablet/i.test(userAgent)) deviceInfo = 'Tablet';
    else if (/postman|curl|insomnia/i.test(userAgent)) deviceInfo = 'API Client';

    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

    const queryText = `
      INSERT INTO user_sessions (
        session_token, user_id, ip_address, user_agent, device_info,
        created_at, last_seen_at, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
      RETURNING *;
    `;

    const res = await pool.query(queryText, [
      sessionToken,
      userId,
      ipAddress,
      userAgent.slice(0, 500),
      deviceInfo,
      expiresAt,
    ]);

    await auditService.recordLog({
      actorId: userId,
      action: 'SESSION_CREATED',
      entityType: 'session',
      entityId: res.rows[0].id,
      metadata: { deviceInfo, ipAddress },
      req,
    });

    return res.rows[0];
  }

  /**
   * Retrieves all active sessions for a user.
   */
  async getUserSessions(userId, currentSessionToken = null) {
    const queryText = `
      SELECT id, session_token, user_id, ip_address, user_agent, device_info, created_at, last_seen_at, expires_at, revoked_at
      FROM user_sessions
      WHERE user_id = $1
      ORDER BY last_seen_at DESC;
    `;
    const res = await pool.query(queryText, [userId]);

    return res.rows.map((s) => {
      const isCurrent = currentSessionToken ? s.session_token === currentSessionToken : false;
      const { session_token, ...safeSession } = s;
      return {
        ...safeSession,
        is_current: isCurrent,
        is_active: !s.revoked_at && new Date(s.expires_at) > new Date(),
      };
    });
  }

  /**
   * Revokes a single session.
   */
  async revokeSession(sessionId, userId, adminActorId = null, req = null) {
    const targetSessionId = parseInt(sessionId, 10);
    if (isNaN(targetSessionId)) {
      const err = new Error('Invalid session ID');
      err.status = 400;
      throw err;
    }

    const sessionQuery = `SELECT * FROM user_sessions WHERE id = $1;`;
    const sessionRes = await pool.query(sessionQuery, [targetSessionId]);
    if (sessionRes.rows.length === 0) {
      const err = new Error('Session not found');
      err.status = 404;
      throw err;
    }

    const session = sessionRes.rows[0];
    if (userId && session.user_id !== userId && !adminActorId) {
      const err = new Error('Unauthorized to revoke this session');
      err.status = 403;
      throw err;
    }

    const updateQuery = `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const updatedRes = await pool.query(updateQuery, [targetSessionId]);

    await auditService.recordLog({
      actorId: adminActorId || userId,
      action: 'SESSION_REVOKED',
      entityType: 'session',
      entityId: targetSessionId,
      metadata: { target_user_id: session.user_id },
      req,
    });

    return updatedRes.rows[0];
  }

  /**
   * Revokes all other sessions except the current one.
   */
  async revokeOtherSessions(userId, currentSessionToken, req = null) {
    const queryText = `
      UPDATE user_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1 AND session_token != $2 AND revoked_at IS NULL
      RETURNING id;
    `;
    const res = await pool.query(queryText, [userId, currentSessionToken]);

    await auditService.recordLog({
      actorId: userId,
      action: 'SESSION_REVOKE_OTHERS',
      entityType: 'user',
      entityId: userId,
      metadata: { revokedCount: res.rowCount },
      req,
    });

    return { revokedCount: res.rowCount };
  }

  /**
   * Checks whether a session token is revoked or expired.
   */
  async isSessionRevoked(sessionToken) {
    if (!sessionToken) return false;
    const queryText = `
      SELECT revoked_at, expires_at
      FROM user_sessions
      WHERE session_token = $1;
    `;
    const res = await pool.query(queryText, [sessionToken]);
    if (res.rows.length === 0) return true; // Unknown token -> treat as revoked

    const row = res.rows[0];
    if (row.revoked_at !== null) return true;
    if (new Date(row.expires_at) <= new Date()) return true;

    return false;
  }

  /**
   * Updates last_seen_at for active session.
   */
  async touchSession(sessionToken) {
    if (!sessionToken) return;
    await pool.query(
      `UPDATE user_sessions SET last_seen_at = NOW() WHERE session_token = $1 AND revoked_at IS NULL;`,
      [sessionToken]
    ).catch(() => {});
  }
}

module.exports = new SessionService();
