const express = require('express');
const cors = require('cors');
const { pool } = require('./shared/db/pool');

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Root Information Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'CampusCore Student Organization System API',
    version: '1.0.0',
    phase: 'Phase 1 - Database & Foundation',
    status: 'operational',
  });
});

// Database Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT 1 AS healthy;');
    if (dbRes.rows[0].healthy === 1) {
      return res.status(200).json({
        status: 'ok',
        database: 'connected',
      });
    }
    return res.status(503).json({
      status: 'error',
      database: 'unexpected response',
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error.message,
    });
  }
});

module.exports = app;
