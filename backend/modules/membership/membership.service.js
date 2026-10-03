// backend/modules/membership/membership.service.js
const crypto = require('crypto');
const { pool } = require('../../config/database');
const membershipRepository = require('./membership.repository');
const {
  computeStatus,
  calculateDaysRemaining,
  determineExpiryCategory,
  getMembershipStatus,
} = require('../../shared/membership/getMembershipStatus');
const { syncMembershipStatuses } = require('../../shared/membership/syncMembershipStatuses');
const createTransaction = require('../../shared/transactions/createTransaction');

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
      status: (m.status || computed).toLowerCase(),
      computed_status: computed,
      dues_status: m.dues_status,
      dues_amount: m.dues_amount !== undefined && m.dues_amount !== null ? parseFloat(m.dues_amount) : 500.00,
      start_date: m.started_at ?? null,
      started_at: m.started_at ?? null,
      expiry_date: m.expiry_date ?? null,
      expiryDate: m.expiry_date ?? null,
      startedAt: m.started_at ?? null,
      paid_at: m.payment_timestamp ?? null,
      payment_timestamp: m.payment_timestamp ?? null,
      cancelled_at: m.cancelled_at ?? null,
      cancellation_reason: m.cancellation_reason ?? null,
      renewed_from_membership_id: m.renewed_from_membership_id ?? null,
      created_at: m.created_at,
      updated_at: m.updated_at,
      days_remaining: daysRemaining,
      daysRemaining,
      is_active: isCurrentlyActive,
      isActive: isCurrentlyActive,
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

    await syncMembershipStatuses().catch(() => {});

    const membership = await membershipRepository.findCurrentMembershipByUserId(userId);
    if (!membership) {
      return {
        exists: false,
        status: 'NONE',
        computed_status: 'NONE',
        startedAt: null,
        started_at: null,
        expiryDate: null,
        expiry_date: null,
        daysRemaining: 0,
        days_remaining: 0,
        isActive: false,
        is_active: false,
        expiryCategory: 'normal',
        membership: null,
        data: null,
      };
    }

    const formatted = this.formatMembership(membership);
    const statusUpper = formatted.computed_status;
    return {
      ...formatted,
      exists: true,
      status: statusUpper,
      computed_status: statusUpper,
      days_remaining: formatted.days_remaining,
      daysRemaining: formatted.days_remaining,
      isActive: formatted.is_active,
      is_active: formatted.is_active,
      expiryCategory: formatted.expiryCategory,
      membership: formatted,
      data: formatted,
    };
  }

  async getMyMembership(userId) {
    return this.getMembership(userId);
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

    const existing = await membershipRepository.findById(id);
    if (!existing) {
      const err = new Error(`Membership with ID ${id} not found`);
      err.status = 404;
      throw err;
    }

    if (existing.status === 'active' && existing.dues_status === 'paid' && existing.expiry_date && new Date(existing.expiry_date) > new Date()) {
      const err = new Error('Membership is already active');
      err.status = 409;
      err.code = 'MEMBERSHIP_ALREADY_ACTIVE';
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const activated = await membershipRepository.activateMembership(id, client);

      const transaction = await createTransaction(
        {
          source_type: 'dues',
          source_id: activated.id,
          user_id: activated.user_id,
          amount: activated.dues_amount,
          direction: 'in',
          payment_mode,
          status: 'paid',
        },
        client
      );

      // Upgrade user role to member if needed
      await client.query(
        "UPDATE users SET role = 'member' WHERE id = $1 AND role NOT IN ('admin', 'treasurer', 'event_manager', 'volunteer');",
        [activated.user_id]
      );

      await client.query('COMMIT');
      const full = await membershipRepository.findById(activated.id);
      const formatted = this.formatMembership(full || activated);
      return {
        formatted,
        transaction,
        data: formatted,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async payDues(userId, paymentMode = 'online') {
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

      if (membership.status === 'active' && membership.dues_status === 'paid') {
        const now = new Date();
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
        const currentYear = new Date().getFullYear();
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
        activeMembership = await membershipRepository.activateMembership(membership.id, client);
      }

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

      await client.query(
        "UPDATE users SET role = 'member' WHERE id = $1 AND role NOT IN ('admin', 'treasurer', 'event_manager', 'volunteer');",
        [userId]
      );

      await client.query('COMMIT');
      const full = await membershipRepository.findById(activeMembership.id);
      const formatted = this.formatMembership(full || activeMembership);

      return {
        message: 'Membership dues paid successfully',
        membership: formatted,
        transaction,
        status: 'ACTIVE',
        data: formatted,
        ...formatted,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async cancelMembership(idOrUserId, reasonArg = 'Member requested cancellation') {
    let reason = typeof reasonArg === 'string' ? reasonArg : (reasonArg?.reason || 'Member requested cancellation');
    if (!reason || !reason.trim()) {
      const err = new Error('Cancellation reason is required');
      err.status = 400;
      throw err;
    }
    reason = reason.trim();

    const targetId = parseInt(idOrUserId, 10);
    if (isNaN(targetId) || targetId <= 0) {
      const err = new Error('Invalid ID');
      err.status = 400;
      throw err;
    }

    let membership = await membershipRepository.findById(targetId);
    if (!membership) {
      membership = await membershipRepository.findCurrentMembershipByUserId(targetId);
    }

    if (!membership) {
      const err = new Error('No membership found');
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

    const cancelled = await membershipRepository.cancelMembership(membership.id, reason);
    const full = await membershipRepository.findById(cancelled.id);
    const formatted = this.formatMembership(full || cancelled);

    return {
      message: 'Membership cancelled successfully',
      status: 'CANCELLED',
      membership: formatted,
      data: formatted,
      ...formatted,
    };
  }

  async renewMembership(membershipId, { dues_amount = 500.00 } = {}) {
    const id = parseInt(membershipId, 10);
    if (isNaN(id) || id <= 0) {
      const err = new Error('Invalid membership ID');
      err.status = 400;
      throw err;
    }

    let previous = await membershipRepository.findById(id);
    if (!previous) {
      previous = await membershipRepository.findCurrentMembershipByUserId(id);
    }
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
    const formatted = this.formatMembership(full || renewal);

    return {
      message: 'Membership renewal initiated successfully. Please complete payment to activate.',
      renewed_from_membership_id: previous.id,
      membership: formatted,
      data: formatted,
      ...formatted,
    };
  }

  async renewUserMembership(userId, paymentMode = 'online') {
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

      const activatedMembership = await membershipRepository.activateMembership(newMembership.id, client);

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
      const full = await membershipRepository.findById(activatedMembership.id);
      const formatted = this.formatMembership(full || activatedMembership);

      return {
        message: 'Membership renewed successfully',
        status: 'ACTIVE',
        renewed_from_membership_id: oldMembership.id,
        membership: formatted,
        transaction,
        data: formatted,
        ...formatted,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getMemberPass(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    await syncMembershipStatuses().catch(() => {});

    const membership = await membershipRepository.findCurrentMembershipByUserId(userId);
    if (!membership) {
      const err = new Error('No membership found for this user');
      err.code = 'MEMBERSHIP_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const formatted = this.formatMembership(membership);
    return {
      membership_id: formatted.id,
      member_code: formatted.member_code,
      member_name: formatted.user_name,
      name: formatted.user_name,
      email: formatted.user_email,
      user_email: formatted.user_email,
      role: formatted.user_role,
      status: formatted.computed_status,
      computed_status: formatted.computed_status,
      dues_status: formatted.dues_status,
      dues_amount: formatted.dues_amount,
      start_date: formatted.started_at,
      started_at: formatted.started_at,
      expiry_date: formatted.expiry_date,
      days_remaining: formatted.days_remaining,
      is_active: formatted.is_active,
    };
  }

  async verifyMemberCode(memberCode) {
    if (!memberCode) {
      const err = new Error('Member code is required');
      err.code = 'MISSING_CODE';
      err.status = 400;
      throw err;
    }

    await syncMembershipStatuses().catch(() => {});

    const member = await membershipRepository.findByMemberCode(memberCode);
    if (!member) {
      const err = new Error('Member code not found');
      err.code = 'MEMBER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const computed = computeStatus(member);
    const isValid = computed === 'ACTIVE';

    return {
      valid: isValid,
      status: computed,
      member_code: member.member_code,
      name: member.user_name,
      email: member.user_email,
      started_at: member.started_at,
      expiry_date: member.expiry_date,
    };
  }

  async getDashboard() {
    await syncMembershipStatuses().catch(() => {});
    return await membershipRepository.getDashboardCounts();
  }

  async getExpiryDashboard() {
    return this.getDashboard();
  }

  async getExpiring(days = 30) {
    const list = await membershipRepository.getExpiringMemberships(days);
    return list.map(m => this.formatMembership(m));
  }

  async getExpiringMemberships(days = 30) {
    return this.getExpiring(days);
  }

  async getAllMemberships(filter = {}) {
    await syncMembershipStatuses().catch(() => {});
    const list = await membershipRepository.findAll(filter);
    return list.map(m => this.formatMembership(m));
  }

  async getAllMembers(filter = {}) {
    return this.getAllMemberships(filter);
  }

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

  async getRenewalHistory(userId) {
    return this.getMembershipHistory(userId);
  }

  async syncStatuses() {
    const res = await syncMembershipStatuses();
    const count = typeof res === 'number' ? res : (res.updatedCount ?? Number(res));
    return {
      success: true,
      updatedCount: count,
    };
  }
}

module.exports = new MembershipService();
