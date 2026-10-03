const crypto = require('crypto');
const { pool } = require('../../config/database');
const eventRepository = require('./event.repository');
const { isActiveMember } = require('../../shared/membership/isActiveMember');
const createTransaction = require('../../shared/transactions/createTransaction');
const generateQR = require('../../shared/qr/generateQR');

/**
 * Ticket Service
 * Manages ticket checkout, atomic payment with seat reservation, and QR code access.
 */
class TicketService {
  /**
   * Creates a pending ticket at checkout time.
   * Supports both Flow A (Registered User) and Flow B (Event Guest Attendee).
   * Does NOT decrement seat capacity.
   */
  async checkoutTicket(eventId, userId = null, checkoutSessionId = null, attendeeData = null) {
    const parsedEventId = parseInt(eventId, 10);
    if (isNaN(parsedEventId)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const event = await eventRepository.getEventById(parsedEventId);
    if (!event) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (event.seats_remaining <= 0) {
      const err = new Error('No seats available for this event');
      err.code = 'NO_SEATS_AVAILABLE';
      err.status = 409;
      throw err;
    }

    // Unique ticket code formatted as TCK-<timestamp>-<random_hex>
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const ticketCode = `TCK-${Date.now()}-${randomHex}`;

    if (userId) {
      // FLOW A — REGISTERED USER / MEMBER
      const isMember = await isActiveMember(userId);
      const price = isMember ? event.member_price : event.non_member_price;
      const priceType = isMember ? 'member' : 'non_member';

      return await eventRepository.createTicket({
        ticket_code: ticketCode,
        event_id: parsedEventId,
        user_id: userId,
        attendee_id: null,
        price,
        price_type: priceType,
        payment_status: 'pending',
        checkout_session_id: checkoutSessionId,
      });
    } else {
      // FLOW B — EVENT GUEST / ATTENDEE (No system account required)
      if (!attendeeData || !attendeeData.name || !attendeeData.email || !attendeeData.mobile) {
        const err = new Error('Event guest registration requires name, email, and mobile');
        err.code = 'INVALID_ATTENDEE_DATA';
        err.status = 400;
        throw err;
      }

      const attendee = await eventRepository.createAttendee({
        name: attendeeData.name.trim(),
        email: attendeeData.email.trim().toLowerCase(),
        mobile: attendeeData.mobile.trim(),
      });

      // Guest attendee is always non-member price
      const price = event.non_member_price;
      const priceType = 'non_member';

      return await eventRepository.createTicket({
        ticket_code: ticketCode,
        event_id: parsedEventId,
        user_id: null,
        attendee_id: attendee.id,
        price,
        price_type: priceType,
        payment_status: 'pending',
        checkout_session_id: checkoutSessionId,
      });
    }
  }

  /**
   * Processes ticket payment atomically.
   * Decrements seats, marks ticket as paid, and registers ledger transaction.
   */
  async payTicket(ticketId, userId = null, paymentMode = 'online') {
    const parsedTicketId = parseInt(ticketId, 10);
    if (isNaN(parsedTicketId)) {
      const err = new Error('Invalid ticket ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock and check ticket
      const ticket = await eventRepository.getTicketByIdForUpdate(parsedTicketId, client);
      if (!ticket) {
        const err = new Error('Ticket not found');
        err.code = 'TICKET_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      // Check ownership if ticket belongs to a registered user and userId is supplied
      if (userId && ticket.user_id && ticket.user_id !== userId) {
        const err = new Error('You do not own this ticket');
        err.code = 'FORBIDDEN';
        err.status = 403;
        throw err;
      }

      if (ticket.payment_status === 'paid') {
        const err = new Error('Ticket is already paid');
        err.code = 'TICKET_ALREADY_PAID';
        err.status = 400;
        throw err;
      }

      // 2. Lock event row to eliminate race conditions
      const event = await eventRepository.getEventByIdForUpdate(ticket.event_id, client);
      if (!event) {
        const err = new Error('Event not found');
        err.code = 'EVENT_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      // 3. Verify seat availability
      if (event.seats_remaining <= 0) {
        const err = new Error('No seats available');
        err.code = 'NO_SEATS_AVAILABLE';
        err.status = 409;
        throw err;
      }

      // 4. Atomically decrement seats_remaining
      const updatedEvent = await eventRepository.decrementSeat(event.id, client);
      if (!updatedEvent) {
        const err = new Error('Failed to reserve seat; no seats remaining');
        err.code = 'NO_SEATS_AVAILABLE';
        err.status = 409;
        throw err;
      }

      // 5. Mark ticket as paid
      const paidTicket = await eventRepository.markTicketPaid(ticket.id, client);

      // 6. Create ledger transaction (strictly 1 transaction per successful payment)
      await createTransaction({
        source_type: 'ticket',
        source_id: paidTicket.id,
        user_id: paidTicket.user_id || null,
        amount: paidTicket.price,
        direction: 'in',
        payment_mode: paymentMode,
        status: 'paid',
      }, client);

      await client.query('COMMIT');
      return paidTicket;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all tickets owned by the user.
   */
  async getUserTickets(userId) {
    return await eventRepository.getTicketsByUserId(userId);
  }

  /**
   * Retrieves the signed QR code for a valid paid ticket.
   */
  async getTicketQR(ticketId, userId = null) {
    const parsedTicketId = parseInt(ticketId, 10);
    if (isNaN(parsedTicketId)) {
      const err = new Error('Invalid ticket ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const ticket = await eventRepository.getTicketById(parsedTicketId);
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.code = 'TICKET_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (userId && ticket.user_id && ticket.user_id !== userId) {
      const err = new Error('Access denied to this ticket');
      err.code = 'FORBIDDEN';
      err.status = 403;
      throw err;
    }

    if (ticket.payment_status !== 'paid') {
      const err = new Error('QR code is only available for paid tickets');
      err.code = 'TICKET_NOT_PAID';
      err.status = 400;
      throw err;
    }

    const qrData = await generateQR(ticket.ticket_code);
    return {
      ticket,
      qr: qrData,
    };
  }
}

module.exports = new TicketService();
