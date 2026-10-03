#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('../config/env');

const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');

async function migrate() {
  console.log('🔄 Starting database migration runner...');
  console.log(`Target database: ${env.DATABASE_URL ? 'via DATABASE_URL' : `${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT}`}`);

  const pool = new Pool({
    connectionString: env.DATABASE_URL || undefined,
    host: env.DATABASE_URL ? undefined : env.DB_HOST,
    port: env.DATABASE_URL ? undefined : env.DB_PORT,
    database: env.DATABASE_URL ? undefined : env.DB_NAME,
    user: env.DATABASE_URL ? undefined : env.DB_USER,
    password: env.DATABASE_URL ? undefined : env.DB_PASSWORD,
  });

  const client = await pool.connect();
  try {
    // 1. Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Query already executed migrations
    const appliedRes = await client.query('SELECT migration_name FROM schema_migrations ORDER BY id ASC;');
    const applied = new Set(appliedRes.rows.map(r => r.migration_name));

    // 3. Read migration files in sorted order
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const pending = files.filter(f => !applied.has(f));

    if (pending.length === 0) {
      console.log('✅ Database is already up to date. No pending migrations.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s): ${pending.join(', ')}`);

    // 4. Apply each pending migration inside an atomic transaction
    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`⏳ Applying: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (migration_name) VALUES ($1);',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed on ${file}:`, err.message);
        throw err;
      }
    }

    console.log('🎉 All pending migrations completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal migration failure:', err);
      process.exit(1);
    });
}

module.exports = { migrate };
