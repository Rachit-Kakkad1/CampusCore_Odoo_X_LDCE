const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables if not already loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to current working directory

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error on PostgreSQL pool:', err);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  testConnection: async () => {
    const res = await pool.query('SELECT 1 AS alive;');
    return res.rows[0].alive === 1;
  },
};
