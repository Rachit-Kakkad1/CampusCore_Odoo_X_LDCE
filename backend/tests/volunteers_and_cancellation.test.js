// backend/tests/volunteers_and_cancellation.test.js
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const { pool } = require('../config/database');
const { generateFallbackCode } = require('../shared/qr/generateFallbackCode');
const eventRepository = require('../modules/events/event.repository');
const eventsService = require('../modules/events/events.service');
const checkinService = require('../modules/events/checkin.service');
const membershipService = require('../modules/membership/membership.service');
const membershipRepository = require('../modules/membership/membership.repository');

async function runTestSuite() {
  console.log('================================================================');
  console.log('NEW FEATURES TEST SUITE: FALLBACK CODES, VOLUNTEERS & CANCELLATION');
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

  // Set up local server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  function api(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(async (res) => {
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }
      return { status: res.status, body: data };
    });
  }

  try {
    // -------------------------------------------------------------------------
    // SETUP: Fetch seeded users and generate tokens
    // -------------------------------------------------------------------------
    const usersRes = await pool.query('SELECT * FROM users ORDER BY id ASC;');
    const users = {};
    for (const u of usersRes.rows) {
      users[u.email] = u;
    }

    function createToken(user) {
      return jwt.sign(
        { id: user.id, userId: user.id, email: user.email, role: user.role, name: user.name },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    const adminToken = createToken(users['admin@odoo-ldce.org']);
    const volunteerToken = createToken(users['vik@odoo-ldce.org']);
    const memberToken = createToken(users['maya@odoo-ldce.org']);
    const eventManagerToken = createToken(users['ethan@odoo-ldce.org']);

    // =========================================================================
    // SECTION 1: SHORT FALLBACK TICKET CODES (PHASE 1 & 22)
    // =========================================================================
    console.log('--- 1. Testing Short Fallback Ticket Code ---');

    // 1a. Code characteristics
    const testCode = generateFallbackCode(5);
    assert(testCode.length >= 4 && testCode.length <= 6, `Generated fallback code length is ${testCode.length} (4-6 chars)`);
    const ambiguousChars = ['0', 'O', '1', 'I'];
    const hasAmbiguous = ambiguousChars.some((c) => testCode.includes(c));
    assert(!hasAmbiguous, 'Fallback code avoids ambiguous characters (0, O, 1, I)');

    // 1b. Create ticket with unique fallback code in DB
    const galaEventRes = await pool.query("SELECT * FROM events WHERE title = 'Spring Gala 2026' LIMIT 1;");
    const galaEvent = galaEventRes.rows[0];

    const fallbackTktCode = `TKT-FBK-TEST-${Date.now()}`;
    const customFbk = '7K9X2';
    await pool.query("DELETE FROM transactions WHERE source_type = 'ticket' AND source_id IN (SELECT id FROM tickets WHERE fallback_code = $1);", [customFbk]);
    await pool.query("DELETE FROM tickets WHERE fallback_code = $1;", [customFbk]);

    const createdTicket = await eventRepository.createTicket({
      event_id: galaEvent.id,
      user_id: users['maya@odoo-ldce.org'].id,
      price: 300.00,
      price_type: 'member',
      ticket_code: fallbackTktCode,
      fallback_code: customFbk,
      payment_status: 'paid',
    });

    assert(createdTicket.fallback_code === customFbk, 'Ticket created with dedicated fallback_code');

    // 1c. DB uniqueness constraint prevents duplicate fallback_code
    let duplicateRejected = false;
    try {
      await pool.query(`
        INSERT INTO tickets (ticket_code, fallback_code, event_id, user_id, price, price_type, payment_status)
        VALUES ('TKT-FBK-DUP', $1, $2, $3, 300, 'member', 'paid');
      `, [customFbk, galaEvent.id, users['maya@odoo-ldce.org'].id]);
    } catch (err) {
      if (err.code === '23505') duplicateRejected = true;
    }
    assert(duplicateRejected, 'Database enforces UNIQUE constraint on fallback_code');

    // 1d. Case-insensitive lookup via getTicketByCode
    const lowercaseLookup = await eventRepository.getTicketByCode(customFbk.toLowerCase());
    assert(lowercaseLookup !== null && lowercaseLookup.id === createdTicket.id, 'Lookup by lowercase fallback code matches ticket');

    const uppercaseLookup = await eventRepository.getTicketByCode(customFbk.toUpperCase());
    assert(uppercaseLookup !== null && uppercaseLookup.id === createdTicket.id, 'Lookup by uppercase fallback code matches ticket');

    // 1e. Check-in via lowercase manual fallback code
    const checkinRes = await checkinService.processScan(customFbk.toLowerCase(), users['admin@odoo-ldce.org'].id, galaEvent.id);
    assert(checkinRes.result === 'VALID', 'Check-in station accepts lowercase manual fallback code (result: VALID)');
    assert(checkinRes.fallback_code === customFbk, 'Check-in result returns fallback_code');
    assert(checkinRes.scan_mode === 'manual_code', 'Scan mode recorded as manual_code');

    // 1f. Duplicate check-in with fallback code rejected
    const dupCheckin = await checkinService.processScan(customFbk, users['admin@odoo-ldce.org'].id, galaEvent.id);
    assert(dupCheckin.result === 'ALREADY_USED', 'Duplicate check-in via fallback code rejected with ALREADY_USED');

    // 1g. Invalid fallback code rejected
    const invalidCheckin = await checkinService.processScan('NONEXIST99', users['admin@odoo-ldce.org'].id);
    assert(invalidCheckin.result === 'INVALID' && invalidCheckin.error === 'TICKET_NOT_FOUND', 'Non-existent fallback code rejected');

    // =========================================================================
    // SECTION 2: ADMIN MANUAL MEMBERSHIP CANCELLATION (PHASE 3 & 22)
    // =========================================================================
    console.log('\n--- 2. Testing Admin Manual Membership Cancellation ---');

    // Create an active test membership for user 'pia@odoo-ldce.org'
    const piaUser = users['pia@odoo-ldce.org'];
    // Clean up any existing active/pending for Pia to start fresh
    await pool.query("UPDATE memberships SET status = 'cancelled' WHERE user_id = $1;", [piaUser.id]);

    const piaMemberCode = `SKY-MEM-PIA-${Date.now()}`;
    const piaMemRes = await pool.query(`
      INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, created_at, updated_at)
      VALUES ($1, $2, 'active', 'paid', 500.00, NOW(), NOW() + INTERVAL '1 year', NOW(), NOW())
      RETURNING *;
    `, [piaUser.id, piaMemberCode]);
    const piaMembership = piaMemRes.rows[0];

    // Non-admin attempt should be rejected with 403
    const nonAdminCancel = await api(`/membership/${piaMembership.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: { reason: 'Unauthorized cancellation attempt' },
    });
    assert(nonAdminCancel.status === 403, 'Non-admin user cannot cancel membership (403 Forbidden)');

    // Admin cancellation
    const adminCancel = await api(`/membership/${piaMembership.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Student graduated early' },
    });
    assert(adminCancel.status === 200, 'Admin can cancel membership (200 OK)');
    assert(adminCancel.body.status === 'CANCELLED', 'Response status is CANCELLED');

    // Verify DB state: user account remains, membership is cancelled with audit fields
    const updatedMem = await membershipRepository.findById(piaMembership.id);
    assert(updatedMem.status === 'cancelled', 'Membership status updated to cancelled in database');
    assert(updatedMem.cancelled_by === users['admin@odoo-ldce.org'].id, 'Audit field cancelled_by recorded correctly');
    assert(updatedMem.cancelled_at !== null, 'Audit field cancelled_at timestamp recorded');
    assert(updatedMem.cancellation_reason === 'Student graduated early', 'Cancellation reason saved');

    const userStillExists = await pool.query('SELECT * FROM users WHERE id = $1;', [piaUser.id]);
    assert(userStillExists.rows.length === 1, 'User account was NOT deleted and remains fully intact');

    // Idempotency: Cancelling already cancelled membership returns 200 without corruption
    const idempotentCancel = await api(`/membership/${piaMembership.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Duplicate call' },
    });
    assert(idempotentCancel.status === 200, 'Cancellation is idempotent: cancelling already cancelled membership returns 200');

    // =========================================================================
    // SECTION 3: EVENT VOLUNTEER REQUIREMENTS & CONCURRENCY (PHASES 4-10, 22)
    // =========================================================================
    console.log('\n--- 3. Testing Event Volunteers (Application, Concurrency, Management) ---');

    // 3a. Create event requiring 2 volunteers
    const createEventRes = await api('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${eventManagerToken}` },
      body: {
        title: `Tech Hackathon 2026-${Date.now()}`,
        venue: 'Engineering Quad',
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 172800000).toISOString(),
        capacity: 100,
        member_price: 250,
        non_member_price: 400,
        volunteers_enabled: true,
        volunteers_required: 2,
      },
    });

    assert(createEventRes.status === 201, 'POST /events creates event with volunteer requirements (201 Created)');
    const volEvent = createEventRes.body.event || createEventRes.body.data;
    assert(volEvent.volunteers_enabled === true, 'volunteers_enabled is persisted as true');
    assert(volEvent.volunteers_required === 2, 'volunteers_required is persisted as 2');

    // 3b. Non-volunteer role cannot apply
    const nonVolApply = await api(`/events/${volEvent.id}/volunteers/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` }, // maya is 'member'
    });
    assert(nonVolApply.status === 403, 'Non-volunteer role is rejected from applying (403 Forbidden)');

    // 3c. Volunteer applies successfully
    const volApply1 = await api(`/events/${volEvent.id}/volunteers/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` }, // vik is 'volunteer'
    });
    assert(volApply1.status === 201, 'Volunteer applies successfully (201 Created)');
    assert(volApply1.body.data.volunteers_applied === 1, 'volunteers_applied updated to 1');
    assert(volApply1.body.data.volunteers_remaining === 1, 'volunteers_remaining updated to 1');

    // 3d. Duplicate application rejected
    const volApplyDup = await api(`/events/${volEvent.id}/volunteers/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
    });
    assert(volApplyDup.status === 409, 'Duplicate volunteer application rejected with 409 Conflict');

    // 3e. Admin (who also has authority) fills the second slot
    const volApply2 = await api(`/events/${volEvent.id}/volunteers/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(volApply2.status === 201, 'Second volunteer occupies final slot (201 Created)');
    assert(volApply2.body.data.volunteers_applied === 2, 'Active applications count is 2');
    assert(volApply2.body.data.volunteers_remaining === 0, 'Remaining slots is 0');

    // 3f. Create a second volunteer user to test capacity limit rejection
    const v2UserRes = await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Volunteer Two', 'vol2@odoo-ldce.org', 'hash', 'volunteer')
      ON CONFLICT (email) DO UPDATE SET role = 'volunteer'
      RETURNING *;
    `);
    const v2Token = createToken(v2UserRes.rows[0]);

    // 3g. Third application rejected because capacity is full
    const volApplyFull = await api(`/events/${volEvent.id}/volunteers/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${v2Token}` },
    });
    assert(volApplyFull.status === 409, 'Application rejected when volunteer capacity is full (409 Conflict)');
    assert(volApplyFull.body.error === 'VOLUNTEER_CAPACITY_REACHED', 'Error code is VOLUNTEER_CAPACITY_REACHED');

    // 3h. Admin views volunteer roster
    const rosterRes = await api(`/events/${volEvent.id}/volunteers`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(rosterRes.status === 200, 'Admin can view event volunteer applications (200 OK)');
    assert(rosterRes.body.count === 2, 'Roster contains exactly 2 active applications');

    const vikApp = rosterRes.body.volunteers.find((v) => v.user_id === users['vik@odoo-ldce.org'].id);
    assert(vikApp !== undefined, 'Vik application found in roster');

    // 3i. Admin approves volunteer
    const approveRes = await api(`/events/${volEvent.id}/volunteers/${vikApp.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'approved' },
    });
    assert(approveRes.status === 200 && approveRes.body?.data?.status === 'approved', 'Admin can approve volunteer (status = approved)');
    assert(approveRes.body?.data?.approved_by === users['admin@odoo-ldce.org'].id, 'Audit field approved_by recorded');

    // 3j. Admin removes volunteer from event (Phase 10)
    const removeRes = await api(`/events/${volEvent.id}/volunteers/${vikApp.id}/remove`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(removeRes.status === 200, 'Admin can remove volunteer from event (200 OK)');
    assert(removeRes.body.data.status === 'removed', 'Application marked as removed');
    assert(removeRes.body.data.removed_by === users['admin@odoo-ldce.org'].id, 'Audit field removed_by recorded');

    // 3k. Removed volunteer frees slot: active count drops from 2 to 1, remaining increases to 1
    const eventStats = await eventRepository.getEventById(volEvent.id);
    assert(eventStats.volunteers_applied === 1, 'Active volunteers count dropped to 1 after removal');
    assert(eventStats.volunteers_remaining === 1, 'Remaining slots increased to 1');

    // 3l. Second volunteer (vol2) can now apply to occupy the freed slot!
    const v2ApplyNow = await api(`/events/${volEvent.id}/volunteers/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${v2Token}` },
    });
    assert(v2ApplyNow.status === 201, 'Eligible volunteer successfully applies to occupying freed slot');

    // =========================================================================
    // SECTION 4: DYNAMIC EVENT FILTERS (PHASES 12–14, 22)
    // =========================================================================
    console.log('\n--- 4. Testing Dynamic Event Timing Filters ---');

    // Create 3 timed events
    const now = Date.now();
    const evtUpcoming = await eventRepository.createEvent({
      title: 'Upcoming Test Event',
      venue: 'Auditorium 1',
      starts_at: new Date(now + 3600000 * 24).toISOString(), // +1 day
      ends_at: new Date(now + 3600000 * 28).toISOString(),
      capacity: 50,
      member_price: 100,
      non_member_price: 200,
    });

    const evtLive = await eventRepository.createEvent({
      title: 'Live Now Test Event',
      venue: 'Auditorium 2',
      starts_at: new Date(now - 3600000).toISOString(), // -1 hr
      ends_at: new Date(now + 3600000 * 2).toISOString(), // +2 hrs
      capacity: 50,
      member_price: 100,
      non_member_price: 200,
    });

    const evtPast = await eventRepository.createEvent({
      title: 'Past Test Event',
      venue: 'Auditorium 3',
      starts_at: new Date(now - 3600000 * 10).toISOString(), // -10 hrs
      ends_at: new Date(now - 3600000 * 8).toISOString(), // -8 hrs
      capacity: 50,
      member_price: 100,
      non_member_price: 200,
    });

    const allEvents = await eventRepository.getAllEvents();
    const fetchedUpcoming = allEvents.find((e) => e.id === evtUpcoming.id);
    const fetchedLive = allEvents.find((e) => e.id === evtLive.id);
    const fetchedPast = allEvents.find((e) => e.id === evtPast.id);

    assert(fetchedUpcoming && fetchedUpcoming.computed_status === 'upcoming', 'Future event correctly computed as "upcoming"');
    assert(fetchedLive && fetchedLive.computed_status === 'live', 'Ongoing event correctly computed as "live"');
    assert(fetchedPast && fetchedPast.computed_status === 'past', 'Concluded event correctly computed as "past"');

    console.log('\n================================================================');
    console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

runTestSuite();
