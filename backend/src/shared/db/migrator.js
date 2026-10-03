const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const { withTransaction } = require('./transaction');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../migrations');

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

/**
 * Returns a list of filenames that have already been executed.
 */
async function getAppliedMigrations() {
  const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY id ASC;');
  return new Set(result.rows.map(row => row.filename));
}

/**
 * Executes all pending migrations in alphabetical order.
 */
async function runMigrations() {
  console.log('🔄 Checking database migrations...');
  await ensureMigrationsTable();

  const appliedMigrations = await getAppliedMigrations();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const pending = files.filter(file => !appliedMigrations.has(file));

  if (pending.length === 0) {
    console.log('✅ Database is already up to date. No pending migrations.');
    return { applied: 0, pending: 0 };
  }

  console.log(`Found ${pending.length} pending migration(s): ${pending.join(', ')}`);

  for (const file of pending) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`⏳ Applying migration: ${file}...`);
    try {
      await withTransaction(async (client) => {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1);',
          [file]
        );
      });
      console.log(`✅ Applied migration successfully: ${file}`);
    } catch (err) {
      console.error(`❌ Migration failed on ${file}:`, err.message);
      throw err;
    }
  }

  console.log('🎉 All migrations applied successfully.');
  return { applied: pending.length, pending: 0 };
}

module.exports = {
  runMigrations,
  ensureMigrationsTable,
  getAppliedMigrations,
};
