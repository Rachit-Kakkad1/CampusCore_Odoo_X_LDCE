#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('../config/env');

async function seed() {
  console.log('🌱 Starting database seed script...');

  const pool = new Pool({
    connectionString: env.DATABASE_URL || undefined,
    host: env.DATABASE_URL ? undefined : env.DB_HOST,
    port: env.DATABASE_URL ? undefined : env.DB_PORT,
    database: env.DATABASE_URL ? undefined : env.DB_NAME,
    user: env.DATABASE_URL ? undefined : env.DB_USER,
    password: env.DATABASE_URL ? undefined : env.DB_PASSWORD,
  });

  const seedFile = path.resolve(__dirname, 'seed.sql');
  const sql = fs.readFileSync(seedFile, 'utf8');

  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('✅ Seed data inserted successfully for all 14 entities.');
  } catch (error) {
    console.error('❌ Failed to run seed data:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seed };
