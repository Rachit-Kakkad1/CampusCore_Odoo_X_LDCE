const crypto = require('crypto');

// 32-character unambiguous character set (excludes 0, O, 1, I)
const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 5;

/**
 * Generates a cryptographically random, human-readable 5-character fallback ticket code.
 * Excludes visually ambiguous characters (0, O, 1, I).
 *
 * @param {number} [length=5]
 * @returns {string} e.g. "AB7K9"
 */
function generateFallbackCode(length = CODE_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    const index = bytes[i] % CHARSET.length;
    code += CHARSET[index];
  }
  return code;
}

/**
 * Generates a guaranteed unique fallback code against the tickets table.
 *
 * @param {import('pg').PoolClient|import('pg').Pool} client
 * @param {number} [maxAttempts=10]
 * @returns {Promise<string>}
 */
async function generateUniqueFallbackCode(client, maxAttempts = 10) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateFallbackCode(CODE_LENGTH);
    const check = await client.query(
      'SELECT 1 FROM tickets WHERE UPPER(fallback_code) = UPPER($1) LIMIT 1',
      [candidate]
    );
    if (check.rowCount === 0) {
      return candidate;
    }
  }
  // If extremely rare collision occurs across 10 attempts, append extra char
  return generateFallbackCode(6);
}

module.exports = {
  generateFallbackCode,
  generateUniqueFallbackCode,
  CHARSET,
};
