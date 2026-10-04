// backend/modules/events/events.service.js
const crypto = require('crypto');
const { pool } = require('../../config/database');
const eventRepository = require('./event.repository');
const { isActiveMember } = require('../../shared/membership/isActiveMember');
const { createTransaction } = require('../../shared/transactions/createTransaction');
const auditService = require('../../shared/audit/audit.service');
const outboxService = require('../../shared/outbox/outbox.service');

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
      ends_at = null,
      capacity,
      seats_remaining,
      member_price,
      non_member_price,
      volunteers_enabled = false,
      volunteers_required = 0,
      event_manager_id = null,
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
    const parsedEventManagerId = event_manager_id ? parseInt(event_manager_id, 10) : null;

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

    const isVolunteersEnabled = Boolean(volunteers_enabled);
    let parsedVolunteersRequired = 0;
    if (isVolunteersEnabled) {
      parsedVolunteersRequired = parseInt(volunteers_required, 10);
      if (isNaN(parsedVolunteersRequired) || parsedVolunteersRequired < 1) {
        const err = new Error('Volunteers required must be an integer of at least 1 when volunteer requirement is enabled');
        err.code = 'INVALID_VOLUNTEER_REQUIREMENT';
        err.status = 400;
        throw err;
      }
      if (parsedVolunteersRequired > 500) {
        const err = new Error('Volunteers required cannot exceed 500');
        err.code = 'VOLUNTEERS_LIMIT_EXCEEDED';
        err.status = 400;
        throw err;
      }
    }

    return await eventRepository.createEvent({
      title,
      description,
      venue,
      starts_at,
      ends_at,
      capacity: parsedCapacity,
      seats_remaining: seats_remaining !== undefined ? parseInt(seats_remaining, 10) : parsedCapacity,
      member_price: parsedMemberPrice,
      non_member_price: parsedNonMemberPrice,
      volunteers_enabled: isVolunteersEnabled,
      volunteers_required: parsedVolunteersRequired,
      event_manager_id: parsedEventManagerId,
      created_by,
    });
  }

  /**
   * Retrieves events (with optional filtering, search, and pagination).
   */
  async getAllEvents(filter = {}) {
    return await eventRepository.getAllEvents(filter);
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

      if (event.status === 'cancelled') {
        const err = new Error('This event has been cancelled and tickets cannot be purchased');
        err.code = 'EVENT_CANCELLED';
        err.status = 409;
        throw err;
      }

      if (event.starts_at && new Date(event.starts_at) < new Date()) {
        const err = new Error('This event has already taken place and ticket registration is closed');
        err.code = 'EVENT_PAST';
        err.status = 400;
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

  /**
   * Updates an existing event.
   */
  async updateEvent(id, updateData) {
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const existing = await eventRepository.getEventById(eventId);
    if (!existing) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const dataToUpdate = { ...updateData };

    if (dataToUpdate.volunteers_enabled !== undefined) {
      dataToUpdate.volunteers_enabled = Boolean(dataToUpdate.volunteers_enabled);
      if (dataToUpdate.volunteers_enabled) {
        const reqCount = parseInt(dataToUpdate.volunteers_required !== undefined ? dataToUpdate.volunteers_required : existing.volunteers_required, 10);
        if (isNaN(reqCount) || reqCount < 1) {
          const err = new Error('Volunteers required must be an integer of at least 1 when volunteer requirement is enabled');
          err.code = 'INVALID_VOLUNTEER_REQUIREMENT';
          err.status = 400;
          throw err;
        }
        if (reqCount > 500) {
          const err = new Error('Volunteers required cannot exceed 500');
          err.code = 'VOLUNTEERS_LIMIT_EXCEEDED';
          err.status = 400;
          throw err;
        }
        dataToUpdate.volunteers_required = reqCount;
      } else {
        dataToUpdate.volunteers_required = 0;
      }
    }

    const updated = await eventRepository.updateEvent(eventId, dataToUpdate);
    return updated;
  }

  /**
   * Concurrency-safe volunteer application with row-level locking.
   */
  async applyAsVolunteer(eventId, userId) {
    const parsedEventId = parseInt(eventId, 10);
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedEventId)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }
    if (isNaN(parsedUserId)) {
      const err = new Error('Authentication required');
      err.code = 'UNAUTHORIZED';
      err.status = 401;
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock the event row for concurrency safety
      const event = await eventRepository.getEventByIdForUpdate(parsedEventId, client);
      if (!event) {
        const err = new Error('Event not found');
        err.code = 'EVENT_NOT_FOUND';
        err.status = 404;
        throw err;
      }

      // 2. Verify event accepts volunteers
      if (event.status === 'cancelled') {
        const err = new Error('Volunteer applications are closed for cancelled events');
        err.code = 'EVENT_CANCELLED';
        err.status = 409;
        throw err;
      }

      if (new Date(event.starts_at) < new Date()) {
        const err = new Error('Volunteer applications are closed because the event has already started');
        err.code = 'EVENT_ALREADY_STARTED';
        err.status = 409;
        throw err;
      }

      if (!event.volunteers_enabled || event.volunteers_required <= 0) {
        const err = new Error('This event is not accepting volunteers');
        err.code = 'VOLUNTEERS_NOT_ENABLED';
        err.status = 400;
        throw err;
      }

      // 3. Verify user hasn't already applied
      const existingApp = await eventRepository.getVolunteerApplicationByUserAndEvent(parsedEventId, parsedUserId, client);
      if (existingApp && (existingApp.status === 'pending' || existingApp.status === 'approved')) {
        const err = new Error('You have already applied to volunteer for this event');
        err.code = 'ALREADY_APPLIED';
        err.status = 409;
        throw err;
      }

      // 4. Check active capacity inside the row lock
      const activeCount = await eventRepository.getActiveVolunteerCount(parsedEventId, client);
      if (activeCount >= event.volunteers_required) {
        const err = new Error('Volunteer capacity has been reached for this event');
        err.code = 'VOLUNTEER_CAPACITY_REACHED';
        err.status = 409;
        throw err;
      }

      let application;
      if (existingApp) {
        // Re-activate if was removed or rejected
        const updateQuery = `
          UPDATE event_volunteers
          SET status = 'pending', applied_at = NOW(), removed_at = NULL, removed_by = NULL, updated_at = NOW()
          WHERE id = $1
          RETURNING *;
        `;
        const res = await client.query(updateQuery, [existingApp.id]);
        application = res.rows[0];
      } else {
        application = await eventRepository.applyAsVolunteer({ event_id: parsedEventId, user_id: parsedUserId }, client);
      }

      await client.query('COMMIT');

      const updatedEvent = await eventRepository.getEventById(parsedEventId);
      return {
        application,
        volunteers_required: updatedEvent.volunteers_required,
        volunteers_applied: updatedEvent.volunteers_applied,
        volunteers_remaining: updatedEvent.volunteers_remaining,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all volunteer applications for an event (Admin / Event Manager).
   */
  async getEventVolunteers(eventId) {
    const id = parseInt(eventId, 10);
    if (isNaN(id)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }
    return await eventRepository.getVolunteerApplications(id);
  }

  /**
   * Updates a volunteer application status (approved, rejected, removed) with audit tracking.
   */
  async updateVolunteerStatus(applicationId, status, actorId) {
    const appId = parseInt(applicationId, 10);
    if (isNaN(appId)) {
      const err = new Error('Invalid application ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const validStatuses = ['approved', 'rejected', 'removed', 'pending'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      err.code = 'INVALID_STATUS';
      err.status = 400;
      throw err;
    }

    const application = await eventRepository.getVolunteerApplicationById(appId);
    if (!application) {
      const err = new Error('Volunteer application not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updated = await eventRepository.updateVolunteerApplicationStatus(appId, {
      status,
      approved_by: status === 'approved' ? actorId : null,
      removed_by: status === 'removed' ? actorId : null,
    });

    return updated;
  }

  /**
   * Adds/assigns a volunteer to an event directly (Admin / Event Manager).
   */
  async addVolunteer(eventId, userId, actorId) {
    const id = parseInt(eventId, 10);
    const uId = parseInt(userId, 10);
    if (isNaN(id) || isNaN(uId)) {
      const err = new Error('Invalid event ID or user ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const event = await eventRepository.getEventById(id);
    if (!event) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    if (event.status === 'cancelled') {
      const err = new Error('Cannot assign volunteers to a cancelled event');
      err.code = 'EVENT_CANCELLED';
      err.status = 409;
      throw err;
    }

    const assignment = await eventRepository.addVolunteer({
      event_id: id,
      user_id: uId,
      status: 'approved',
      approved_by: actorId,
    });

    return assignment;
  }

  /**
   * Retrieves volunteer applications for a specific user.
   */
  async getUserVolunteerApplications(userId) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      const err = new Error('User ID is required');
      err.status = 400;
      throw err;
    }
    return await eventRepository.getUserVolunteerApplications(id);
  }

  /**
   * Retrieves all volunteer opportunities with user-specific application status.
   */
  async getVolunteerOpportunities(userId) {
    const allEvents = await eventRepository.getAllEvents();
    const volunteerEvents = allEvents.filter(e => e.volunteers_enabled);

    let userApps = [];
    if (userId) {
      userApps = await eventRepository.getUserVolunteerApplications(userId);
    }
    const userAppMap = new Map(userApps.map(a => [a.event_id, a]));

    return volunteerEvents.map(evt => {
      const myApp = userAppMap.get(evt.id);
      return {
        ...evt,
        my_application: myApp ? {
          id: myApp.id,
          status: myApp.status,
          applied_at: myApp.applied_at,
        } : null,
        has_applied: !!(myApp && (myApp.status === 'pending' || myApp.status === 'approved')),
      };
    });
  }

  /**
   * Manually cancels an event (non-destructive, audit-tracked).
   */
  async cancelEvent(id, actorId, reasonArg = 'Administrative cancellation', req = null) {
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const existing = await eventRepository.getEventById(eventId);
    if (!existing) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const reason = typeof reasonArg === 'string' ? reasonArg : (reasonArg?.reason || 'Administrative cancellation');

    if (existing.status === 'cancelled') {
      return { success: true, message: 'Event is already cancelled', event: existing };
    }

    const res = await pool.query(
      `UPDATE events
       SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $1, cancellation_reason = $2
       WHERE id = $3
       RETURNING *;`,
      [actorId, reason.trim(), eventId]
    );

    const cancelledEvent = res.rows[0];

    await auditService.recordLog({
      actorId,
      action: 'EVENT_CANCELLED',
      entityType: 'event',
      entityId: eventId,
      oldValue: { status: existing.status },
      newValue: { status: 'cancelled', cancellation_reason: reason },
      req,
    });

    await outboxService.enqueueEvent({
      eventType: 'EVENT_CANCELLED',
      aggregateType: 'event',
      aggregateId: eventId,
      payload: {
        eventId,
        eventTitle: existing.title,
        reason,
        cancelledAt: cancelledEvent.cancelled_at,
      },
    });

    return { success: true, message: 'Event cancelled successfully', event: cancelledEvent };
  }

  /**
   * Admin / Event Manager: Retrieves paginated tickets across the platform.
   */
  async getAllTicketsAdmin(filters = {}) {
    return await eventRepository.getAllTicketsAdmin(filters);
  }

  /**
   * Admin / Event Manager: Retrieves single ticket detailed record with audit log.
   */
  async getTicketDetailsAdmin(ticketId, managerId = null) {
    const parsedId = parseInt(ticketId, 10);
    if (isNaN(parsedId)) {
      const err = new Error('Invalid ticket ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const ticket = await eventRepository.getTicketDetailsAdmin(parsedId, managerId);
    if (!ticket) {
      const err = new Error('Ticket not found or unauthorized');
      err.code = 'TICKET_NOT_FOUND';
      err.status = 404;
      throw err;
    }
    return ticket;
  }
}

module.exports = new EventsService();
