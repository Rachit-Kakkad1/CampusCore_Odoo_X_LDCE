// backend/shared/auth/getCurrentUser.js

/**
 * Shared Auth Helper: getCurrentUser
 * Extracts authenticated user context from request.
 *
 * @param {import('express').Request} req
 * @returns {Object|null}
 */
function getCurrentUser(req) {
  if (!req.user) return null;
  return {
    ...req.user,
    id: req.user.userId || req.user.id,
  };
}

module.exports = { getCurrentUser };
