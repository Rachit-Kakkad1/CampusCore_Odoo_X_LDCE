const crypto = require('crypto');
const { pool } = require('../../config/database');
const membershipRepository = require('./membership.repository');
const { getMembershipStatus, isActiveMember } = require('../../shared/membership/isActiveMember');
const createTransaction = require('../../shared/transactions/createTransaction');

/**
 * Membership Service
 * Business logic for student memberships, dues payment, and renewal tracking.
 */
class MembershipService {
  /**
   * Retrieves current user's membership details and badge status.
   */
  async getMyMembership(userId) {
    const membershipInfo = await getMembershipStatus(userId);
    return membershipInfo;
  }

  /**
   * Pays annual membership dues atomically.
   * Updates dues_status, sets validity through Dec 31 of current year,
   * upgrades role to member (if guest), and records one dues transaction.
   */
  async payDues(userId, paymentMode = 'online') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Fetch or create membership record with lock
      let membership = await membershipRepository.getMembershipByUserIdForUpdate(userId, client);

      if (!membership) {
        const currentYear = new Date().getFullYear();
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const memberCode = `MEM-${currentYear}-${randomSuffix}`;
        membership = await membershipRepository.createMembership(
          {
            user_id: userId,
            member_code: memberCode,
            dues_amount: 500.00,
            dues_status: 'pending',
          },
          client
        );
      }

      // 2. Check if already active
      const now = new Date();
      if (membership.dues_status === 'paid' && membership.expiry_date) {
        const expiry = new Date(membership.expiry_date);
        if (expiry >= now) {
          const err = new Error('Membership is already active and paid for the current year');
          err.code = 'MEMBERSHIP_ALREADY_ACTIVE';
          err.status = 400;
          throw err;
        }
      }

      // 3. Set start date to today and expiry to Dec 31 of current year
      const currentYear = now.getFullYear();
      const todayISO = now.toISOString().split('T')[0];
      const expiryISO = `${currentYear}-12-31`;

      const updatedMembership = await membershipRepository.updateMembershipPaid(
        membership.id,
        todayISO,
        expiryISO,
        client
      );

      // 4. Upgrade user role to 'member' if user is currently 'guest'
      const userRes = await client.query('SELECT role FROM users WHERE id = $1;', [userId]);
      const currentRole = userRes.rows[0]?.role;
      if (currentRole === 'guest') {
        await membershipRepository.updateUserRole(userId, 'member', client);
      }

      // 5. Create exactly one dues transaction via shared createTransaction
      const transaction = await createTransaction(
        {
          source_type: 'dues',
          source_id: updatedMembership.id,
          user_id: userId,
          amount: updatedMembership.dues_amount,
          direction: 'in',
          payment_mode: paymentMode,
          status: 'paid',
        },
        client
      );

      await client.query('COMMIT');

      return {
        message: 'Membership dues paid successfully',
        membership: updatedMembership,
        transaction,
        status: 'ACTIVE',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves digital member pass details for the user.
   */
  async getMemberPass(userId) {
    const membershipInfo = await getMembershipStatus(userId);
    if (!membershipInfo.membership) {
      const err = new Error('No membership found for this user');
      err.code = 'MEMBERSHIP_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const membership = await membershipRepository.getMembershipByUserId(userId);
    return {
      name: membership.user_name,
      email: membership.user_email,
      member_code: membership.member_code,
      status: membershipInfo.status, // 'ACTIVE', 'EXPIRED', 'PENDING'
      start_date: membership.start_date,
      expiry_date: membership.expiry_date,
      dues_amount: membership.dues_amount,
    };
  }

  /**
   * Public/staff verification of a member code.
   */
  async verifyMemberCode(memberCode) {
    if (!memberCode) {
      const err = new Error('Member code is required');
      err.code = 'MISSING_CODE';
      err.status = 400;
      throw err;
    }

    const member = await membershipRepository.getMembershipByCode(memberCode);
    if (!member) {
      const err = new Error('Member code not found');
      err.code = 'MEMBER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    let status = 'PENDING';
    if (member.is_active) status = 'ACTIVE';
    else if (member.is_expired) status = 'EXPIRED';

    return {
      valid: member.is_active,
      status,
      member_code: member.member_code,
      name: member.user_name,
      email: member.user_email,
      start_date: member.start_date,
      expiry_date: member.expiry_date,
    };
  }

  /**
   * Returns list of memberships expiring within 60 days (for renewal reminders).
   */
  async getExpiringMemberships() {
    return await membershipRepository.getExpiringMemberships();
  }

  /**
   * Returns full membership roster for administrators.
   */
  async getAllMembers() {
    return await membershipRepository.getAllMembers();
  }
}

module.exports = new MembershipService();
