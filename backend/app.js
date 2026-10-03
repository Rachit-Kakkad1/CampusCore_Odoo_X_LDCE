const express = require('express');
const authRouter = require('./modules/auth/auth.routes');
const { membershipRouter, membersRouter } = require('./modules/membership/membership.routes');
const announcementsRouter = require('./modules/announcements/announcements.routes');
const { eventsRouter, ticketsRouter, checkinRouter } = require('./modules/events/events.routes');

const app = express();

// Middleware
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'student-organization-system' });
});

// Mount Module Routes
app.use('/auth', authRouter);
app.use('/membership', membershipRouter);
app.use('/members', membersRouter);
app.use('/announcements', announcementsRouter);
app.use('/events', eventsRouter);
app.use('/tickets', ticketsRouter);
app.use('/checkin', checkinRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'ROUTE_NOT_FOUND', path: req.originalUrl });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred',
  });
});

module.exports = app;
