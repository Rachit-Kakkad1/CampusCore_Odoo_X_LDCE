const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL || undefined,
  host: env.DATABASE_URL ? undefined : env.DB_HOST,
  port: env.DATABASE_URL ? undefined : env.DB_PORT,
  database: env.DATABASE_URL ? undefined : env.DB_NAME,
  user: env.DATABASE_URL ? undefined : env.DB_USER,
  password: env.DATABASE_URL ? undefined : env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time, current_database() AS db_name, current_user AS db_user;');
    const row = result.rows[0];
    console.log('✅ PostgreSQL connection successful');
    console.log(`Database: ${row.db_name} | User: ${row.db_user} | Server Time: ${row.current_time}`);
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}

if (require.main === module) {
  testConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal error during connection test:', err);
      process.exit(1);
    });
}

module.exports = {
  pool,
  testConnection,
  query: (text, params) => pool.query(text, params),
};
