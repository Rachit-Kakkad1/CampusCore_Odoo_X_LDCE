const getCurrentUser = require('./getCurrentUser');
const sessionService = require('../../modules/auth/session.service');

/**
 * Middleware factory restricting endpoint access to specific roles.
 * Returns 401 if unauthenticated/revoked, 403 if authenticated but not allowed.
 *
 * @param  {...string} roles - Permitted roles (e.g. 'admin', 'event_manager')
 */
function requireRole(...roles) {
  return async (req, res, next) => {
    const user = req.user || getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const sessionToken = req.headers['x-session-token'];
    if (sessionToken) {
      const isRevoked = await sessionService.isSessionRevoked(sessionToken);
      if (isRevoked) {
        return res.status(401).json({
          error: 'SESSION_REVOKED',
          message: 'Your session has expired or been revoked. Please log in again.',
        });
      }
      sessionService.touchSession(sessionToken).catch(() => {});
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
