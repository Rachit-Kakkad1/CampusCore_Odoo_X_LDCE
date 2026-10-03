const jwt = require('jsonwebtoken');
const env = require('../../config/env');

/**
 * Extracts and returns the current authenticated user from the request.
 * Supports:
 *   1. Pre-populated req.user (from requireAuth middleware)
 *   2. Directly parsing Authorization: Bearer <token> header
 *
 * @param {object} req - Express request object
 * @returns {{ id: number, name: string, email: string, role: string } | null}
 */
function getCurrentUser(req) {
  if (req && req.user && req.user.id) {
    return {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    };
  }

  const authHeader = req && req.headers ? req.headers.authorization : null;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    return {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (err) {
    return null;
  }
}

module.exports = getCurrentUser;
