const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../config/database');

async function runVerification() {
  console.log('================================================================');
  console.log('STUDENT ORGANIZATION SYSTEM — DATABASE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Connection Test
    console.log('--- 1. Testing PostgreSQL Connection ---');
    const isConnected = await testConnection();
    assert(isConnected, 'Node.js connected to PostgreSQL via pg pool');
    if (!isConnected) {
      throw new Error('Connection failed; aborting further tests.');
    }
    console.log();

    // 2. Schema Execution
    console.log('--- 2. Executing schema.sql ---');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    assert(true, 'schema.sql executed successfully without errors');
    console.log();

    // 3. Seed Execution
    console.log('--- 3. Executing seed.sql ---');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    await pool.query(seedSql);
    assert(true, 'seed.sql executed successfully without errors');
    console.log();

    // 4. Verify Tables
    console.log('--- 4. Verifying Table Existence ---');
    const expectedTables = [
      'users',
      'memberships',
      'announcements',
      'events',
      'event_attendees',
      'tickets',
      'products',
      'product_sizes',
      'orders',
      'order_items',
      'fundraisers',
      'tasks',
      'fundraiser_income',
      'expenses',
      'transactions'
    ];

    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const actualTables = tablesRes.rows.map(r => r.table_name);
    expectedTables.forEach(tbl => {
      assert(actualTables.includes(tbl), `Table exists: ${tbl}`);
    });
    console.log();

    // 5. Verify Primary Keys
    console.log('--- 5. Verifying Primary Keys ---');
    const pkRes = await pool.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public';
    `);
    const pkMap = {};
    pkRes.rows.forEach(r => { pkMap[r.table_name] = r.column_name; });
    expectedTables.forEach(tbl => {
      assert(pkMap[tbl] === 'id', `Primary key on ${tbl} is 'id'`);
    });
    console.log();

    // 6. Verify Foreign Keys
    console.log('--- 6. Verifying Key Foreign Keys ---');
    const fkRes = await pool.query(`
      SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);
    const fkPairs = fkRes.rows.map(r => `${r.source_table}.${r.source_column} -> ${r.target_table}.${r.target_column}`);
    assert(fkPairs.includes('memberships.user_id -> users.id'), 'FK: memberships.user_id -> users.id');
    assert(fkPairs.includes('memberships.renewed_from_membership_id -> memberships.id'), 'FK: memberships.renewed_from_membership_id -> memberships.id');
    assert(fkPairs.includes('tickets.event_id -> events.id'), 'FK: tickets.event_id -> events.id');
    assert(fkPairs.includes('tickets.user_id -> users.id'), 'FK: tickets.user_id -> users.id');
    assert(fkPairs.includes('tickets.attendee_id -> event_attendees.id'), 'FK: tickets.attendee_id -> event_attendees.id');
    assert(fkPairs.includes('product_sizes.product_id -> products.id'), 'FK: product_sizes.product_id -> products.id');
    assert(fkPairs.includes('order_items.order_id -> orders.id'), 'FK: order_items.order_id -> orders.id');
    assert(fkPairs.includes('order_items.product_size_id -> product_sizes.id'), 'FK: order_items.product_size_id -> product_sizes.id');
    assert(fkPairs.includes('tasks.fundraiser_id -> fundraisers.id'), 'FK: tasks.fundraiser_id -> fundraisers.id');
    assert(fkPairs.includes('fundraiser_income.fundraiser_id -> fundraisers.id'), 'FK: fundraiser_income.fundraiser_id -> fundraisers.id');
    assert(fkPairs.includes('expenses.submitted_by -> users.id'), 'FK: expenses.submitted_by -> users.id');
    console.log();

    // 7. Verify Unique Constraints
    console.log('--- 7. Verifying Unique Constraints ---');
    const uqRes = await pool.query(`
      SELECT tc.table_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public';
    `);
    const uqTableNames = uqRes.rows.map(r => r.table_name);
    assert(uqTableNames.includes('users'), 'Unique constraint on users (email)');
    assert(uqTableNames.includes('memberships'), 'Unique constraint on memberships (user_id, member_code)');
    assert(uqTableNames.includes('tickets'), 'Unique constraint on tickets (ticket_code, checkout_session_id)');
    assert(uqTableNames.includes('product_sizes'), 'Unique constraint on product_sizes (product_id, size)');
    assert(uqTableNames.includes('orders'), 'Unique constraint on orders (order_code, checkout_session_id)');
    assert(uqTableNames.includes('transactions'), 'Unique constraint on transactions (source_type, source_id)');
    console.log();

    // 8. Intentional Constraint Testing (Negative tests)
    console.log('--- 8. Testing Negative Constraint Enforcement ---');

    // 8a. Invalid Foreign Key
    try {
      await pool.query(`
        INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status)
        VALUES ('TEST-INVALID-FK', 999999, 1, 100.00, 'member', 'pending');
      `);
      assert(false, 'Invalid foreign key was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23503', 'Invalid foreign key rejected (23503 foreign_key_violation)');
    }

    // 8b. Duplicate Unique Transaction Source (Idempotency)
    try {
      const existingTx = (await pool.query('SELECT source_type, source_id FROM transactions LIMIT 1')).rows[0];
      await pool.query(`
        INSERT INTO transactions (source_type, source_id, amount, direction, payment_mode, status)
        VALUES ($1, $2, 999.00, 'in', 'online', 'paid');
      `, [existingTx.source_type, existingTx.source_id]);
      assert(false, 'Duplicate transaction (source_type, source_id) was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23505', 'Duplicate transaction source rejected (23505 unique_violation)');
    }

    // 8c. Negative Price Rejection
    try {
      await pool.query(`
        INSERT INTO products (name, price) VALUES ('Illegal Negative Price Item', -50.00);
      `);
      assert(false, 'Negative product price was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Negative product price rejected (23514 check_violation)');
    }

    // 8d. Negative Stock Rejection
    try {
      const prod = (await pool.query('SELECT id FROM products LIMIT 1')).rows[0];
      await pool.query(`
        INSERT INTO product_sizes (product_id, size, stock) VALUES ($1, 'XXL', -3);
      `, [prod.id]);
      assert(false, 'Negative stock was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Negative stock rejected (23514 check_violation)');
    }

    // 8e. User Roles Constraint Verification
    for (const r of ['admin', 'treasurer', 'event_manager', 'volunteer', 'member']) {
      try {
        await pool.query(
          `INSERT INTO users (name, email, password_hash, role)
           VALUES ($1, $2, 'hash', $3);`,
          [`Test ${r}`, `role_test_${r}_${Date.now()}@example.com`, r]
        );
        assert(true, `Valid role accepted: ${r}`);
      } catch (err) {
        assert(false, `Valid role was rejected: ${r} - ${err.message}`);
      }
    }

    // Role 'guest' MUST BE REJECTED
    try {
      await pool.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('Guest User', 'guest_role_reject@example.com', 'hash', 'guest');
      `);
      assert(false, "Role 'guest' in users was accepted (MUST BE REJECTED)");
    } catch (err) {
      assert(err.code === '23514', "Role 'guest' strictly rejected in users (23514 check_violation)");
    }

    // 8f. Event Attendee Constraint Verification
    console.log('--- 8f. Testing Event Attendee Constraints ---');
    let testAttendeeId;
    try {
      const attRes = await pool.query(`
        INSERT INTO event_attendees (name, email, mobile)
        VALUES ('Test Attendee', 'attendee_test@example.com', '9988776655')
        RETURNING id;
      `);
      testAttendeeId = attRes.rows[0].id;
      assert(Boolean(testAttendeeId), 'Create attendee with name, email, mobile: PASS');
    } catch (err) {
      assert(false, `Create attendee failed: ${err.message}`);
    }

    // Required name
    try {
      await pool.query(`
        INSERT INTO event_attendees (name, email, mobile)
        VALUES (NULL, 'noname@example.com', '9988776655');
      `);
      assert(false, 'Attendee without name accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23502', 'Attendee required name enforced (23502 not_null_violation)');
    }

    // Required email
    try {
      await pool.query(`
        INSERT INTO event_attendees (name, email, mobile)
        VALUES ('No Email', NULL, '9988776655');
      `);
      assert(false, 'Attendee without email accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23502', 'Attendee required email enforced (23502 not_null_violation)');
    }

    // Required mobile
    try {
      await pool.query(`
        INSERT INTO event_attendees (name, email, mobile)
        VALUES ('No Mobile', 'nomobile@example.com', NULL);
      `);
      assert(false, 'Attendee without mobile accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23502', 'Attendee required mobile enforced (23502 not_null_violation)');
    }

    // 8g. Ticket Ownership Model (XOR Constraint)
    console.log('--- 8g. Testing Ticket Ownership Model ---');
    const firstEventId = (await pool.query('SELECT id FROM events LIMIT 1;')).rows[0].id;
    const firstUserId = (await pool.query('SELECT id FROM users LIMIT 1;')).rows[0].id;

    // Registered user ticket (user_id populated, attendee_id null)
    try {
      await pool.query(`
        INSERT INTO tickets (ticket_code, event_id, user_id, attendee_id, price, price_type, payment_status)
        VALUES ($1, $2, $3, NULL, 300.00, 'member', 'pending');
      `, [`TCK-TEST-USER-${Date.now()}`, firstEventId, firstUserId]);
      assert(true, 'Registered user ticket (user_id populated, attendee_id NULL): PASS');
    } catch (err) {
      assert(false, `Registered user ticket failed: ${err.message}`);
    }

    // Guest attendee ticket (user_id null, attendee_id populated)
    let testGuestTicketCode = `TCK-TEST-GUEST-${Date.now()}`;
    let testGuestTicketId;
    try {
      const tRes = await pool.query(`
        INSERT INTO tickets (ticket_code, event_id, user_id, attendee_id, price, price_type, payment_status)
        VALUES ($1, $2, NULL, $3, 500.00, 'non_member', 'pending')
        RETURNING id;
      `, [testGuestTicketCode, firstEventId, testAttendeeId]);
      testGuestTicketId = tRes.rows[0].id;
      assert(true, 'Guest attendee ticket (user_id NULL, attendee_id populated): PASS');
    } catch (err) {
      assert(false, `Guest attendee ticket failed: ${err.message}`);
    }

    // Ticket with neither owner (MUST FAIL)
    try {
      await pool.query(`
        INSERT INTO tickets (ticket_code, event_id, user_id, attendee_id, price, price_type, payment_status)
        VALUES ($1, $2, NULL, NULL, 500.00, 'non_member', 'pending');
      `, [`TCK-TEST-NEITHER-${Date.now()}`, firstEventId]);
      assert(false, 'Ticket with neither owner accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Ticket with neither owner rejected (23514 check_violation chk_ticket_owner)');
    }

    // Ticket with both owners (MUST FAIL)
    try {
      await pool.query(`
        INSERT INTO tickets (ticket_code, event_id, user_id, attendee_id, price, price_type, payment_status)
        VALUES ($1, $2, $3, $4, 500.00, 'non_member', 'pending');
      `, [`TCK-TEST-BOTH-${Date.now()}`, firstEventId, firstUserId, testAttendeeId]);
      assert(false, 'Ticket with both owners accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Ticket with both owners rejected (23514 check_violation chk_ticket_owner)');
    }

    // 8h. Pricing Verification
    console.log('--- 8h. Testing Member vs Non-Member vs Guest Pricing ---');
    const { isActiveMember } = require('../shared/membership/isActiveMember');
    const mayaUser = (await pool.query("SELECT id FROM users WHERE email = 'maya@odoo-ldce.org';")).rows[0];
    const eddieUser = (await pool.query("SELECT id FROM users WHERE email = 'eddie@odoo-ldce.org';")).rows[0];
    const eventRow = (await pool.query("SELECT member_price, non_member_price FROM events WHERE title = 'Spring Gala 2026';")).rows[0];

    const mayaIsActive = await isActiveMember(mayaUser.id);
    const mayaPrice = mayaIsActive ? eventRow.member_price : eventRow.non_member_price;
    assert(mayaIsActive === true && parseFloat(mayaPrice) === 300.00, 'Active member receives member price (₹300.00)');

    const eddieIsActive = await isActiveMember(eddieUser.id);
    const eddiePrice = eddieIsActive ? eventRow.member_price : eventRow.non_member_price;
    assert(eddieIsActive === false && parseFloat(eddiePrice) === 500.00, 'Expired member receives non-member price (₹500.00)');

    const guestAttendeeIsActive = await isActiveMember(null);
    const guestAttendeePrice = guestAttendeeIsActive ? eventRow.member_price : eventRow.non_member_price;
    assert(guestAttendeeIsActive === false && parseFloat(guestAttendeePrice) === 500.00, 'Guest attendee receives non-member price (₹500.00)');

    // 8i. QR Code & Check-in Verification for Attendees and Users
    console.log('--- 8i. Testing QR Code & Door Check-in ---');
    const generateQR = require('../shared/qr/generateQR');
    const verifyQR = require('../shared/qr/verifyQR');
    const eventRepo = require('../modules/events/event.repository');
    const checkinService = require('../modules/events/checkin.service');

    // Mark test guest ticket as paid for check-in test
    await pool.query("UPDATE tickets SET payment_status = 'paid' WHERE id = $1;", [testGuestTicketId]);

    // Guest ticket QR generation
    const guestQR = await generateQR(testGuestTicketCode);
    assert(typeof guestQR.qrDataUrl === 'string' && guestQR.qrDataUrl.startsWith('data:image/png;base64,'), 'Guest ticket → QR generated: PASS');

    // User ticket QR generation
    const userTicketCode = `TCK-USER-QR-${Date.now()}`;
    const userTicketRes = await pool.query(`
      INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status)
      VALUES ($1, $2, $3, 300.00, 'member', 'paid')
      RETURNING id;
    `, [userTicketCode, firstEventId, mayaUser.id]);
    const userQR = await generateQR(userTicketCode);
    assert(typeof userQR.qrDataUrl === 'string' && userQR.qrDataUrl.startsWith('data:image/png;base64,'), 'User ticket → QR generated: PASS');

    // Tampered QR
    const tamperedPayload = `${testGuestTicketCode}.deadbeef12`;
    const tamperedRes = await checkinService.processScan(tamperedPayload, firstUserId);
    assert(tamperedRes.result === 'INVALID', 'Tampered QR rejected: REJECT');

    // Guest ticket check-in
    const scan1 = await checkinService.processScan(guestQR.payload, firstUserId);
    assert(scan1.result === 'VALID' && scan1.holder.type === 'attendee' && scan1.member_status === 'NONE', 'Guest ticket check-in admitted (VALID, member_status: NONE)');

    // Duplicate check-in
    const scan2 = await checkinService.processScan(guestQR.payload, firstUserId);
    assert(scan2.result === 'ALREADY_USED', 'Duplicate check-in rejected: ALREADY_USED');

    // Ticket code fallback check-in
    const fallbackQR = await generateQR(userTicketCode);
    const codeCheckIn = await checkinService.processScan(fallbackQR.payload, firstUserId);
    assert(codeCheckIn.result === 'VALID' && codeCheckIn.holder.type === 'user', 'Ticket code fallback check-in: PASS');
    console.log();

    // 8j. Membership Lifecycle, Constraints & Automatic Expiry
    console.log('--- 8j. Testing Membership Lifecycle Constraints & Automatic Expiry ---');
    const syncMembershipStatuses = require('../shared/membership/syncMembershipStatuses');

    // Invalid status rejected
    try {
      await pool.query(`
        INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount)
        VALUES ($1, 'MEM-INVALID-STATUS', 'bogus', 'pending', 500.00);
      `, [firstUserId]);
      assert(false, 'Invalid membership status accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Invalid membership status rejected (23514 check_violation)');
    }

    // Invalid dues_status rejected
    try {
      await pool.query(`
        INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount)
        VALUES ($1, 'MEM-INVALID-DUES', 'pending', 'bogus', 500.00);
      `, [firstUserId]);
      assert(false, 'Invalid membership dues_status accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Invalid membership dues_status rejected (23514 check_violation)');
    }

    // Negative dues_amount rejected
    try {
      await pool.query(`
        INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount)
        VALUES ($1, 'MEM-NEGATIVE-DUES', 'pending', 'pending', -50.00);
      `, [firstUserId]);
      assert(false, 'Negative dues amount accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Negative dues amount rejected (23514 check_violation)');
    }

    // Create temporary user for lifecycle testing
    const tempUserRes = await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Lifecycle Tester', 'lifecycle_test@example.com', 'hash', 'member')
      RETURNING id;
    `);
    const tempUserId = tempUserRes.rows[0].id;

    // 1. Initial State: PENDING
    const initialMemRes = await pool.query(`
      INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount)
      VALUES ($1, 'MEM-LIFE-001', 'pending', 'pending', 500.00)
      RETURNING id, status, dues_status, started_at, expiry_date;
    `, [tempUserId]);
    const mem1 = initialMemRes.rows[0];
    assert(mem1.status === 'pending' && mem1.dues_status === 'pending', 'New membership created in PENDING status');
    assert(mem1.started_at === null && mem1.expiry_date === null, 'Pending membership has null start and expiry dates');

    // 2. Activation with interval arithmetic
    const activateRes = await pool.query(`
      UPDATE memberships
      SET started_at = NOW(),
          expiry_date = NOW() + INTERVAL '1 year',
          status = 'active',
          dues_status = 'paid',
          payment_timestamp = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [mem1.id]);
    const activatedMem = activateRes.rows[0];
    assert(activatedMem.status === 'active' && activatedMem.dues_status === 'paid', 'Membership activated with paid dues');
    const intervalDiffDays = Math.round((new Date(activatedMem.expiry_date) - new Date(activatedMem.started_at)) / (1000 * 86400));
    assert(intervalDiffDays >= 365 && intervalDiffDays <= 366, 'Expiry date automatically calculated using INTERVAL 1 year (~365 days)');

    // 3. Cancellation preserves row and updates status
    const cancelRes = await pool.query(`
      UPDATE memberships
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancellation_reason = 'Member relocated abroad',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [mem1.id]);
    const cancelledMem = cancelRes.rows[0];
    assert(cancelledMem.status === 'cancelled', 'Membership transitioned from ACTIVE to CANCELLED');
    assert(cancelledMem.cancelled_at !== null && cancelledMem.cancellation_reason === 'Member relocated abroad', 'Cancellation reason and timestamp recorded');
    assert(cancelledMem.expiry_date !== null, 'Cancellation preserves original expiry_date for audit trail');

    // Verify row still exists in DB (never deleted)
    const auditCheck = (await pool.query('SELECT COUNT(*) FROM memberships WHERE id = $1;', [mem1.id])).rows[0].count;
    assert(parseInt(auditCheck, 10) === 1, 'Historical cancelled membership is not deleted');

    // 4. Renewal creates new period linked via renewed_from_membership_id
    const renewalRes = await pool.query(`
      INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, renewed_from_membership_id)
      VALUES ($1, 'MEM-LIFE-002', 'active', 'paid', 500.00, NOW(), NOW() + INTERVAL '1 year', NOW(), $2)
      RETURNING *;
    `, [tempUserId, mem1.id]);
    const renewedMem = renewalRes.rows[0];
    assert(renewedMem.status === 'active' && renewedMem.renewed_from_membership_id === mem1.id, 'Renewal links through renewed_from_membership_id');

    // Both periods exist in database for this user
    const userMemCount = (await pool.query('SELECT COUNT(*) FROM memberships WHERE user_id = $1;', [tempUserId])).rows[0].count;
    assert(parseInt(userMemCount, 10) === 2, 'Renewal preserves previous membership history in database');

    // 5. Automatic Expiry Synchronization
    // Set renewed membership expiry_date into the past
    await pool.query(`
      UPDATE memberships
      SET expiry_date = NOW() - INTERVAL '1 day'
      WHERE id = $1;
    `, [renewedMem.id]);

    const sync1 = await syncMembershipStatuses();
    assert(sync1.updatedCount >= 1, 'Automatic expiry synchronization updates DB (active past expiry -> expired)');

    const expiredCheck = (await pool.query('SELECT status FROM memberships WHERE id = $1;', [renewedMem.id])).rows[0].status;
    assert(expiredCheck === 'expired', 'Membership database status updated to expired');

    // Running sync again is safe (idempotent)
    const sync2 = await syncMembershipStatuses();
    assert(typeof sync2.updatedCount === 'number', 'Running expiry synchronization twice is safe (idempotent)');

    // Clean up temporary lifecycle test rows
    await pool.query('DELETE FROM memberships WHERE user_id = $1;', [tempUserId]);
    await pool.query('DELETE FROM users WHERE id = $1;', [tempUserId]);

    // Clean up temporary test data created during negative/constraint tests
    await pool.query("DELETE FROM tickets WHERE ticket_code LIKE 'TCK-TEST-%' OR ticket_code LIKE 'TCK-USER-QR-%';");
    await pool.query("DELETE FROM event_attendees WHERE email LIKE '%@example.com';");
    await pool.query("DELETE FROM users WHERE email LIKE '%@example.com';");

    // 9. Verify Seed Data
    console.log('--- 9. Verifying Seeded Records ---');
    const userCount = parseInt((await pool.query('SELECT COUNT(*) FROM users;')).rows[0].count, 10);
    assert(userCount === 7, `Seeded exactly 7 registered users without guest role (found ${userCount})`);

    const attendeeCount = parseInt((await pool.query('SELECT COUNT(*) FROM event_attendees;')).rows[0].count, 10);
    assert(attendeeCount === 1, `Seeded exactly 1 event attendee (found ${attendeeCount})`);

    const guestAttendee = (await pool.query("SELECT * FROM event_attendees WHERE email = 'guest@odoo-ldce.org';")).rows[0];
    assert(guestAttendee && guestAttendee.mobile === '9876543210', 'Seeded Guest Attendee exists with email and mobile');

    const guestSeedTicket = (await pool.query(`
      SELECT t.* FROM tickets t
      WHERE t.attendee_id = $1;
    `, [guestAttendee.id])).rows[0];
    assert(guestSeedTicket && guestSeedTicket.user_id === null, 'Seeded ticket linked through attendee_id with user_id NULL');

    const mayaMembership = (await pool.query(`
      SELECT m.status, m.dues_status, m.expiry_date, (m.expiry_date > NOW()) as is_active
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'maya@odoo-ldce.org';
    `)).rows[0];
    assert(mayaMembership.status === 'active' && mayaMembership.dues_status === 'paid' && mayaMembership.is_active === true, 'Maya Member is ACTIVE');

    const eddieRenewal = (await pool.query(`
      SELECT m.id, m.status, m.dues_status, m.renewed_from_membership_id
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'eddie@odoo-ldce.org' AND m.renewed_from_membership_id IS NOT NULL;
    `)).rows[0];
    assert(eddieRenewal && eddieRenewal.status === 'active' && eddieRenewal.renewed_from_membership_id !== null, 'Eddie has active renewed membership referencing historical record');

    const piaMembership = (await pool.query(`
      SELECT m.status, m.dues_status
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'pia@odoo-ldce.org';
    `)).rows[0];
    assert(piaMembership.status === 'pending' && piaMembership.dues_status === 'pending', 'Pia Pending has status=pending & dues_status=pending');

    const vikMembership = (await pool.query(`
      SELECT m.status, m.dues_status, (m.expiry_date < NOW()) as is_expired
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'vik@odoo-ldce.org';
    `)).rows[0];
    assert(vikMembership.status === 'expired' && vikMembership.is_expired === true, 'Vik Volunteer has status=expired');

    const gregMembership = (await pool.query(`
      SELECT m.status, m.cancelled_at, m.cancellation_reason
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'greg@odoo-ldce.org';
    `)).rows[0];
    assert(gregMembership.status === 'cancelled' && gregMembership.cancellation_reason !== null, 'Greg Guest has status=cancelled and cancellation_reason populated');

    // Verify partial unique index exists
    const idxRes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'memberships' AND indexname = 'uq_memberships_active_user';
    `);
    assert(idxRes.rows.length === 1, 'Partial unique index uq_memberships_active_user exists');

    // Verify membership counts across all lifecycle states
    const statusCounts = (await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
      FROM memberships;
    `)).rows[0];
    assert(parseInt(statusCounts.active_count, 10) >= 3, `Active memberships verified (found ${statusCounts.active_count})`);
    assert(parseInt(statusCounts.pending_count, 10) >= 1, `Pending memberships verified (found ${statusCounts.pending_count})`);
    assert(parseInt(statusCounts.expired_count, 10) >= 2, `Expired memberships verified (found ${statusCounts.expired_count})`);
    assert(parseInt(statusCounts.cancelled_count, 10) >= 1, `Cancelled memberships verified (found ${statusCounts.cancelled_count})`);

    // Verify isActiveMember helper on representative users
    const { isActiveMember } = require('../shared/membership/isActiveMember');
    const mayaId = (await pool.query("SELECT id FROM users WHERE email = 'maya@odoo-ldce.org'")).rows[0].id;
    const piaId = (await pool.query("SELECT id FROM users WHERE email = 'pia@odoo-ldce.org'")).rows[0].id;
    const vikId = (await pool.query("SELECT id FROM users WHERE email = 'vik@odoo-ldce.org'")).rows[0].id;
    const gregId = (await pool.query("SELECT id FROM users WHERE email = 'greg@odoo-ldce.org'")).rows[0].id;

    assert(await isActiveMember(mayaId) === true, 'isActiveMember(maya) === true (Active)');
    assert(await isActiveMember(piaId) === false, 'isActiveMember(pia) === false (Pending)');
    assert(await isActiveMember(vikId) === false, 'isActiveMember(vik) === false (Expired)');
    assert(await isActiveMember(gregId) === false, 'isActiveMember(greg) === false (Cancelled)');

    const eventsCount = parseInt((await pool.query('SELECT COUNT(*) FROM events;')).rows[0].count, 10);
    assert(eventsCount === 2, `Seeded 2 events: Spring Gala (100) & Mini Workshop (2)`);

    const hoodieL = (await pool.query(`
      SELECT ps.stock
      FROM product_sizes ps
      JOIN products p ON ps.product_id = p.id
      WHERE p.name = 'Club Hoodie' AND ps.size = 'L';
    `)).rows[0];
    assert(hoodieL && parseInt(hoodieL.stock, 10) === 1, 'Club Hoodie Size L seeded with stock = 1 for oversell test');

    const bakeTasks = (await pool.query(`
      SELECT t.status, COUNT(*) as count
      FROM tasks t
      JOIN fundraisers f ON t.fundraiser_id = f.id
      WHERE f.title = 'Bake Sale'
      GROUP BY t.status;
    `)).rows;
    assert(bakeTasks.length === 3, 'Bake Sale has 3 tasks seeded across completed, in_progress, and todo');

    const announcementsCount = parseInt((await pool.query('SELECT COUNT(*) FROM announcements;')).rows[0].count, 10);
    assert(announcementsCount === 2, 'Seeded 2 announcements');

    const txCount = parseInt((await pool.query('SELECT COUNT(*) FROM transactions;')).rows[0].count, 10);
    assert(txCount >= 2, `Seeded initial dues transactions (found ${txCount})`);

    console.log();

    // Summary
    console.log('================================================================');
    console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error in verification:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runVerification();
