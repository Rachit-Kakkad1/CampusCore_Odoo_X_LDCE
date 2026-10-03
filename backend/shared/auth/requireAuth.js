// backend/shared/auth/requireAuth.js
const jwt = require('jsonwebtoken');
const env = require('../../config/env');

/**
 * Shared Middleware: requireAuth
 * Validates the Authorization header Bearer token against JWT_SECRET.
 * Attaches decoded identity payload to req.user.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Authentication required. Missing or malformed Authorization header.',
        status: 401,
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded; // { userId, email, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired authentication token.',
        status: 401,
      },
    });
  }
}

module.exports = { requireAuth };
