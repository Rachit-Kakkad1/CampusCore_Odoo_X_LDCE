const getCurrentUser = require('./getCurrentUser');

/**
 * Middleware factory restricting endpoint access to specific roles.
 * Returns 401 if unauthenticated, 403 if authenticated but not allowed.
 *
 * @param  {...string} roles - Permitted roles (e.g. 'admin', 'event_manager')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user || getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    req.user = user;

    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    next();
  };
}
requireRole.requireRole = requireRole;
module.exports = requireRole;
