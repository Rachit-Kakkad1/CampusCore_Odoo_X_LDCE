#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { pool } = require('../src/shared/db/pool');
const { withTransaction } = require('../src/shared/db/transaction');

async function runVerification() {
  console.log('🧪 Starting Phase 1 Comprehensive Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Database Connectivity & Core Table Population
  // --------------------------------------------------------------------------
  console.log('--- Test 1: Seeded Core Entities Verification ---');
  const userCount = await pool.query('SELECT COUNT(*) FROM users;');
  assert(parseInt(userCount.rows[0].count, 10) >= 8, 'At least 8 users seeded');

  const memCount = await pool.query('SELECT COUNT(*) FROM memberships;');
  assert(parseInt(memCount.rows[0].count, 10) >= 3, 'At least 3 memberships seeded');

  const eventCount = await pool.query('SELECT COUNT(*) FROM events;');
  assert(parseInt(eventCount.rows[0].count, 10) >= 2, 'Events (Spring Gala, Mini Workshop) seeded');

  const prodCount = await pool.query('SELECT COUNT(*) FROM products;');
  assert(parseInt(prodCount.rows[0].count, 10) >= 2, 'Products (Club Hoodie, Club T-Shirt) seeded');

  const fundraiserCount = await pool.query('SELECT COUNT(*) FROM fundraisers;');
  assert(parseInt(fundraiserCount.rows[0].count, 10) >= 1, 'Bake Sale fundraiser seeded');

  const taskCount = await pool.query('SELECT COUNT(*) FROM tasks;');
  assert(parseInt(taskCount.rows[0].count, 10) >= 3, 'Bake Sale tasks seeded with 3 tasks');

  const annCount = await pool.query('SELECT COUNT(*) FROM announcements;');
  assert(parseInt(annCount.rows[0].count, 10) >= 2, 'Two announcements seeded');

  // --------------------------------------------------------------------------
  // TEST 2: Transaction Helper Rollback & Commit
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Database Transaction Helper (withTransaction) ---');
  // Subtest 2a: Rollback on exception
  let rollbackSuccess = false;
  try {
    await withTransaction(async (client) => {
      await client.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Rollback User', 'rollback@test.com', 'hash', 'guest');"
      );
      throw new Error('Simulated failure during transaction');
    });
  } catch (err) {
    rollbackSuccess = true;
  }
  const checkRollback = await pool.query("SELECT * FROM users WHERE email = 'rollback@test.com';");
  assert(rollbackSuccess && checkRollback.rows.length === 0, 'Transaction safely rolled back uncommitted work on failure');

  // Subtest 2b: Commit on success
  await withTransaction(async (client) => {
    await client.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Commit User', 'commit@test.com', 'hash', 'guest');"
    );
  });
  const checkCommit = await pool.query("SELECT * FROM users WHERE email = 'commit@test.com';");
  assert(checkCommit.rows.length === 1, 'Transaction safely committed successful operations');
  // Clean up
  await pool.query("DELETE FROM users WHERE email = 'commit@test.com';");

  // --------------------------------------------------------------------------
  // TEST 3: Duplicate Email Rejection (Constraint Check)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Duplicate Email Constraint ---');
  let duplicateRejected = false;
  try {
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('Duplicate Admin', 'admin@skyline.org', 'hash', 'admin');"
    );
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      duplicateRejected = true;
    }
  }
  assert(duplicateRejected, 'Duplicate email rejected by database UNIQUE constraint (23505)');

  // --------------------------------------------------------------------------
  // TEST 4: Foreign Key Integrity Check
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Foreign Key Constraint Check ---');
  let fkRejected = false;
  try {
    await pool.query(
      "INSERT INTO announcements (title, body, created_by) VALUES ('Ghost Announcement', 'Body', 999999);"
    );
  } catch (err) {
    if (err.code === '23503') { // foreign_key_violation
      fkRejected = true;
    }
  }
  assert(fkRejected, 'Invalid foreign key rejected by database FK constraint (23503)');

  // --------------------------------------------------------------------------
  // TEST 5: (source_type, source_id) Transaction Uniqueness
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Transaction (source_type, source_id) Uniqueness ---');
  let txUniqueEnforced = false;
  const testTxSourceId = 99991;

  // Insert first transaction
  await pool.query(`
    INSERT INTO transactions (source_type, source_id, amount, direction, payment_mode, status)
    VALUES ('ticket', $1, 300.00, 'in', 'online', 'paid');
  `, [testTxSourceId]);

  try {
    // Attempt second transaction with same (source_type, source_id)
    await pool.query(`
      INSERT INTO transactions (source_type, source_id, amount, direction, payment_mode, status)
      VALUES ('ticket', $1, 300.00, 'in', 'online', 'paid');
    `, [testTxSourceId]);
  } catch (err) {
    if (err.code === '23505') {
      txUniqueEnforced = true;
    }
  }
  // Cleanup test transaction
  await pool.query("DELETE FROM transactions WHERE source_type = 'ticket' AND source_id = $1;", [testTxSourceId]);
  assert(txUniqueEnforced, 'Duplicate (source_type, source_id) in transactions rejected by UNIQUE constraint');

  // --------------------------------------------------------------------------
  // TEST 6: Multiple Fundraiser Income & Transactions for same Fundraiser
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Fundraiser Income & Multi-Transaction Invariant ---');
  const bakeSale = (await pool.query("SELECT id FROM fundraisers WHERE title = 'Bake Sale';")).rows[0];
  const adminUser = (await pool.query("SELECT id FROM users WHERE email = 'admin@skyline.org';")).rows[0];

  // Insert two separate income rows for the same fundraiser
  const income1 = (await pool.query(
    "INSERT INTO fundraiser_income (fundraiser_id, amount, note, recorded_by) VALUES ($1, 150.00, 'Morning sales', $2) RETURNING id;",
    [bakeSale.id, adminUser.id]
  )).rows[0];

  const income2 = (await pool.query(
    "INSERT INTO fundraiser_income (fundraiser_id, amount, note, recorded_by) VALUES ($1, 250.00, 'Afternoon sales', $2) RETURNING id;",
    [bakeSale.id, adminUser.id]
  )).rows[0];

  assert(income1.id !== income2.id, 'Multiple fundraiser_income rows successfully created for one fundraiser');

  // Insert two transactions for each fundraiser income row: source_type = 'fundraiser', source_id = fundraiser_income.id
  let incomeTxSuccess = false;
  try {
    await pool.query(
      "INSERT INTO transactions (source_type, source_id, amount, direction, payment_mode, status) VALUES ('fundraiser', $1, 150.00, 'in', 'cash', 'paid');",
      [income1.id]
    );
    await pool.query(
      "INSERT INTO transactions (source_type, source_id, amount, direction, payment_mode, status) VALUES ('fundraiser', $1, 250.00, 'in', 'cash', 'paid');",
      [income2.id]
    );
    incomeTxSuccess = true;
  } catch (err) {
    incomeTxSuccess = false;
  }
  assert(
    incomeTxSuccess,
    'Multiple fundraiser transactions allowed because source_id uses fundraiser_income.id (NOT fundraiser.id)'
  );

  // Cleanup test fundraiser income & transactions
  await pool.query("DELETE FROM transactions WHERE source_type = 'fundraiser' AND source_id IN ($1, $2);", [income1.id, income2.id]);
  await pool.query("DELETE FROM fundraiser_income WHERE id IN ($1, $2);", [income1.id, income2.id]);

  // --------------------------------------------------------------------------
  // TEST 7: Pending Ticket Seat Preservation Invariant
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Pending Ticket Seat Invariant ---');
  const gala = (await pool.query("SELECT id, seats_remaining FROM events WHERE title = 'Spring Gala';")).rows[0];
  const initialSeats = gala.seats_remaining;

  const ticketCode = 'TEST-TCK-PENDING-' + Date.now();
  await pool.query(
    `INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status)
     VALUES ($1, $2, $3, 300.00, 'member', 'pending');`,
    [ticketCode, gala.id, adminUser.id]
  );

  const postTicketGala = (await pool.query("SELECT seats_remaining FROM events WHERE id = $1;", [gala.id])).rows[0];
  assert(
    postTicketGala.seats_remaining === initialSeats,
    'Pending ticket did NOT decrement seats (seat decrement is atomic upon payment)'
  );
  // Cleanup test ticket
  await pool.query("DELETE FROM tickets WHERE ticket_code = $1;", [ticketCode]);

  // --------------------------------------------------------------------------
  // TEST 8: Pending Order Stock Preservation Invariant
  // --------------------------------------------------------------------------
  console.log('\n--- Test 8: Pending Order Stock Invariant ---');
  const hoodieSize = (await pool.query(`
    SELECT ps.id, ps.stock
    FROM product_sizes ps
    JOIN products p ON ps.product_id = p.id
    WHERE p.name = 'Club Hoodie' AND ps.size = 'L';
  `)).rows[0];
  const initialStock = hoodieSize.stock;

  const orderCode = 'TEST-ORD-PENDING-' + Date.now();
  const orderRes = await pool.query(
    `INSERT INTO orders (order_code, user_id, subtotal, discount, total, payment_status)
     VALUES ($1, $2, 1200.00, 0.00, 1200.00, 'pending')
     RETURNING id;`,
    [orderCode, adminUser.id]
  );
  await pool.query(
    `INSERT INTO order_items (order_id, product_size_id, quantity, unit_price)
     VALUES ($1, $2, 1, 1200.00);`,
    [orderRes.rows[0].id, hoodieSize.id]
  );

  const postOrderHoodieSize = (await pool.query("SELECT stock FROM product_sizes WHERE id = $1;", [hoodieSize.id])).rows[0];
  assert(
    postOrderHoodieSize.stock === initialStock,
    'Pending order did NOT decrement stock (stock decrement is atomic upon payment)'
  );
  // Cleanup test order
  await pool.query("DELETE FROM orders WHERE id = $1;", [orderRes.rows[0].id]);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log(`\n==================================================`);
  console.log(`VERIFICATION SUMMARY: ${passed} passed, ${failed} failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  try {
    await runVerification();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification suite encountered an unexpected error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
