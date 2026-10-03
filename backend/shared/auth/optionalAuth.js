const getCurrentUser = require('./getCurrentUser');

/**
 * Middleware that populates req.user if a valid token is present,
 * but allows the request to continue unauthenticated if no token is provided.
 */
function optionalAuth(req, res, next) {
  const user = getCurrentUser(req);
  if (user) {
    req.user = user;
  }
  next();
}

optionalAuth.optionalAuth = optionalAuth;
module.exports = optionalAuth;
