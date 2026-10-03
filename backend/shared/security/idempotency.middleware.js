const crypto = require('crypto');
const { pool } = require('../../config/database');

/**
 * Middleware providing transactional idempotency via database table idempotency_keys.
 * Supported on sensitive write endpoints (e.g. ticket purchase, dues payment).
 */
function idempotencyMiddleware(options = {}) {
  const { ttlHours = 24 } = options;

  return async function handleIdempotency(req, res, next) {
    const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return next(); // Key not provided, proceed normally
    }

    const cleanKey = idempotencyKey.trim().slice(0, 128);
    const userId = req.user ? (req.user.id || req.user.userId) : null;
    if (!userId) {
      return next(); // Unauthenticated requests can't be keyed by user
    }

    const endpoint = req.originalUrl || req.baseUrl + req.path;
    const bodyStr = JSON.stringify(req.body || {});
    const requestHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

    try {
      // Check existing key for this user and endpoint
      const existingQuery = `
        SELECT * FROM idempotency_keys
        WHERE user_id = $1 AND endpoint = $2 AND idempotency_key = $3;
      `;
      const existingRes = await pool.query(existingQuery, [userId, endpoint, cleanKey]);

      if (existingRes.rows.length > 0) {
        const record = existingRes.rows[0];

        // Verify request payload matches the original
        if (record.request_hash !== requestHash) {
          return res.status(409).json({
            error: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH',
            message: 'Idempotency key has already been used with different request parameters',
          });
        }

        // Return cached response
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(record.response_status).json(record.response_body);
      }

      // Intercept res.json to store the response upon completion
      const originalJson = res.json.bind(res);
      res.json = function interceptedJson(body) {
        // Only cache successful or business conflict responses (don't cache 500s)
        if (res.statusCode < 500) {
          const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
          pool.query(
            `INSERT INTO idempotency_keys (
              user_id, endpoint, idempotency_key, request_hash, response_status, response_body, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (user_id, endpoint, idempotency_key) DO NOTHING;`,
            [userId, endpoint, cleanKey, requestHash, res.statusCode, JSON.stringify(body), expiresAt]
          ).catch((err) => {
            console.warn('Failed to persist idempotency key:', err.message);
          });
        }

        return originalJson(body);
      };

      next();
    } catch (err) {
      console.warn('Idempotency lookup warning:', err.message);
      next();
    }
  };
}

module.exports = idempotencyMiddleware;
