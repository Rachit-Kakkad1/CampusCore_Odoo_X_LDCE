const verifyQR = require('../../shared/qr/verifyQR');
const eventRepository = require('./event.repository');
const { getMembershipStatus } = require('../../shared/membership/isActiveMember');

/**
 * Check-in Service
 * Validates QR code signatures and handles atomic door admission.
 */
class CheckinService {
  /**
   * Scans and verifies a QR payload or manual code string.
   *
   * @param {string} payload - 'ticket_code.signature'
   * @param {number|null} checkedInBy - User ID of the scanning staff/volunteer
   * @returns {Promise<object>} Check-in outcome object with result: 'VALID' | 'ALREADY_USED' | 'INVALID'
   */
  async processScan(payload, checkedInBy = null) {
    // 1. Cryptographic and structural verification
    const qrVerification = verifyQR(payload);
    if (!qrVerification.valid) {
      return {
        result: 'INVALID',
        error: qrVerification.error || 'INVALID_QR',
        message: 'QR signature mismatch or tampered payload',
      };
    }

    // 2. Fetch ticket from database
    const ticket = await eventRepository.getTicketByCode(qrVerification.ticketCode);
    if (!ticket) {
      return {
        result: 'INVALID',
        error: 'TICKET_NOT_FOUND',
        message: 'No matching ticket found for this code',
      };
    }

    // 3. Ensure ticket was actually paid
    if (ticket.payment_status !== 'paid') {
      return {
        result: 'INVALID',
        error: 'TICKET_NOT_PAID',
        message: 'This ticket has not been paid for',
      };
    }

    // 4. Check if ticket has already been used
    const membershipInfo = ticket.user_id
      ? await getMembershipStatus(ticket.user_id)
      : { status: 'NONE', membership: null };

    const holderInfo = {
      id: ticket.user_id || ticket.attendee_id,
      type: ticket.user_id ? 'user' : 'attendee',
      name: ticket.user_name,
      email: ticket.user_email,
      mobile: ticket.attendee_mobile || null,
    };

    if (ticket.checked_in_at) {
      return {
        result: 'ALREADY_USED',
        message: 'Ticket has already been checked in',
        ticket_code: ticket.ticket_code,
        checked_in_at: ticket.checked_in_at,
        holder: holderInfo,
        event: {
          id: ticket.event_id,
          title: ticket.event_title,
          venue: ticket.event_venue,
          starts_at: ticket.event_starts_at,
        },
        member_status: membershipInfo.status,
      };
    }

    // 5. Atomic check-in state update (prevents race-condition double scans)
    const updatedTicket = await eventRepository.atomicCheckIn(ticket.id, checkedInBy);
    if (!updatedTicket) {
      const reloaded = await eventRepository.getTicketByCode(qrVerification.ticketCode);
      return {
        result: 'ALREADY_USED',
        message: 'Ticket was just checked in concurrently',
        ticket_code: ticket.ticket_code,
        checked_in_at: reloaded ? reloaded.checked_in_at : null,
        holder: holderInfo,
        member_status: membershipInfo.status,
      };
    }

    // 6. Query ticket holder membership status (shows ACTIVE, EXPIRED, or NONE for guest attendees)
    return {
      result: 'VALID',
      message: 'Check-in successful',
      ticket_code: updatedTicket.ticket_code,
      checked_in_at: updatedTicket.checked_in_at,
      checked_in_by: checkedInBy,
      holder: holderInfo,
      event: {
        id: ticket.event_id,
        title: ticket.event_title,
        venue: ticket.event_venue,
        starts_at: ticket.event_starts_at,
      },
      member_status: membershipInfo.status, // Displays 'ACTIVE', 'EXPIRED', 'PENDING', or 'NONE'
    };
  }
}

module.exports = new CheckinService();
