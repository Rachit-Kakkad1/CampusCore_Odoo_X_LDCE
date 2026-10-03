const express = require('express');
const cors = require('cors');

const requestIdMiddleware = require('./shared/security/requestId');
const securityHeaders = require('./shared/security/securityHeaders');

const authRouter = require('./modules/auth/auth.routes');
const { membershipRouter, membersRouter } = require('./modules/membership/membership.routes');
const announcementsRouter = require('./modules/announcements/announcements.routes');
const { eventsRouter, ticketsRouter, checkinRouter, volunteerRouter } = require('./modules/events/events.routes');
const merchandiseRoutes = require('./modules/merchandise/merchandise.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const tasksRouter = require('./modules/tasks/tasks.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const adminSecurityRoutes = require('./modules/admin/security.routes');

const app = express();

// Security and request correlation middleware
app.use(requestIdMiddleware);
app.use(securityHeaders);
app.use(cors());
app.use(express.json());

// Health & Readiness Checks
const healthHandler = (req, res) => {
  res.status(200).json({ status: 'ok', service: 'student-organization-system' });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

const readyHandler = async (req, res) => {
  try {
    const { pool } = require('./config/database');
    await pool.query('SELECT 1;');
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', database: 'disconnected', error: err.message });
  }
};
app.get('/ready', readyHandler);
app.get('/api/ready', readyHandler);

// Mount Module Routes (Root & /api prefixes supported for backwards/cross compatibility)
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);

// Dedicated /users endpoints
const usersRouter = express.Router();
const authController = require('./modules/auth/auth.controller');
const requireAuth = require('./shared/auth/requireAuth');
const requireRole = require('./shared/auth/requireRole');

usersRouter.get('/stats', requireAuth, requireRole('admin'), (req, res) => authController.getStats(req, res));
usersRouter.get('/', requireAuth, requireRole('admin'), (req, res) => authController.getAllUsers(req, res));
usersRouter.post('/', requireAuth, requireRole('admin'), (req, res) => authController.createUser(req, res));
usersRouter.patch('/:id/role', requireAuth, requireRole('admin'), (req, res) => authController.updateRole(req, res));
usersRouter.delete('/:id', requireAuth, requireRole('admin'), (req, res) => authController.deleteUser(req, res));

app.use('/users', usersRouter);
app.use('/api/users', usersRouter);

app.use('/membership', membershipRouter);
app.use('/api/membership', membershipRouter);
app.use('/memberships', membershipRouter);
app.use('/api/memberships', membershipRouter);

app.use('/members', membersRouter);
app.use('/api/members', membersRouter);

app.use('/announcements', announcementsRouter);
app.use('/api/announcements', announcementsRouter);

app.use('/events', eventsRouter);
app.use('/api/events', eventsRouter);

app.use('/volunteer', volunteerRouter);
app.use('/api/volunteer', volunteerRouter);

app.use('/tickets', ticketsRouter);
app.use('/api/tickets', ticketsRouter);

app.use('/checkin', checkinRouter);
app.use('/api/checkin', checkinRouter);

app.use('/merchandise', merchandiseRoutes);
app.use('/api/merchandise', merchandiseRoutes);
app.use('/', merchandiseRoutes); // allows direct /products and /orders

app.use('/finance', financeRoutes);
app.use('/api/finance', financeRoutes);

app.use('/tasks', tasksRouter);
app.use('/api/tasks', tasksRouter);

app.use('/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/admin/security', adminSecurityRoutes);
app.use('/api/admin/security', adminSecurityRoutes);

// Centralized 404 & Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[${req.requestId || 'no-id'}] Server error:`, err);
  }
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An internal server error occurred',
    requestId: req.requestId || null,
  });
});

module.exports = app;
