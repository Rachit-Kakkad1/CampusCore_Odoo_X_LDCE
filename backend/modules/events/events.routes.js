// backend/modules/events/events.routes.js
const express = require('express');
const eventsController = require('./events.controller');
const requireAuth = require('../../shared/auth/requireAuth');
const optionalAuth = require('../../shared/auth/optionalAuth');
const requireRole = require('../../shared/auth/requireRole');
const { checkinRateLimiter, purchaseRateLimiter } = require('../../shared/security/rateLimiter');
const idempotencyMiddleware = require('../../shared/security/idempotency.middleware');

// Events Router (/events or /api/events)
const eventsRouter = express.Router();

// Specific routes before /:id
eventsRouter.get('/tickets/mine', requireAuth, (req, res) => eventsController.getMyTickets(req, res));
eventsRouter.get('/my-tickets', requireAuth, (req, res) => eventsController.getMyTickets(req, res));
eventsRouter.get('/volunteers/opportunities', requireRole('volunteer', 'admin'), (req, res) => eventsController.getVolunteerOpportunities(req, res));
eventsRouter.get('/volunteers/mine', requireRole('volunteer', 'admin'), (req, res) => eventsController.getMyVolunteerApplications(req, res));

// Event CRUD & Stats
eventsRouter.post('/', requireRole('admin', 'event_manager'), (req, res) => eventsController.createEvent(req, res));
eventsRouter.get('/', (req, res) => eventsController.getAllEvents(req, res));
eventsRouter.get('/:id', (req, res) => eventsController.getEventById(req, res));
eventsRouter.patch('/:id', requireRole('admin', 'event_manager'), (req, res) => eventsController.updateEvent(req, res));
eventsRouter.patch('/:id/cancel', requireRole('admin', 'event_manager'), (req, res) => eventsController.cancelEvent(req, res));
eventsRouter.get('/:id/stats', requireRole('admin', 'event_manager', 'treasurer'), (req, res) => eventsController.getEventStats(req, res));

// Volunteer application & management under event
eventsRouter.post('/:id/volunteers/apply', requireRole('volunteer', 'admin'), (req, res) => eventsController.applyAsVolunteer(req, res));
eventsRouter.post('/:id/volunteer/apply', requireRole('volunteer', 'admin'), (req, res) => eventsController.applyAsVolunteer(req, res));
eventsRouter.post('/:id/volunteers', requireRole('admin', 'event_manager'), (req, res) => eventsController.addVolunteer(req, res));
eventsRouter.post('/:id/volunteers/add', requireRole('admin', 'event_manager'), (req, res) => eventsController.addVolunteer(req, res));
eventsRouter.get('/:id/volunteers', requireRole('admin', 'event_manager'), (req, res) => eventsController.getEventVolunteers(req, res));
eventsRouter.patch('/:id/volunteers/:applicationId', requireRole('admin', 'event_manager'), (req, res) => eventsController.updateVolunteerStatus(req, res));
eventsRouter.delete('/:id/volunteers/:applicationId', requireRole('admin', 'event_manager'), (req, res) => eventsController.removeVolunteer(req, res));
eventsRouter.post('/:id/volunteers/:applicationId/remove', requireRole('admin', 'event_manager'), (req, res) => eventsController.removeVolunteer(req, res));
eventsRouter.get('/:id/volunteer-tasks', requireRole('admin', 'event_manager'), (req, res) => {
  const tasksController = require('../tasks/tasks.controller');
  req.query.event_id = req.params.id;
  return tasksController.getAllTasks(req, res);
});
eventsRouter.get('/:id/tasks', requireRole('admin', 'event_manager'), (req, res) => {
  const tasksController = require('../tasks/tasks.controller');
  req.query.event_id = req.params.id;
  return tasksController.getAllTasks(req, res);
});

// Ticket checkout / purchase under event (with purchase rate limit and idempotency support)
eventsRouter.post('/:id/tickets', optionalAuth, purchaseRateLimiter, idempotencyMiddleware(), (req, res) => eventsController.checkoutTicket(req, res));
eventsRouter.post('/:id/purchase', requireAuth, purchaseRateLimiter, idempotencyMiddleware(), (req, res) => eventsController.purchaseTicket(req, res));
eventsRouter.post('/:id/register', optionalAuth, purchaseRateLimiter, idempotencyMiddleware(), (req, res) => eventsController.checkoutTicket(req, res));

// Tickets Router (/tickets or /api/tickets)
const ticketsRouter = express.Router();
ticketsRouter.get('/admin', requireRole('admin', 'event_manager'), (req, res) => eventsController.getAllTicketsAdmin(req, res));
ticketsRouter.get('/admin/:id', requireRole('admin', 'event_manager'), (req, res) => eventsController.getTicketDetailsAdmin(req, res));
ticketsRouter.get('/mine', requireAuth, (req, res) => eventsController.getMyTickets(req, res));
ticketsRouter.get('/my-tickets', requireAuth, (req, res) => eventsController.getMyTickets(req, res));
ticketsRouter.post('/:id/pay', optionalAuth, purchaseRateLimiter, idempotencyMiddleware(), (req, res) => eventsController.payTicket(req, res));
ticketsRouter.get('/:id/qr', optionalAuth, (req, res) => eventsController.getTicketQR(req, res));
ticketsRouter.get('/:id', requireRole('admin', 'event_manager'), (req, res) => eventsController.getTicketDetailsAdmin(req, res));

// Check-in Router (/checkin or /api/checkin with checkinRateLimiter)
const checkinRouter = express.Router();
checkinRouter.post('/scan', checkinRateLimiter, requireRole('admin', 'event_manager', 'volunteer'), (req, res) => eventsController.scanCheckIn(req, res));

// Volunteer Router (/volunteer or /api/volunteer)
const volunteerRouter = express.Router();
volunteerRouter.get('/events', requireRole('volunteer', 'admin'), (req, res) => eventsController.getVolunteerOpportunities(req, res));
volunteerRouter.post('/events/:id/apply', requireRole('volunteer', 'admin'), (req, res) => eventsController.applyAsVolunteer(req, res));
volunteerRouter.get('/mine', requireRole('volunteer', 'admin'), (req, res) => eventsController.getMyVolunteerApplications(req, res));
volunteerRouter.get('/applications', requireRole('volunteer', 'admin'), (req, res) => eventsController.getMyVolunteerApplications(req, res));

module.exports = {
  eventsRouter,
  ticketsRouter,
  checkinRouter,
  volunteerRouter,
};
