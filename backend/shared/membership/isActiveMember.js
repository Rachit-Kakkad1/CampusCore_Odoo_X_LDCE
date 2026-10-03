// backend/shared/membership/isActiveMember.js
const membershipRepository = require('../../modules/membership/membership.repository');

/**
 * Shared Membership Helper: isActiveMember
 * Evaluates whether a given user holds an active membership.
 * ACTIVE MEMBER = dues_status === 'paid' AND expiry_date >= current_date
 *
 * @param {number|string} userId
 * @returns {Promise<boolean>}
 */
async function isActiveMember(userId) {
  if (!userId) return false;
  try {
    const membership = await membershipRepository.findByUserId(userId);
    if (!membership) return false;
    if (membership.dues_status !== 'paid') return false;
    if (!membership.expiry_date) return false;

    // Standardize comparison using ISO date string YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    let expiryStr;
    if (membership.expiry_date instanceof Date) {
      expiryStr = membership.expiry_date.toISOString().split('T')[0];
    } else {
      expiryStr = String(membership.expiry_date).split('T')[0];
    }

    return expiryStr >= todayStr;
  } catch (err) {
    console.error('Error evaluating isActiveMember:', err.message);
    return false;
  }
}

module.exports = { isActiveMember };
