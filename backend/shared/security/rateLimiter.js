/**
 * In-memory sliding/fixed window rate limiter with per-route policies and Retry-After headers.
 */
function createRateLimiter({
  windowMs = 60 * 1000,
  max = 60,
  message = 'Too many requests, please try again later.',
  code = 'RATE_LIMIT_EXCEEDED',
  keyGenerator = (req) => {
    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';
    return `${ip}:${req.baseUrl || req.path}`;
  },
} = {}) {
  const hits = new Map();

  // Periodic cleanup of expired records every minute
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.resetTime > 0) {
        hits.delete(key);
      }
    }
  }, 60 * 1000);
  cleanupInterval.unref();

  return function rateLimiterMiddleware(req, res, next) {
    // If in test mode, allow higher burst limit unless explicitly testing rate limits
    const effectiveMax = process.env.NODE_ENV === 'test' ? max * 10 : max;
    const key = keyGenerator(req);
    const now = Date.now();

    let record = hits.get(key);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, effectiveMax - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', effectiveMax);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > effectiveMax) {
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: code,
        message,
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
}

// Pre-configured rate limiters
const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many authentication attempts. Please try again after 60 seconds.',
  code: 'AUTH_RATE_LIMITED',
});

const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many password reset requests. Please wait 15 minutes before requesting again.',
  code: 'PASSWORD_RESET_RATE_LIMITED',
});

const checkinRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many check-in verification attempts. Please wait a moment before trying again.',
  code: 'CHECKIN_RATE_LIMITED',
});

const purchaseRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many checkout requests. Please try again in a few moments.',
  code: 'PURCHASE_RATE_LIMITED',
});

module.exports = {
  createRateLimiter,
  authRateLimiter,
  passwordResetRateLimiter,
  checkinRateLimiter,
  purchaseRateLimiter,
};
