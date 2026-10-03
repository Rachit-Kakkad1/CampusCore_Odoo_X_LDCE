const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const membershipRoutes = require('./modules/membership/membership.routes');
const announcementsRoutes = require('./modules/announcements/announcements.routes');
const eventsRoutes = require('./modules/events/events.routes');
const merchandiseRoutes = require('./modules/merchandise/merchandise.routes');
const financeRoutes = require('./modules/finance/finance.routes');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Base Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Register feature module routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/merchandise', merchandiseRoutes);
app.use('/api/finance', financeRoutes);

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status,
    },
  });
});

module.exports = app;
