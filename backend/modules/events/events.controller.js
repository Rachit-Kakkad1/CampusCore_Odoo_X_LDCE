const eventsService = require('./events.service');
const ticketService = require('./ticket.service');
const checkinService = require('./checkin.service');
const getCurrentUser = require('../../shared/auth/getCurrentUser');

/**
 * Events Controller
 * Coordinates HTTP requests, inputs validation, and delegates to service layer.
 */
class EventsController {
  async createEvent(req, res) {
    try {
      const createdBy = req.user?.id || req.user?.userId || req.body.created_by || 1;
      const event = await eventsService.createEvent({
        ...req.body,
        created_by: createdBy,
      });
      return res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event,
        data: event,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAllEvents(req, res) {
    try {
      const events = await eventsService.getAllEvents();
      return res.status(200).json({
        success: true,
        count: events.length,
        events,
        data: events,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getEventById(req, res) {
    try {
      const event = await eventsService.getEventById(req.params.id);
      return res.status(200).json({
        success: true,
        event,
        data: event,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getEventStats(req, res) {
    try {
      const stats = await eventsService.getEventStats(req.params.id);
      return res.status(200).json({
        success: true,
        stats,
        data: stats,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async checkoutTicket(req, res) {
    try {
      const eventId = req.params.id;
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;
      const { checkout_session_id, attendee, name, email, mobile } = req.body;

      let attendeeData = attendee || null;
      if (!attendeeData && (name || email || mobile)) {
        attendeeData = { name, email, mobile };
      }

      if (!userId && !attendeeData) {
        return res.status(400).json({
          error: 'MISSING_ATTENDEE_INFO',
          message: 'Guest checkout requires attendee details (name, email, mobile), or login',
        });
      }

      const ticket = await ticketService.checkoutTicket(eventId, userId, checkout_session_id, attendeeData);
      return res.status(201).json({
        success: true,
        ticket,
        data: ticket,
        ...ticket,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async purchaseTicket(req, res) {
    try {
      const eventId = req.params.id || req.body.event_id;
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : req.body.user_id;
      const { payment_mode = 'online' } = req.body || {};

      const ticket = await eventsService.purchaseTicket(eventId, userId, { payment_mode });
      return res.status(201).json({
        success: true,
        message: 'Ticket purchased successfully',
        ticket,
        data: ticket,
        ...ticket,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async payTicket(req, res) {
    try {
      const ticketId = req.params.id;
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;
      const { payment_mode, email } = req.body || {};

      const ticket = await ticketService.payTicket(ticketId, userId, payment_mode || 'online', email);
      return res.status(200).json({
        success: true,
        message: 'Payment successful',
        ticket,
        data: ticket,
        ...ticket,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getMyTickets(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : req.headers['x-user-id'];
      const tickets = await eventsService.getUserTickets(userId);
      return res.status(200).json({
        success: true,
        count: tickets.length,
        tickets,
        data: tickets,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getTicketQR(req, res) {
    try {
      const ticketId = req.params.id;
      const userId = req.user ? (req.user.id || req.user.userId) : null;

      const qrResult = await ticketService.getTicketQR(ticketId, userId);
      return res.status(200).json(qrResult);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async scanCheckIn(req, res) {
    try {
      const payload = req.body.payload || req.body.code || req.body.ticket_code;
      if (!payload) {
        return res.status(400).json({ error: 'MISSING_PAYLOAD', message: 'Payload or ticket code is required for check-in' });
      }

      const checkedInBy = req.user ? (req.user.id || req.user.userId) : null;
      const expectedEventId = req.body.event_id || req.params.id || null;
      const result = await checkinService.processScan(payload, checkedInBy, expectedEventId);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async updateEvent(req, res) {
    try {
      const event = await eventsService.updateEvent(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        event,
        data: event,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async cancelEvent(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const actor = req.user || getCurrentUser(req);
      const actorId = actor ? (actor.id || actor.userId) : null;
      const result = await eventsService.cancelEvent(id, actorId, reason, req);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async applyAsVolunteer(req, res) {
    try {
      const eventId = req.params.id;
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;

      if (!userId) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required to apply as a volunteer' });
      }

      const result = await eventsService.applyAsVolunteer(eventId, userId);
      return res.status(201).json({
        success: true,
        message: 'Volunteer application submitted successfully',
        data: result,
        ...result,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getEventVolunteers(req, res) {
    try {
      const eventId = req.params.id;
      const volunteers = await eventsService.getEventVolunteers(eventId);
      return res.status(200).json({
        success: true,
        count: volunteers.length,
        volunteers,
        data: volunteers,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async updateVolunteerStatus(req, res) {
    try {
      const applicationId = req.params.applicationId || req.params.appId;
      const { status } = req.body;
      const actor = req.user || getCurrentUser(req);
      const actorId = actor ? (actor.id || actor.userId) : null;

      const updated = await eventsService.updateVolunteerStatus(applicationId, status, actorId);
      return res.status(200).json({
        success: true,
        message: `Volunteer application marked as ${status}`,
        application: updated,
        data: updated,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async removeVolunteer(req, res) {
    try {
      const applicationId = req.params.applicationId || req.params.appId;
      const actor = req.user || getCurrentUser(req);
      const actorId = actor ? (actor.id || actor.userId) : null;

      const updated = await eventsService.updateVolunteerStatus(applicationId, 'removed', actorId);
      return res.status(200).json({
        success: true,
        message: 'Volunteer removed from event',
        application: updated,
        data: updated,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getMyVolunteerApplications(req, res) {
    try {
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;

      if (!userId) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const applications = await eventsService.getUserVolunteerApplications(userId);
      return res.status(200).json({
        success: true,
        count: applications.length,
        applications,
        data: applications,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getVolunteerOpportunities(req, res) {
    try {
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;

      const opportunities = await eventsService.getVolunteerOpportunities(userId);
      return res.status(200).json({
        success: true,
        count: opportunities.length,
        events: opportunities,
        data: opportunities,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }
}

module.exports = new EventsController();
