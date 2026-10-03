const eventsService = require('./events.service');
const ticketService = require('./ticket.service');
const checkinService = require('./checkin.service');

/**
 * Events Controller
 * Coordinates HTTP requests, inputs validation, and delegates to service layer.
 */
class EventsController {
  async createEvent(req, res) {
    try {
      const event = await eventsService.createEvent(req.body);
      return res.status(201).json({ event });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAllEvents(req, res) {
    try {
      const events = await eventsService.getAllEvents();
      return res.status(200).json({ events });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getEventById(req, res) {
    try {
      const event = await eventsService.getEventById(req.params.id);
      return res.status(200).json({ event });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getEventStats(req, res) {
    try {
      const stats = await eventsService.getEventStats(req.params.id);
      return res.status(200).json({ stats });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async checkoutTicket(req, res) {
    try {
      const eventId = req.params.id;
      const userId = req.user.id;
      const { checkout_session_id } = req.body;

      const ticket = await ticketService.checkoutTicket(eventId, userId, checkout_session_id);
      return res.status(201).json({ ticket });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async payTicket(req, res) {
    try {
      const ticketId = req.params.id;
      const userId = req.user.id;
      const { payment_mode } = req.body;

      const ticket = await ticketService.payTicket(ticketId, userId, payment_mode || 'online');
      return res.status(200).json({ message: 'Payment successful', ticket });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getMyTickets(req, res) {
    try {
      const userId = req.user.id;
      const tickets = await ticketService.getUserTickets(userId);
      return res.status(200).json({ tickets });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getTicketQR(req, res) {
    try {
      const ticketId = req.params.id;
      const userId = req.user.id;

      const qrResult = await ticketService.getTicketQR(ticketId, userId);
      return res.status(200).json(qrResult);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async scanCheckIn(req, res) {
    try {
      const payload = req.body.payload || req.body.code;
      if (!payload) {
        return res.status(400).json({ error: 'MISSING_PAYLOAD', message: 'Payload is required for check-in' });
      }

      const checkedInBy = req.user ? req.user.id : null;
      const result = await checkinService.processScan(payload, checkedInBy);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }
}

module.exports = new EventsController();
