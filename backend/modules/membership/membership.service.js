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

const { MEMBERSHIP_PLANS, resolvePlan } = require('./membership.plans');
const authRepository = require('../auth/auth.repository');

class MembershipService {
  getPlans() {
    return Object.values(MEMBERSHIP_PLANS);
  }

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

  async createMembership(userId, { dues_amount = null, plan = null } = {}) {
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

    const resolvedPlan = plan ? resolvePlan(plan) : null;
    const finalDuesAmount = resolvedPlan ? resolvedPlan.price : (dues_amount !== null && dues_amount !== undefined ? dues_amount : 500.00);

    const memberCode = this.generateMemberCode(numericUserId);

    const created = await membershipRepository.createMembership({
      user_id: numericUserId,
      member_code: memberCode,
      dues_amount: finalDuesAmount,
      dues_status: 'pending',
    });

    const full = await membershipRepository.findById(created.id);
    return this.formatMembership(full || created);
  }

  async payMembership(membershipId, { payment_mode = 'online', plan = null } = {}) {
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

    const resolvedPlan = plan ? resolvePlan(plan) : null;
    const interval = resolvedPlan ? resolvedPlan.interval : '12 months';
    const finalAmount = resolvedPlan ? resolvedPlan.price : existing.dues_amount;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const activated = await membershipRepository.activateMembership(id, client, {
        interval,
        duesAmount: finalAmount,
      });

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

  async payDues(userId, paymentMode = 'online', plan = null) {
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

      const resolvedPlan = plan ? resolvePlan(plan) : null;
      const interval = resolvedPlan ? resolvedPlan.interval : '12 months';
      const finalAmount = resolvedPlan ? resolvedPlan.price : (membership.dues_amount || 500.00);

      let activeMembership;
      if (membership.status === 'expired' || membership.status === 'cancelled') {
        const currentYear = new Date().getFullYear();
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const memberCode = `MEM-${currentYear}-${randomSuffix}`;
        const newPeriod = await membershipRepository.createMembership(
          {
            user_id: userId,
            member_code: memberCode,
            dues_amount: finalAmount,
            dues_status: 'pending',
            renewed_from_membership_id: membership.id,
          },
          client
        );
        activeMembership = await membershipRepository.activateMembership(newPeriod.id, client, {
          interval,
          duesAmount: finalAmount,
        });
      } else {
        activeMembership = await membershipRepository.activateMembership(membership.id, client, {
          interval,
          duesAmount: finalAmount,
        });
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

  /**
   * Complete Membership Checkout
   * Server determines plan duration, price, and dynamic PostgreSQL interval expiry.
   */
  async checkout({ userId = null, plan = '12_months', payment_mode = 'online', name = '', email = '', mobile = '' } = {}) {
    const resolvedPlan = resolvePlan(plan);
    let targetUserId = userId ? parseInt(userId, 10) : null;
    let targetUser = null;

    if (targetUserId) {
      targetUser = await authRepository.getUserById(targetUserId);
    }

    if (!targetUser) {
      if (!email || !email.trim()) {
        const err = new Error('Email address is required for membership registration');
        err.status = 400;
        err.code = 'EMAIL_REQUIRED';
        throw err;
      }
      const cleanEmail = email.trim().toLowerCase();
      targetUser = await authRepository.getUserByEmail(cleanEmail);
      if (!targetUser) {
        const randomPass = crypto.randomBytes(8).toString('hex');
        targetUser = await authRepository.createUser({
          name: (name && name.trim()) || 'Member',
          email: cleanEmail,
          password_hash: randomPass,
          role: 'member',
        });
      }
      targetUserId = targetUser.id;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check current membership status
      const existing = await membershipRepository.getMembershipByUserIdForUpdate(targetUserId, client);
      if (existing && existing.status === 'active' && existing.dues_status === 'paid' && existing.expiry_date && new Date(existing.expiry_date) > new Date()) {
        const err = new Error('You already have an active membership');
        err.code = 'MEMBERSHIP_ALREADY_ACTIVE';
        err.status = 409;
        err.expiry_date = existing.expiry_date;
        throw err;
      }

      let membershipToActivateId;
      if (existing && existing.status === 'pending') {
        membershipToActivateId = existing.id;
      } else {
        const currentYear = new Date().getFullYear();
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const memberCode = `MEM-${currentYear}-${randomSuffix}`;
        const newMem = await membershipRepository.createMembership(
          {
            user_id: targetUserId,
            member_code: memberCode,
            dues_amount: resolvedPlan.price,
            dues_status: 'pending',
            renewed_from_membership_id: existing ? existing.id : null,
          },
          client
        );
        membershipToActivateId = newMem.id;
      }

      const activated = await membershipRepository.activateMembership(membershipToActivateId, client, {
        interval: resolvedPlan.interval,
        duesAmount: resolvedPlan.price,
      });

      const allowedModes = ['cash', 'online', 'upi', 'card'];
      const normalizedPaymentMode = allowedModes.includes(payment_mode) ? payment_mode : 'online';

      const transaction = await createTransaction(
        {
          source_type: 'dues',
          source_id: activated.id,
          user_id: targetUserId,
          amount: activated.dues_amount,
          direction: 'in',
          payment_mode: normalizedPaymentMode,
          status: 'paid',
        },
        client
      );

      await client.query(
        "UPDATE users SET role = 'member' WHERE id = $1 AND role NOT IN ('admin', 'treasurer', 'event_manager', 'volunteer');",
        [targetUserId]
      );

      await client.query('COMMIT');

      const full = await membershipRepository.findById(activated.id);
      const formatted = this.formatMembership(full || activated);

      return {
        success: true,
        message: 'Membership activated successfully',
        plan: resolvedPlan,
        membership: formatted,
        transaction,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
        },
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

  async cancelMembership(idOrUserId, reasonArg = 'Admin manual cancellation', adminUserId = null) {
    let reason = typeof reasonArg === 'string' ? reasonArg : (reasonArg?.reason || 'Admin manual cancellation');
    if (!reason || !reason.trim()) {
      reason = 'Admin manual cancellation';
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

    // Idempotent cancellation: if already cancelled, return cleanly without data corruption
    if (membership.status === 'cancelled') {
      const full = await membershipRepository.findById(membership.id);
      const formatted = this.formatMembership(full || membership);
      return {
        message: 'Membership is already cancelled',
        status: 'CANCELLED',
        already_cancelled: true,
        membership: formatted,
        data: formatted,
        ...formatted,
      };
    }

    const cancelled = await membershipRepository.cancelMembership(membership.id, {
      cancellationReason: reason,
      cancelled_by: adminUserId,
    });
    const full = await membershipRepository.findById(cancelled.id);
    const formatted = this.formatMembership(full || cancelled);

    return {
      message: 'Membership cancelled successfully',
      membership: formatted,
      data: formatted,
      ...formatted,
      status: 'CANCELLED',
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
    const result = await membershipRepository.findAll(filter);

    if (result && typeof result === 'object' && Array.isArray(result.rows)) {
      return {
        rows: result.rows.map(m => this.formatMembership(m)),
        totalItems: result.totalItems,
      };
    }

    const list = Array.isArray(result) ? result : [];
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
