/**
 * Shared Utilities
 */

/**
 * Derives membership status based on dues_status and expiry_date.
 * Note: Database stores dues_status and dates; status is derived.
 *
 * @param {Object} membership
 * @returns {'ACTIVE' | 'EXPIRED' | 'PENDING' | 'NONE'}
 */
function deriveMembershipStatus(membership) {
  if (!membership) return 'NONE';
  if (membership.dues_status === 'pending') {
    return 'PENDING';
  }
  if (membership.dues_status === 'paid') {
    if (!membership.expiry_date) return 'ACTIVE';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(membership.expiry_date);
    return expiry >= today ? 'ACTIVE' : 'EXPIRED';
  }
  return 'PENDING';
}

module.exports = {
  deriveMembershipStatus,
};
