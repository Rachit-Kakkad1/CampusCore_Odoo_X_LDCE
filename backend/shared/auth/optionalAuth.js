const getCurrentUser = require('./getCurrentUser');

/**
 * Middleware that attaches req.user if a valid token is provided,
 * but allows guest users through if unauthenticated.
 */
function optionalAuth(req, res, next) {
  try {
    const user = req.user || getCurrentUser(req);
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // Proceed without user
  }
  next();
}

module.exports = optionalAuth;
