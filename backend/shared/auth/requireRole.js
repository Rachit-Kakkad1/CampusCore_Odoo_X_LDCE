// backend/shared/auth/requireRole.js

/**
 * Shared Middleware: requireRole
 * Restricts access to users holding one of the specified roles.
 * Must be preceded by requireAuth in the middleware chain.
 *
 * @param  {...string} allowedRoles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: {
          message: 'Authentication required prior to role verification.',
          status: 401,
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: `Access forbidden. Required role: [${allowedRoles.join(', ')}].`,
          status: 403,
        },
      });
    }

    next();
  };
}

module.exports = { requireRole };
