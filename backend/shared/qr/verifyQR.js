const crypto = require('crypto');
const signTicketCode = require('./signTicketCode');

/**
 * Validates the structure and HMAC signature of a QR payload.
 * Pure verification helper: does NOT perform database check-in or state mutation.
 *
 * @param {string} payload - String in format 'ticket_code.signature'
 * @returns {{ valid: boolean, error?: string, ticketCode?: string, signature?: string }}
 */
function verifyQR(payload) {
  if (!payload || typeof payload !== 'string') {
    return { valid: false, error: 'INVALID_PAYLOAD_FORMAT' };
  }

  const parts = payload.trim().split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'MALFORMED_QR_STRUCTURE' };
  }

  const [ticketCode, signature] = parts;

  if (!ticketCode || !signature || signature.length !== 10) {
    return { valid: false, error: 'INVALID_SIGNATURE_LENGTH', ticketCode };
  }

  let expectedSignature;
  try {
    expectedSignature = signTicketCode(ticketCode);
  } catch (err) {
    return { valid: false, error: 'SIGNING_ERROR', ticketCode };
  }

  // Constant-time comparison to prevent timing attacks
  const signatureBuf = Buffer.from(signature, 'utf-8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf-8');

  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return { valid: false, error: 'INVALID_SIGNATURE', ticketCode };
  }

  return {
    valid: true,
    ticketCode,
    signature,
  };
}

module.exports = verifyQR;
