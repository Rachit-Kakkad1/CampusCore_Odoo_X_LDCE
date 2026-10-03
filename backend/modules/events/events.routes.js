const express = require('express');
const eventsController = require('./events.controller');
const requireAuth = require('../../shared/auth/requireAuth');
const optionalAuth = require('../../shared/auth/optionalAuth');
const requireRole = require('../../shared/auth/requireRole');

// Events Router (/events)
const eventsRouter = express.Router();

// Event CRUD & Stats
eventsRouter.post('/', requireRole('admin', 'event_manager'), (req, res) => eventsController.createEvent(req, res));
eventsRouter.get('/', (req, res) => eventsController.getAllEvents(req, res));
eventsRouter.get('/:id', (req, res) => eventsController.getEventById(req, res));
eventsRouter.get('/:id/stats', requireRole('admin', 'event_manager', 'treasurer'), (req, res) => eventsController.getEventStats(req, res));

// Ticket checkout under event (supports both registered user and guest checkout)
eventsRouter.post('/:id/tickets', optionalAuth, (req, res) => eventsController.checkoutTicket(req, res));
eventsRouter.post('/:id/register', optionalAuth, (req, res) => eventsController.checkoutTicket(req, res));

// Tickets Router (/tickets)
const ticketsRouter = express.Router();
ticketsRouter.get('/mine', requireAuth, (req, res) => eventsController.getMyTickets(req, res));
ticketsRouter.post('/:id/pay', optionalAuth, (req, res) => eventsController.payTicket(req, res));
ticketsRouter.get('/:id/qr', optionalAuth, (req, res) => eventsController.getTicketQR(req, res));

// Check-in Router (/checkin)
const checkinRouter = express.Router();
checkinRouter.post('/scan', requireRole('admin', 'event_manager', 'volunteer'), (req, res) => eventsController.scanCheckIn(req, res));

module.exports = {
  eventsRouter,
  ticketsRouter,
  checkinRouter,
};
