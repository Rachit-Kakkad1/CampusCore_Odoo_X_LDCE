// backend/modules/membership/membership.service.js
const crypto = require('crypto');
const { pool } = require('../../config/database');
const membershipRepository = require('./membership.repository');
const { isActiveMember } = require('../../shared/membership/isActiveMember');
const {
  getMembershipStatus,
  calculateDaysRemaining,
  determineExpiryCategory,
  computeStatus,
} = require('../../shared/membership/getMembershipStatus');
const { createTransaction } = require('../../shared/transactions/createTransaction');

class MembershipService {
  generateMemberCode(userId) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const idPart = userId ? String(userId).padStart(3, '0') : '000';
    return `SKY-MEM-${idPart}-${randomHex}`;
  }

  formatMembership(m) {
    if (!m) return null;
    const computed = computeStatus(m);
    const daysRemaining = calculateDaysRemaining(m.expiry_date);
    const isCurrentlyActive = computed === 'ACTIVE';

    const expiryCategory = determineExpiryCategory(isCurrentlyActive, daysRemaining, m.status);

    return {
      id: m.id,
      user_id: m.user_id,
      member_code: m.member_code,
      status: computed.toLowerCase(),
      computed_status: computed,
      dues_status: m.dues_status,
      dues_amount: m.dues_amount,
      start_date: m.started_at || m.start_date,
      started_at: m.started_at || m.start_date,
      expiry_date: m.expiry_date,
      paid_at: m.payment_timestamp || m.paid_at,
      payment_timestamp: m.payment_timestamp || m.paid_at,
      created_at: m.created_at,
      updated_at: m.updated_at,
      days_remaining: daysRemaining,
      daysRemaining,
      is_active: isCurrentlyActive,
      isActive: isCurrentlyActive,
      startedAt: m.started_at || m.start_date,
      expiryDate: m.expiry_date,
      expiryCategory,
      user_name: m.user_name || undefined,
      user_email: m.user_email || undefined,
      user_role: m.user_role || undefined,
    };
  }

  async getMembership(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

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
        computed_status: 'NONE',
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
      computed_status: formatted.computed_status,
      membership: formatted,
    };
  }

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

    const memberCode = this.generateMemberCode(numericUserId);

    const created = await membershipRepository.createMembership({
      user_id: numericUserId,
      member_code: memberCode,
      dues_amount,
      dues_status: 'pending',
    });

    const full = await membershipRepository.findById(created.id);
    return this.formatMembership(full || created);
  }

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

      // Activate membership in DB
      const updated = await membershipRepository.activateMembership(id, client);

      // Record transaction
      const validPaymentModes = ['online', 'cash', 'upi', 'card'];
      const mode = validPaymentModes.includes(payment_mode) ? payment_mode : 'online';

      try {
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
      } catch (txErr) {
        console.warn('Transaction record skipped or failed:', txErr.message);
      }

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

  async payDues(userId, paymentMode = 'online') {
    let current = await membershipRepository.findCurrentMembershipByUserId(userId);
    if (!current) {
      const created = await this.createMembership(userId);
      current = await membershipRepository.findById(created.id);
    }
    return this.payMembership(current.id, { payment_mode: paymentMode });
  }

  async renewMembership(membershipId, { dues_amount = 500.00 } = {}) {
    if (!membershipId) {
      const err = new Error('Membership ID is required');
      err.status = 400;
      throw err;
    }

    const id = parseInt(membershipId, 10);
    const previous = await membershipRepository.findById(id);
    if (!previous) {
      const err = new Error(`Membership with ID ${id} not found`);
      err.status = 404;
      throw err;
    }

    const userId = previous.user_id;
    const newMemberCode = this.generateMemberCode(userId);

    const renewal = await membershipRepository.createMembership({
      user_id: userId,
      member_code: newMemberCode,
      dues_amount,
      dues_status: 'pending',
    });

    const full = await membershipRepository.findById(renewal.id);
    return this.formatMembership(full || renewal);
  }

  async getMembershipHistory(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    const numId = parseInt(userId, 10);
    const list = await membershipRepository.findMembershipHistory(numId);
    return list.map(m => this.formatMembership(m));
  }

  async getDashboard() {
    return await membershipRepository.getDashboardCounts();
  }

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
      computed_status: formatted.computed_status,
      dues_status: formatted.dues_status,
      dues_amount: formatted.dues_amount,
      start_date: formatted.start_date,
      started_at: formatted.started_at,
      expiry_date: formatted.expiry_date,
      days_remaining: formatted.days_remaining,
      is_active: formatted.is_active,
    };
  }

  async getAllMemberships(filter = {}) {
    const list = await membershipRepository.findAll(filter);
    return list.map(m => this.formatMembership(m));
  }
}

module.exports = new MembershipService();
