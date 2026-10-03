const { pool } = require('../../config/database');

/**
 * Membership Repository
 * Direct PostgreSQL queries for memberships and member lifecycle operations.
 */
class MembershipRepository {
  async getMembershipByUserId(userId, client = pool) {
    const queryText = `
      SELECT m.*, u.name as user_name, u.email as user_email, u.role as user_role,
             (m.status = 'active' AND m.dues_status = 'paid' AND m.expiry_date > NOW()) as is_active,
             (m.status = 'expired' OR (m.status = 'active' AND m.expiry_date <= NOW())) as is_expired
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1
      ORDER BY
        CASE m.status
          WHEN 'active' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'expired' THEN 3
          WHEN 'cancelled' THEN 4
          ELSE 5
        END, m.id DESC
      LIMIT 1;
    `;
    const result = await client.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  async getMembershipById(id, client = pool) {
    const queryText = `
      SELECT m.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  async getMembershipByUserIdForUpdate(userId, client) {
    const queryText = `
      SELECT *
      FROM memberships
      WHERE user_id = $1
      ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'expired' THEN 3
          WHEN 'cancelled' THEN 4
          ELSE 5
        END, id DESC
      LIMIT 1
      FOR UPDATE;
    `;
    const result = await client.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  async getMembershipByCode(memberCode, client = pool) {
    const queryText = `
      SELECT m.*, u.name as user_name, u.email as user_email, u.role as user_role,
             (m.status = 'active' AND m.dues_status = 'paid' AND m.expiry_date > NOW()) as is_active,
             (m.status = 'expired' OR (m.status = 'active' AND m.expiry_date <= NOW())) as is_expired
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE UPPER(m.member_code) = UPPER($1);
    `;
    const result = await client.query(queryText, [memberCode]);
    return result.rows[0] || null;
  }

  async createMembership(
    { user_id, member_code, dues_amount = 500.00, dues_status = 'pending', renewed_from_membership_id = null },
    client = pool
  ) {
    const queryText = `
      INSERT INTO memberships (
        user_id, member_code, status, dues_status, dues_amount,
        renewed_from_membership_id, created_at, updated_at
      )
      VALUES ($1, $2, 'pending', $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;
    const result = await client.query(queryText, [
      user_id,
      member_code,
      dues_status,
      dues_amount,
      renewed_from_membership_id,
    ]);
    return result.rows[0];
  }

  /**
   * Activates a membership using PostgreSQL interval arithmetic:
   * started_at = NOW()
   * expiry_date = NOW() + INTERVAL '1 year'
   */
  async activateMembership(membershipId, client = pool) {
    const queryText = `
      UPDATE memberships
      SET
        started_at = NOW(),
        expiry_date = NOW() + INTERVAL '1 year',
        status = 'active',
        dues_status = 'paid',
        payment_timestamp = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await client.query(queryText, [membershipId]);
    return result.rows[0];
  }

  /**
   * Cancels a membership while preserving row history for auditability.
   */
  async cancelMembership(membershipId, cancellationReason = 'Member requested cancellation', client = pool) {
    const queryText = `
      UPDATE memberships
      SET
        status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const result = await client.query(queryText, [membershipId, cancellationReason]);
    return result.rows[0];
  }

  /**
   * Aggregates dashboard statistics for administrator overview.
   */
  async getExpiryDashboard(client = pool) {
    const queryText = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW())::int AS total_active,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW() AND expiry_date <= NOW() + INTERVAL '7 days')::int AS expiring_7_days,
        COUNT(*) FILTER (WHERE status = 'active' AND expiry_date > NOW() AND expiry_date <= NOW() + INTERVAL '30 days')::int AS expiring_30_days,
        COUNT(*) FILTER (WHERE status = 'expired' OR (status = 'active' AND expiry_date <= NOW()))::int AS expired,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM memberships;
    `;
    const result = await client.query(queryText);
    return result.rows[0];
  }

  async getExpiringMemberships(client = pool) {
    const queryText = `
      SELECT m.*, u.name as user_name, u.email as user_email
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'active'
        AND m.expiry_date > NOW()
        AND m.expiry_date <= NOW() + INTERVAL '30 days'
      ORDER BY m.expiry_date ASC;
    `;
    const result = await client.query(queryText);
    return result.rows;
  }

  async getAllMembers({ status = null, search = null } = {}, client = pool) {
    const queryText = `
      SELECT m.id, m.user_id, m.member_code, m.status, m.dues_status, m.dues_amount,
             m.started_at, m.expiry_date, m.cancelled_at, m.cancellation_reason,
             m.payment_timestamp, m.renewed_from_membership_id, m.created_at, m.updated_at,
             u.name as user_name, u.email as user_email, u.role as user_role,
             (m.status = 'active' AND m.dues_status = 'paid' AND m.expiry_date > NOW()) as is_active,
             GREATEST(0, CEIL(EXTRACT(EPOCH FROM (m.expiry_date - NOW())) / 86400))::int as days_remaining
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE ($1::varchar IS NULL OR m.status = $1)
        AND (
          $2::varchar IS NULL
          OR u.name ILIKE '%' || $2 || '%'
          OR u.email ILIKE '%' || $2 || '%'
          OR m.member_code ILIKE '%' || $2 || '%'
        )
      ORDER BY m.created_at DESC;
    `;
    const result = await client.query(queryText, [status, search]);
    return result.rows;
  }

  async getRenewalHistory(userId, client = pool) {
    const queryText = `
      SELECT m.id, m.member_code, m.status, m.dues_status, m.dues_amount,
             m.started_at, m.expiry_date, m.cancelled_at, m.cancellation_reason,
             m.payment_timestamp, m.renewed_from_membership_id, m.created_at, m.updated_at
      FROM memberships m
      WHERE m.user_id = $1
      ORDER BY m.id ASC;
    `;
    const result = await client.query(queryText, [userId]);
    return result.rows;
  }
}

module.exports = new MembershipRepository();
