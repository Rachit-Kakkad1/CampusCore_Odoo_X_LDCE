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
      const payload = req.body.payload || req.body.code || req.body.ticket_code || req.body.qr_data || req.body.qrData;
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
}

module.exports = new EventsController();
