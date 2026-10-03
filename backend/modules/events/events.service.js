// backend/modules/events/events.service.js
const crypto = require('crypto');
const { pool } = require('../../config/database');
const eventRepository = require('./event.repository');
const { isActiveMember } = require('../../shared/membership/isActiveMember');
const { createTransaction } = require('../../shared/transactions/createTransaction');

class EventsService {
  /**
   * Creates a new event.
   */
  async createEvent(eventData) {
    const {
      title,
      description = null,
      venue,
      starts_at,
      capacity,
      seats_remaining,
      member_price,
      non_member_price,
      created_by = null,
    } = eventData;

    if (!title || !venue || !starts_at || capacity === undefined || member_price === undefined || non_member_price === undefined) {
      const err = new Error('All event fields (title, venue, starts_at, capacity, member_price, non_member_price) are required');
      err.code = 'INVALID_EVENT_DATA';
      err.status = 400;
      throw err;
    }

    const parsedCapacity = parseInt(capacity, 10);
    const parsedMemberPrice = parseFloat(member_price);
    const parsedNonMemberPrice = parseFloat(non_member_price);

    if (isNaN(parsedCapacity) || parsedCapacity < 0) {
      const err = new Error('Capacity must be a non-negative integer');
      err.code = 'INVALID_CAPACITY';
      err.status = 400;
      throw err;
    }

    if (isNaN(parsedMemberPrice) || parsedMemberPrice < 0 || isNaN(parsedNonMemberPrice) || parsedNonMemberPrice < 0) {
      const err = new Error('Prices must be non-negative numbers');
      err.code = 'INVALID_PRICE';
      err.status = 400;
      throw err;
    }

    return await eventRepository.createEvent({
      title,
      description,
      venue,
      starts_at,
      capacity: parsedCapacity,
      seats_remaining: seats_remaining !== undefined ? parseInt(seats_remaining, 10) : parsedCapacity,
      member_price: parsedMemberPrice,
      non_member_price: parsedNonMemberPrice,
      created_by,
    });
  }

  /**
   * Retrieves all events.
   */
  async getAllEvents() {
    return await eventRepository.getAllEvents();
  }

  /**
   * Retrieves single event by ID.
   */
  async getEventById(id) {
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return event;
  }

  /**
   * Retrieves real-time statistics for an event.
   */
  async getEventStats(id) {
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const stats = await eventRepository.getEventStats(eventId);
    if (!stats) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return stats;
  }

  /**
   * Retrieves tickets for a specific user.
   */
  async getUserTickets(userId) {
    if (!userId) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }
    return await eventRepository.getTicketsByUserId(userId);
  }

  /**
   * Purchases a ticket atomically.
   */
  async purchaseTicket(eventId, userId, { payment_mode = 'online' } = {}) {
    if (!eventId) {
      const err = new Error('Event ID is required');
      err.status = 400;
      throw err;
    }
    if (!userId) {
      const err = new Error('Authentication required to purchase a ticket');
      err.status = 401;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const event = await eventRepository.getEventByIdForUpdate(eventId, client);
      if (!event) {
        const err = new Error('Event not found');
        err.status = 404;
        throw err;
      }

      if (event.seats_remaining <= 0) {
        const err = new Error('Sorry, this event is sold out');
        err.status = 400;
        throw err;
      }

      const isMember = await isActiveMember(userId, client);
      const priceType = isMember ? 'member' : 'non_member';
      const price = isMember ? event.member_price : event.non_member_price;

      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
      const ticketCode = `TKT-EVT${eventId}-${userId}-${randomHex}`;

      const updatedEvent = await eventRepository.decrementSeat(eventId, client);
      if (!updatedEvent) {
        const err = new Error('Failed to reserve seat. Event may be sold out.');
        err.status = 400;
        throw err;
      }

      const ticket = await eventRepository.createTicket(
        {
          event_id: eventId,
          user_id: userId,
          price,
          price_type: priceType,
          ticket_code: ticketCode,
          payment_status: 'paid',
          checkout_session_id: `sess_tkt_${Date.now()}_${randomHex}`,
        },
        client
      );

      try {
        await createTransaction(
          {
            source_type: 'ticket',
            source_id: ticket.id,
            user_id: userId,
            amount: price,
            direction: 'in',
            payment_mode,
            status: 'paid',
          },
          client
        );
      } catch (txErr) {
        console.warn('Ticket transaction record skipped:', txErr.message);
      }

      await client.query('COMMIT');

      const fullTicket = await eventRepository.getTicketById(ticket.id);
      return fullTicket || ticket;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new EventsService();
