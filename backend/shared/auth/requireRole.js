/**
 * Shared Middleware: requireRole
 * Role-based access control guard.
 * (RBAC checking to be implemented in Auth/RBAC phase)
 *
 * @param  {...string} roles Allowed roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    // Placeholder guard for initialization phase
    next();
  };
}

module.exports = { requireRole };
