// backend/modules/membership/membership.service.js
const membershipRepository = require('./membership.repository');
const { isActiveMember } = require('../../shared/membership/isActiveMember');
const { createTransaction } = require('../../shared/transactions/createTransaction');

class MembershipService {
  /**
   * Calculate end of year expiry string (YYYY-12-31)
   */
  getEndOfYearExpiry() {
    const currentYear = new Date().getFullYear();
    return `${currentYear}-12-31`;
  }

  /**
   * Helper to format membership object with active status
   */
  async formatMembership(membership) {
    if (!membership) return null;

    const isActive = await isActiveMember(membership.user_id);
    const todayStr = new Date().toISOString().split('T')[0];

    let status = 'none';
    if (membership.dues_status === 'paid') {
      let expiryStr = '';
      if (membership.expiry_date instanceof Date) {
        expiryStr = membership.expiry_date.toISOString().split('T')[0];
      } else if (membership.expiry_date) {
        expiryStr = String(membership.expiry_date).split('T')[0];
      }

      if (expiryStr && expiryStr >= todayStr) {
        status = 'active';
      } else {
        status = 'expired';
      }
    } else {
      status = 'pending';
    }

    return {
      ...membership,
      is_active: isActive,
      computed_status: status
    };
  }

  /**
   * Get current user's membership details
   */
  async getMembership(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    const membership = await membershipRepository.findByUserId(userId);
    if (!membership) {
      return {
        exists: false,
        is_active: false,
        computed_status: 'none',
        membership: null
      };
    }

    const formatted = await this.formatMembership(membership);
    return {
      exists: true,
      is_active: formatted.is_active,
      computed_status: formatted.computed_status,
      membership: formatted
    };
  }

  /**
   * Create / initiate a new membership for the authenticated user
   */
  async createMembership(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    const existing = await membershipRepository.findByUserId(userId);
    if (existing) {
      const err = new Error('Membership already exists for this user');
      err.status = 409;
      throw err;
    }

    const currentYear = new Date().getFullYear();
    const memberCode = `MEM-${currentYear}-${userId}`;

    const newMembership = await membershipRepository.create({
      user_id: userId,
      member_code: memberCode,
      dues_amount: 500.00,
      dues_status: 'pending',
      start_date: null,
      expiry_date: null,
      paid_at: null
    });

    const fullMembership = await membershipRepository.findById(newMembership.id);
    return this.formatMembership(fullMembership);
  }

  /**
   * Pay dues for membership (MVP mock payment + ledger transaction creation)
   */
  async payDues(userId, paymentMode = 'online') {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    let membership = await membershipRepository.findByUserId(userId);
    if (!membership) {
      // Initiate pending membership first
      await this.createMembership(userId);
      membership = await membershipRepository.findByUserId(userId);
    }

    const validPaymentModes = ['online', 'cash', 'upi', 'card'];
    const mode = validPaymentModes.includes(paymentMode) ? paymentMode : 'online';

    const startDate = new Date().toISOString().split('T')[0];
    const expiryDate = this.getEndOfYearExpiry();
    const paidAt = new Date();

    const updated = await membershipRepository.updatePayment(membership.id, {
      dues_status: 'paid',
      start_date: startDate,
      expiry_date: expiryDate,
      paid_at: paidAt
    });

    // Money moved! Record in central transaction ledger
    await createTransaction({
      source_type: 'dues',
      source_id: updated.id,
      user_id: userId,
      amount: updated.dues_amount,
      direction: 'in',
      payment_mode: mode,
      status: 'paid'
    });

    const fullUpdated = await membershipRepository.findById(updated.id);
    return this.formatMembership(fullUpdated);
  }

  /**
   * Retrieve Member Pass information (safe for display)
   */
  async getMemberPass(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }

    const membership = await membershipRepository.findByUserId(userId);
    if (!membership) {
      const err = new Error('No membership found for this user');
      err.status = 404;
      throw err;
    }

    const formatted = await this.formatMembership(membership);

    return {
      membership_id: formatted.id,
      member_code: formatted.member_code,
      member_name: formatted.user_name,
      user_email: formatted.user_email,
      role: formatted.user_role,
      dues_status: formatted.dues_status,
      dues_amount: formatted.dues_amount,
      start_date: formatted.start_date,
      expiry_date: formatted.expiry_date,
      is_active: formatted.is_active,
      computed_status: formatted.computed_status
    };
  }

  /**
   * Retrieve all memberships (Admin/Treasurer)
   */
  async getAllMemberships() {
    const list = await membershipRepository.findAll();
    return Promise.all(list.map(m => this.formatMembership(m)));
  }
}

module.exports = new MembershipService();
