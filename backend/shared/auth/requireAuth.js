const getCurrentUser = require('./getCurrentUser');
const sessionService = require('../../modules/auth/session.service');

/**
 * Middleware ensuring the request contains a valid authenticated user and active session.
 * Returns 401 Unauthorized if missing, expired, or revoked.
 */
async function requireAuth(req, res, next) {
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
  next();
}

requireAuth.requireAuth = requireAuth;
module.exports = requireAuth;
