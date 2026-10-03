// backend/modules/membership/membership.service.js
const crypto = require('crypto');
const { pool } = require('../../db/connection');
const membershipRepository = require('./membership.repository');
const { isActiveMember } = require('../../shared/membership/isActiveMember');
const {
  getMembershipStatus,
  calculateDaysRemaining,
  determineExpiryCategory,
} = require('../../shared/membership/getMembershipStatus');
const { syncMembershipStatuses } = require('../../shared/membership/syncMembershipStatuses');
const { createTransaction } = require('../../shared/transactions/createTransaction');

class MembershipService {
  /**
   * Generate a unique, readable member code: SKY-MEM-XXXXXX
   *
   * @param {number|string} [userId]
   * @returns {string}
   */
  generateMemberCode(userId) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const idPart = userId ? String(userId).padStart(3, '0') : '000';
    return `SKY-MEM-${idPart}-${randomHex}`;
  }

  /**
   * Helper to format a membership database record with derived fields.
   */
  formatMembership(m) {
    if (!m) return null;
    const daysRemaining = calculateDaysRemaining(m.expiry_date);
    const isCurrentlyActive =
      m.status === 'active' &&
      m.dues_status === 'paid' &&
      m.expiry_date &&
      new Date(m.expiry_date) > new Date();

    const expiryCategory = determineExpiryCategory(isCurrentlyActive, daysRemaining, m.status);

    return {
      id: m.id,
      user_id: m.user_id,
      member_code: m.member_code,
      status: m.status,
      dues_status: m.dues_status,
      dues_amount: m.dues_amount,
      started_at: m.started_at,
      expiry_date: m.expiry_date,
      cancelled_at: m.cancelled_at,
      cancellation_reason: m.cancellation_reason,
      payment_timestamp: m.payment_timestamp,
      renewed_from_membership_id: m.renewed_from_membership_id,
      created_at: m.created_at,
      updated_at: m.updated_at,
      days_remaining: daysRemaining,
      daysRemaining,
      is_active: isCurrentlyActive,
      isActive: isCurrentlyActive,
      startedAt: m.started_at,
      expiryDate: m.expiry_date,
      expiryCategory,
      user_name: m.user_name || undefined,
      user_email: m.user_email || undefined,
      user_role: m.user_role || undefined,
    };
  }

  /**
   * Retrieve current membership for a user.
   */
  async getMembership(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    // Run expiry sync before returning status
    await syncMembershipStatuses().catch(() => {});

    const membership = await membershipRepository.findCurrentMembershipByUserId(userId);
    if (!membership) {
      return {
        exists: false,
        status: 'none',
        startedAt: null,
        expiryDate: null,
        daysRemaining: 0,
        isActive: false,
        expiryCategory: 'normal',
        is_active: false,
        computed_status: 'none',
        membership: null,
      };
    }

    const formatted = this.formatMembership(membership);
    return {
      exists: true,
      status: formatted.status,
      startedAt: formatted.started_at,
      expiryDate: formatted.expiry_date,
      daysRemaining: formatted.days_remaining,
      isActive: formatted.is_active,
      expiryCategory: formatted.expiryCategory,
      is_active: formatted.is_active,
      computed_status: formatted.status,
      membership: formatted,
    };
  }

  /**
   * Create a new membership in pending state.
   */
  async createMembership(userId, { dues_amount = 500.00 } = {}) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      const err = new Error('Invalid user ID');
      err.status = 400;
      throw err;
    }

    // Check if the user already has an active or pending membership
    const current = await membershipRepository.findCurrentMembershipByUserId(numericUserId);
    if (current && (current.status === 'active' || current.status === 'pending')) {
      const err = new Error(`User already has a ${current.status} membership (${current.member_code})`);
      err.status = 409;
      throw err;
    }

    const memberCode = this.generateMemberCode(numericUserId);

    const created = await membershipRepository.createMembership({
      user_id: numericUserId,
      member_code: memberCode,
      dues_amount,
      status: 'pending',
      dues_status: 'pending',
    });

    const full = await membershipRepository.findById(created.id);
    return this.formatMembership(full || created);
  }

  /**
   * Activate membership upon successful payment.
   * Transaction-safe and idempotent.
   */
  async payMembership(membershipId, { payment_mode = 'online' } = {}) {
    if (!membershipId) {
      const err = new Error('Membership ID is required');
      err.status = 400;
      throw err;
    }

    const id = parseInt(membershipId, 10);
    if (isNaN(id) || id <= 0) {
      const err = new Error('Invalid membership ID');
      err.status = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await membershipRepository.findById(id, client);
      if (!existing) {
        const err = new Error(`Membership with ID ${id} not found`);
        err.status = 404;
        throw err;
      }

      // Idempotency: do not activate twice if already active and paid
      if (existing.status === 'active' && existing.dues_status === 'paid') {
        const err = new Error('Membership is already active and paid');
        err.status = 409;
        throw err;
      }

      if (existing.status === 'cancelled') {
        const err = new Error('Cannot process payment for a cancelled membership');
        err.status = 400;
        throw err;
      }

      // Activate membership in DB (calculates expiry_date = started_at + 1 year via PostgreSQL)
      const updated = await membershipRepository.activateMembership(id, client);

      // Record transaction in ledger atomically
      const validPaymentModes = ['online', 'cash', 'upi', 'card'];
      const mode = validPaymentModes.includes(payment_mode) ? payment_mode : 'online';

      await createTransaction(
        {
          source_type: 'dues',
          source_id: updated.id,
          user_id: updated.user_id,
          amount: updated.dues_amount,
          direction: 'in',
          payment_mode: mode,
          status: 'paid',
        },
        client
      );

      await client.query('COMMIT');

      const fullUpdated = await membershipRepository.findById(updated.id);
      return this.formatMembership(fullUpdated || updated);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Backwards compatible payDues by userId.
   */
  async payDues(userId, paymentMode = 'online') {
    let current = await membershipRepository.findCurrentMembershipByUserId(userId);
    if (!current || (current.status !== 'pending' && current.status !== 'active')) {
      const created = await this.createMembership(userId);
      current = await membershipRepository.findById(created.id);
    }
    return this.payMembership(current.id, { payment_mode: paymentMode });
  }

  /**
   * Cancel membership.
   * Requires a non-empty cancellation reason.
   */
  async cancelMembership(membershipId, { reason }) {
    if (!membershipId) {
      const err = new Error('Membership ID is required');
      err.status = 400;
      throw err;
    }

    const id = parseInt(membershipId, 10);
    if (isNaN(id) || id <= 0) {
      const err = new Error('Invalid membership ID');
      err.status = 400;
      throw err;
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      const err = new Error('Cancellation reason is required');
      err.status = 400;
      throw err;
    }

    const existing = await membershipRepository.findById(id);
    if (!existing) {
      const err = new Error(`Membership with ID ${id} not found`);
      err.status = 404;
      throw err;
    }

    if (existing.status === 'cancelled') {
      const err = new Error('Membership is already cancelled');
      err.status = 400;
      throw err;
    }

    const cancelled = await membershipRepository.cancelMembership(id, reason.trim());
    const full = await membershipRepository.findById(cancelled.id);
    return this.formatMembership(full || cancelled);
  }

  /**
   * Renew an existing membership.
   * Creates a new pending membership linked via renewed_from_membership_id.
   */
  async renewMembership(membershipId, { dues_amount = 500.00 } = {}) {
    if (!membershipId) {
      const err = new Error('Previous membership ID is required');
      err.status = 400;
      throw err;
    }

    const id = parseInt(membershipId, 10);
    if (isNaN(id) || id <= 0) {
      const err = new Error('Invalid membership ID');
      err.status = 400;
      throw err;
    }

    const previous = await membershipRepository.findById(id);
    if (!previous) {
      const err = new Error(`Previous membership with ID ${id} not found`);
      err.status = 404;
      throw err;
    }

    const userId = previous.user_id;

    // Check if user currently has another active or pending membership
    const current = await membershipRepository.findCurrentMembershipByUserId(userId);
    if (current && current.id !== previous.id && (current.status === 'active' || current.status === 'pending')) {
      const err = new Error(`User already has an active or pending membership (${current.member_code})`);
      err.status = 409;
      throw err;
    }

    const newMemberCode = this.generateMemberCode(userId);

    const renewal = await membershipRepository.createMembership({
      user_id: userId,
      member_code: newMemberCode,
      dues_amount,
      status: 'pending',
      dues_status: 'pending',
      renewed_from_membership_id: previous.id,
    });

    const full = await membershipRepository.findById(renewal.id);
    return this.formatMembership(full || renewal);
  }

  /**
   * Retrieve complete membership history for a user (newest to oldest).
   */
  async getMembershipHistory(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    const numId = parseInt(userId, 10);
    if (isNaN(numId) || numId <= 0) {
      const err = new Error('Invalid user ID');
      err.status = 400;
      throw err;
    }

    const list = await membershipRepository.findMembershipHistory(numId);
    return list.map(m => this.formatMembership(m));
  }

  /**
   * Aggregated membership dashboard counts.
   */
  async getDashboard() {
    await syncMembershipStatuses().catch(() => {});
    return await membershipRepository.getDashboardCounts();
  }

  /**
   * Expiring memberships list.
   */
  async getExpiring(days = 30) {
    const list = await membershipRepository.getExpiringMemberships(days);
    return list.map(m => this.formatMembership(m));
  }

  /**
   * Digital Member Pass helper.
   */
  async getMemberPass(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    const membership = await membershipRepository.findCurrentMembershipByUserId(userId);
    if (!membership) {
      const err = new Error('No membership found for this user');
      err.status = 404;
      throw err;
    }

    const formatted = this.formatMembership(membership);
    return {
      membership_id: formatted.id,
      member_code: formatted.member_code,
      member_name: formatted.user_name,
      user_email: formatted.user_email,
      role: formatted.user_role,
      status: formatted.status,
      dues_status: formatted.dues_status,
      dues_amount: formatted.dues_amount,
      started_at: formatted.started_at,
      expiry_date: formatted.expiry_date,
      days_remaining: formatted.days_remaining,
      is_active: formatted.is_active,
    };
  }

  /**
   * Retrieve all memberships with optional filter.
   */
  async getAllMemberships(filter = {}) {
    await syncMembershipStatuses().catch(() => {});
    const list = await membershipRepository.findAll(filter);
    return list.map(m => this.formatMembership(m));
  }
}

module.exports = new MembershipService();
