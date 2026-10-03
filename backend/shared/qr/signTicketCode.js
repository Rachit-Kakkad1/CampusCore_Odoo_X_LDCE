const crypto = require('crypto');
const env = require('../../config/env');

/**
 * Computes cryptographic signature for a ticket code.
 * Per specification:
 *   Signature = first 10 hex characters of HMAC_SHA256(ticket_code, QR_SECRET)
 *
 * @param {string} ticketCode - Unique ticket code identifier
 * @param {string} [secret] - Optional secret override (defaults to env.QR_SECRET)
 * @returns {string} 10-character hexadecimal signature
 */
function signTicketCode(ticketCode, secret = env.QR_SECRET) {
  if (!ticketCode || typeof ticketCode !== 'string') {
    throw new Error('Valid string ticketCode is required for signing');
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(ticketCode);
  return hmac.digest('hex').substring(0, 10);
}

module.exports = signTicketCode;
