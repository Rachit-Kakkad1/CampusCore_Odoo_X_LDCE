const crypto = require('crypto');
const { pool } = require('../../config/database');
const membershipRepository = require('./membership.repository');
const { getMembershipStatus, isActiveMember } = require('../../shared/membership/isActiveMember');
const syncMembershipStatuses = require('../../shared/membership/syncMembershipStatuses');
const createTransaction = require('../../shared/transactions/createTransaction');

/**
 * Membership Service
 * Business logic for student memberships, dues payment, automatic expiry,
 * cancellation, renewals, and administrator dashboard reporting.
 */
class MembershipService {
  /**
   * Retrieves current user's membership details and badge status.
   */
  async getMyMembership(userId) {
    await syncMembershipStatuses();
    const membershipInfo = await getMembershipStatus(userId);
    return membershipInfo;
  }

  /**
   * Pays annual membership dues atomically.
   * If member has an existing pending membership, activates it.
   * If existing membership was expired or cancelled, creates a linked renewal record.
   * Automatically calculates expiry date as NOW() + INTERVAL '1 year'.
   * Records exactly one dues transaction in the ledger.
   */
  async payDues(userId, paymentMode = 'online') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Sync expiry statuses before checking
      await syncMembershipStatuses(client);

      // 2. Fetch latest membership record with row-level lock
      let membership = await membershipRepository.getMembershipByUserIdForUpdate(userId, client);

      const now = new Date();
      const currentYear = now.getFullYear();

      if (!membership) {
        // Create first pending membership
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
      } else if (membership.status === 'active' && membership.dues_status === 'paid' && membership.expiry_date) {
        const expiry = new Date(membership.expiry_date);
        if (expiry > now) {
          const err = new Error('Membership is already active and paid for the current year');
          err.code = 'MEMBERSHIP_ALREADY_ACTIVE';
          err.status = 400;
          throw err;
        }
      }

      let activeMembership;

      if (membership.status === 'expired' || membership.status === 'cancelled') {
        // Renewal flow: preserve old membership and create linked new period
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const memberCode = `MEM-${currentYear}-${randomSuffix}`;
        const newPeriod = await membershipRepository.createMembership(
          {
            user_id: userId,
            member_code: memberCode,
            dues_amount: 500.00,
            dues_status: 'pending',
            renewed_from_membership_id: membership.id,
          },
          client
        );
        activeMembership = await membershipRepository.activateMembership(newPeriod.id, client);
      } else {
        // Pending membership activation
        activeMembership = await membershipRepository.activateMembership(membership.id, client);
      }

      // Record transaction
      const transaction = await createTransaction(
        {
          source_type: 'dues',
          source_id: activeMembership.id,
          user_id: userId,
          amount: activeMembership.dues_amount,
          direction: 'in',
          payment_mode: paymentMode,
          status: 'paid',
        },
        client
      );

      await client.query('COMMIT');

      return {
        message: 'Membership dues paid successfully',
        membership: activeMembership,
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
   * Cancels a membership.
   * Does NOT delete the membership row to preserve audit trail.
   */
  async cancelMembership(userId, cancellationReason = 'Member requested cancellation') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const membership = await membershipRepository.getMembershipByUserIdForUpdate(userId, client);
      if (!membership) {
        const err = new Error('No membership found for this user');
        err.code = 'MEMBERSHIP_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      if (membership.status === 'cancelled') {
        const err = new Error('Membership is already cancelled');
        err.code = 'MEMBERSHIP_ALREADY_CANCELLED';
        err.status = 400;
        throw err;
      }

      const cancelled = await membershipRepository.cancelMembership(membership.id, cancellationReason, client);

      await client.query('COMMIT');

      return {
        message: 'Membership cancelled successfully',
        membership: cancelled,
        status: 'CANCELLED',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Explicit renewal flow linking to previous membership.
   */
  async renewMembership(userId, paymentMode = 'online') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await syncMembershipStatuses(client);

      const oldMembership = await membershipRepository.getMembershipByUserIdForUpdate(userId, client);
      if (!oldMembership) {
        const err = new Error('No previous membership found to renew');
        err.code = 'MEMBERSHIP_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      const currentYear = new Date().getFullYear();
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const memberCode = `MEM-${currentYear}-${randomSuffix}`;

      // Create linked renewal period
      const newMembership = await membershipRepository.createMembership(
        {
          user_id: userId,
          member_code: memberCode,
          dues_amount: 500.00,
          dues_status: 'pending',
          renewed_from_membership_id: oldMembership.id,
        },
        client
      );

      // Activate using PostgreSQL interval
      const activatedMembership = await membershipRepository.activateMembership(newMembership.id, client);

      // Record transaction
      const transaction = await createTransaction(
        {
          source_type: 'dues',
          source_id: activatedMembership.id,
          user_id: userId,
          amount: activatedMembership.dues_amount,
          direction: 'in',
          payment_mode: paymentMode,
          status: 'paid',
        },
        client
      );

      await client.query('COMMIT');

      return {
        message: 'Membership renewed successfully',
        membership: activatedMembership,
        renewed_from_membership_id: oldMembership.id,
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
    await syncMembershipStatuses();
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
      status: membershipInfo.status,
      started_at: membership.started_at,
      expiry_date: membership.expiry_date,
      days_remaining: membershipInfo.days_remaining,
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

    await syncMembershipStatuses();

    const member = await membershipRepository.getMembershipByCode(memberCode);
    if (!member) {
      const err = new Error('Member code not found');
      err.code = 'MEMBER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    let status = (member.status || 'pending').toUpperCase();
    if (member.is_active) status = 'ACTIVE';
    else if (member.is_expired) status = 'EXPIRED';

    return {
      valid: Boolean(member.is_active),
      status,
      member_code: member.member_code,
      name: member.user_name,
      email: member.user_email,
      started_at: member.started_at,
      expiry_date: member.expiry_date,
    };
  }

  /**
   * Returns membership dashboard statistics.
   */
  async getExpiryDashboard() {
    await syncMembershipStatuses();
    return await membershipRepository.getExpiryDashboard();
  }

  /**
   * Returns list of memberships expiring within 30 days.
   */
  async getExpiringMemberships() {
    await syncMembershipStatuses();
    return await membershipRepository.getExpiringMemberships();
  }

  /**
   * Returns full membership roster for administrators with optional filtering.
   */
  async getAllMembers(filters = {}) {
    await syncMembershipStatuses();
    return await membershipRepository.getAllMembers(filters);
  }

  /**
   * Returns complete renewal history for a user.
   */
  async getRenewalHistory(userId) {
    return await membershipRepository.getRenewalHistory(userId);
  }

  /**
   * Explicitly runs synchronization of membership statuses.
   */
  async syncStatuses() {
    return await syncMembershipStatuses();
  }
}

module.exports = new MembershipService();
