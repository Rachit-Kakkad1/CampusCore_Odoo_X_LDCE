const QRCode = require('qrcode');
const signTicketCode = require('./signTicketCode');

/**
 * Generates the QR payload and QR code image data URL for a ticket.
 * Per specification:
 *   Payload format: ticket_code.signature
 *
 * @param {string} ticketCode - Unique ticket code
 * @param {object} [options] - Optional qrcode rendering options
 * @returns {Promise<{ payload: string, qrDataUrl: string }>}
 */
async function generateQR(ticketCode, options = {}) {
  if (!ticketCode) {
    throw new Error('ticketCode is required to generate QR');
  }

  const signature = signTicketCode(ticketCode);
  const payload = `${ticketCode}.${signature}`;

  const qrOptions = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    scale: 6,
    ...options,
  };

  const qrDataUrl = await QRCode.toDataURL(payload, qrOptions);

  return {
    payload,
    qrDataUrl,
    signature,
    ticketCode,
  };
}

module.exports = generateQR;
