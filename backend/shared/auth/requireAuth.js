const getCurrentUser = require('./getCurrentUser');

/**
 * Middleware ensuring the request contains a valid authenticated user.
 * Returns 401 Unauthorized if missing or invalid.
 */
function requireAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  req.user = user;
  next();
}

module.exports = requireAuth;
