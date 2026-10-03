const { getEmailProvider } = require('./email.provider');
const { renderTicketEmail } = require('./email.templates');
const env = require('../../config/env');

/**
 * Email Service
 * Reusable shared service for delivering transactional emails.
 * Decoupled from ticket business logic and database transactions.
 */
class EmailService {
  /**
   * Dispatches a ticket confirmation email with embedded QR code and fallback code.
   * Never throws uncaught errors that could roll back successful financial transactions.
   *
   * @param {object} params
   * @param {string} params.recipientEmail - Target email address
   * @param {string} [params.recipientName] - Attendee / User name
   * @param {object} params.event - Event metadata { id, title, starts_at, venue }
   * @param {object} params.ticket - Ticket details { id, ticket_code, price, price_type }
   * @param {string} [params.qrDataUrl] - base64 PNG data URL of QR code
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string, provider?: string }>}
   */
  async sendTicketEmail({
    recipientEmail,
    recipientName = 'Attendee',
    event = {},
    ticket = {},
    qrDataUrl = null,
  }) {
    if (!recipientEmail) {
      console.warn('[EMAIL WARNING] Cannot send ticket email: missing recipient email');
      return {
        success: false,
        error: 'MISSING_RECIPIENT',
        message: 'No recipient email provided',
      };
    }

    try {
      const { subject, html, text } = renderTicketEmail({
        attendeeName: recipientName,
        eventName: event.title || 'Event',
        eventDate: event.starts_at,
        venue: event.venue || 'Campus Center',
        ticketCode: ticket.ticket_code || 'TCK-UNKNOWN',
        price: ticket.price || '0.00',
        priceType: ticket.price_type || 'regular',
        qrDataUrl,
      });

      const provider = getEmailProvider();
      const sendResult = await provider.sendMail({
        to: recipientEmail,
        from: env.EMAIL_FROM,
        subject,
        html,
        text,
        metadata: {
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          event_id: event.id,
        },
      });

      return {
        success: true,
        messageId: sendResult.messageId,
        provider: sendResult.provider,
        recipient: recipientEmail,
      };
    } catch (err) {
      // Safe failure handling: do NOT crash or bubble up to abort the ticket payment
      console.warn(`[EMAIL DELIVERY FAILURE] Failed delivering ticket email to ${recipientEmail}:`, err.message);
      return {
        success: false,
        error: 'DELIVERY_FAILED',
        message: err.message,
        recipient: recipientEmail,
      };
    }
  }
}

const emailService = new EmailService();

// Export both the service class instance and direct sendTicketEmail helper
module.exports = {
  EmailService,
  emailService,
  sendTicketEmail: (params) => emailService.sendTicketEmail(params),
};
