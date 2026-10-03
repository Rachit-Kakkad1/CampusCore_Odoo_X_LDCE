const verifyQR = require('../../shared/qr/verifyQR');
const eventRepository = require('./event.repository');
const { getMembershipStatus } = require('../../shared/membership/isActiveMember');
const auditService = require('../../shared/audit/audit.service');

/**
 * Check-in Service
 * Validates QR code signatures and handles atomic door admission.
 * Supports both signed QR payloads and manual fallback ticket codes.
 */
class CheckinService {
  /**
   * Scans and verifies a QR payload or manual ticket code.
   *
   * Flow:
   * 1. Parse payload / determine if QR payload or manual fallback ticket code
   * 2. If QR payload, verify cryptographic HMAC signature (reject malformed & tampered payloads)
   * 3. Retrieve ticket from PostgreSQL (database is authoritative source of truth)
   * 4. Verify ticket payment status is 'paid'
   * 5. Verify ticket belongs to the relevant event (if eventId is specified)
   * 6. Check if ticket has already been checked in
   * 7. Atomically mark ticket checked in
   * 8. Return VALID / INVALID / ALREADY_USED with holder info and membership status
   *
   * @param {string} input - 'ticket_code.signature' OR raw 'ticket_code'
   * @param {number|null} checkedInBy - User ID of scanning staff/volunteer
   * @param {number|null} [expectedEventId] - Optional event ID filter
   * @returns {Promise<object>} Outcome object
   */
  async processScan(input, checkedInBy = null, expectedEventId = null) {
    if (!input || typeof input !== 'string') {
      return {
        result: 'INVALID',
        error: 'INVALID_PAYLOAD_FORMAT',
        message: 'Valid string payload or ticket code is required',
      };
    }

    const trimmed = input.trim();
    let ticketCode;
    let scanMode = 'manual_code';

    // 1 & 2. Distinguish QR payload from manual ticket code
    if (trimmed.includes('.')) {
      scanMode = 'qr_scan';
      const qrVerification = verifyQR(trimmed);
      if (!qrVerification.valid) {
        return {
          result: 'INVALID',
          error: qrVerification.error || 'INVALID_QR',
          message: 'QR signature mismatch or tampered payload',
          scan_mode: scanMode,
        };
      }
      ticketCode = qrVerification.ticketCode;
    } else {
      // Manual fallback ticket code
      ticketCode = trimmed;
    }

    // 3. Fetch ticket from database
    const ticket = await eventRepository.getTicketByCode(ticketCode);
    if (!ticket) {
      return {
        result: 'INVALID',
        error: 'TICKET_NOT_FOUND',
        message: 'No matching ticket found for this code',
        ticket_code: ticketCode,
        scan_mode: scanMode,
      };
    }

    // 4. Ensure ticket was paid
    if (ticket.payment_status !== 'paid') {
      return {
        result: 'INVALID',
        error: 'TICKET_NOT_PAID',
        message: 'This ticket has not been paid for',
        ticket_code: ticket.ticket_code,
        scan_mode: scanMode,
      };
    }

    // 5. Check ticket belongs to relevant event if expectedEventId is provided
    if (expectedEventId && parseInt(ticket.event_id, 10) !== parseInt(expectedEventId, 10)) {
      return {
        result: 'INVALID',
        error: 'EVENT_MISMATCH',
        message: 'This ticket is not valid for this specific event',
        ticket_code: ticket.ticket_code,
        scan_mode: scanMode,
      };
    }

    // 6. Check if ticket has already been used
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
        fallback_code: ticket.fallback_code,
        checked_in_at: ticket.checked_in_at,
        scan_mode: scanMode,
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

    // 7. Atomic check-in state update (prevents race-condition double scans)
    const updatedTicket = await eventRepository.atomicCheckIn(ticket.id, checkedInBy);
    if (!updatedTicket) {
      const reloaded = await eventRepository.getTicketByCode(ticketCode);
      await auditService.recordLog({
        actorId: checkedInBy,
        action: 'CHECKIN_REJECTED',
        entityType: 'ticket',
        entityId: ticket.id,
        metadata: { reason: 'CONCURRENT_DOUBLE_SCAN', scan_mode: scanMode },
      });
      return {
        result: 'ALREADY_USED',
        message: 'Ticket was just checked in concurrently',
        ticket_code: ticket.ticket_code,
        fallback_code: ticket.fallback_code,
        checked_in_at: reloaded ? reloaded.checked_in_at : null,
        scan_mode: scanMode,
        holder: holderInfo,
        member_status: membershipInfo.status,
      };
    }

    await auditService.recordLog({
      actorId: checkedInBy,
      action: 'TICKET_CHECKED_IN',
      entityType: 'ticket',
      entityId: updatedTicket.id,
      metadata: { scan_mode: scanMode, event_id: ticket.event_id },
    });

    // 8. Return VALID result with complete admission context
    return {
      result: 'VALID',
      message: 'Check-in successful',
      ticket_code: updatedTicket.ticket_code,
      fallback_code: updatedTicket.fallback_code || ticket.fallback_code,
      checked_in_at: updatedTicket.checked_in_at,
      checked_in_by: checkedInBy,
      scan_mode: scanMode,
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
