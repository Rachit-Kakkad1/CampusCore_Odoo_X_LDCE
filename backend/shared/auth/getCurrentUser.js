/**
 * Shared Auth Helper: getCurrentUser
 * Extracts authenticated user context from request.
 * (Business logic to be implemented in Auth phase)
 */
function getCurrentUser(req) {
  return req.user || null;
}

module.exports = { getCurrentUser };
