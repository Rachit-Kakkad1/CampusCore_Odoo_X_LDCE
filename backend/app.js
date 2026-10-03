const express = require('express');
const cors = require('cors');

const authRouter = require('./modules/auth/auth.routes');
const { membershipRouter, membersRouter } = require('./modules/membership/membership.routes');
const announcementsRouter = require('./modules/announcements/announcements.routes');
const { eventsRouter, ticketsRouter, checkinRouter } = require('./modules/events/events.routes');
const merchandiseRoutes = require('./modules/merchandise/merchandise.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const tasksRouter = require('./modules/tasks/tasks.routes');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Central Health Check
const healthHandler = (req, res) => {
  res.status(200).json({ status: 'ok', service: 'student-organization-system' });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount Module Routes (Root & /api prefixes supported for backwards/cross compatibility)
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);

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

// Centralized 404 & Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('Server error:', err);
  }
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An internal server error occurred',
  });
});

module.exports = app;
