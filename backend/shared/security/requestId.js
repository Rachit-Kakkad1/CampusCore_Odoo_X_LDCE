const crypto = require('crypto');

/**
 * Middleware that ensures every request has a unique correlation ID (X-Request-ID).
 * Reads client-supplied header or generates a cryptographically random UUID.
 */
function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'];
  const requestId = (existingId && typeof existingId === 'string' && existingId.length <= 64)
    ? existingId
    : crypto.randomUUID();

  req.id = requestId;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

module.exports = requestIdMiddleware;
