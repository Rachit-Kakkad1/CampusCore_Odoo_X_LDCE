const { pool } = require('../../config/database');

/**
 * Membership Repository
 * Direct PostgreSQL queries for memberships and member passes.
 */
class MembershipRepository {
  async getMembershipByUserId(userId, client = pool) {
    const queryText = `
      SELECT m.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.user_id = $1;
    `;
    const result = await client.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  async getMembershipByUserIdForUpdate(userId, client) {
    const queryText = `
      SELECT *
      FROM memberships
      WHERE user_id = $1
      FOR UPDATE;
    `;
    const result = await client.query(queryText, [userId]);
    return result.rows[0] || null;
  }

  async getMembershipByCode(memberCode, client = pool) {
    const queryText = `
      SELECT m.*, u.name as user_name, u.email as user_email, u.role as user_role,
             (m.dues_status = 'paid' AND m.expiry_date >= CURRENT_DATE) as is_active,
             (m.dues_status = 'paid' AND m.expiry_date < CURRENT_DATE) as is_expired
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE UPPER(m.member_code) = UPPER($1);
    `;
    const result = await client.query(queryText, [memberCode]);
    return result.rows[0] || null;
  }

  async createMembership({ user_id, member_code, dues_amount = 500.00, dues_status = 'pending' }, client = pool) {
    const queryText = `
      INSERT INTO memberships (user_id, member_code, dues_amount, dues_status, start_date, expiry_date, paid_at)
      VALUES ($1, $2, $3, $4, NULL, NULL, NULL)
      ON CONFLICT (user_id) DO UPDATE SET dues_amount = EXCLUDED.dues_amount
      RETURNING *;
    `;
    const result = await client.query(queryText, [user_id, member_code, dues_amount, dues_status]);
    return result.rows[0];
  }

  async updateMembershipPaid(membershipId, startDate, expiryDate, client) {
    const queryText = `
      UPDATE memberships
      SET dues_status = 'paid', start_date = $1, expiry_date = $2, paid_at = NOW()
      WHERE id = $3
      RETURNING *;
    `;
    const result = await client.query(queryText, [startDate, expiryDate, membershipId]);
    return result.rows[0];
  }

  async updateUserRole(userId, role, client) {
    const queryText = `
      UPDATE users
      SET role = $1
      WHERE id = $2
      RETURNING id, name, email, role;
    `;
    const result = await client.query(queryText, [role, userId]);
    return result.rows[0];
  }

  async getExpiringMemberships(client = pool) {
    const queryText = `
      SELECT m.*, u.name as user_name, u.email as user_email
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.dues_status = 'paid'
        AND m.expiry_date <= (CURRENT_DATE + INTERVAL '60 days')
      ORDER BY m.expiry_date ASC;
    `;
    const result = await client.query(queryText);
    return result.rows;
  }

  async getAllMembers(client = pool) {
    const queryText = `
      SELECT m.id, m.member_code, m.dues_amount, m.dues_status, m.start_date, m.expiry_date, m.paid_at,
             u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role,
             (m.dues_status = 'paid' AND m.expiry_date >= CURRENT_DATE) as is_active,
             (m.dues_status = 'paid' AND m.expiry_date < CURRENT_DATE) as is_expired
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC;
    `;
    const result = await client.query(queryText);
    return result.rows;
  }
}

module.exports = new MembershipRepository();
