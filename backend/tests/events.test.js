const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const { pool } = require('../config/database');
const { isActiveMember, getMembershipStatus } = require('../shared/membership/isActiveMember');
const createTransaction = require('../shared/transactions/createTransaction');
const signTicketCode = require('../shared/qr/signTicketCode');
const generateQR = require('../shared/qr/generateQR');
const verifyQR = require('../shared/qr/verifyQR');
const ticketService = require('../modules/events/ticket.service');
const checkinService = require('../modules/events/checkin.service');
const eventsService = require('../modules/events/events.service');

async function runTestSuite() {
  console.log('================================================================');
  console.log('PHASE 2: EVENTS, TICKETS & SHARED FOUNDATION TEST SUITE');
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

  // Helper to make HTTP requests against ephemeral local server
  let server;
  let baseUrl;

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
      } catch (e) {}
      return { status: res.status, ok: res.ok, body: data };
    });
  }

  try {
    // Start server on random available port
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Test server running on ${baseUrl}\n`);

    // Fetch users for test tokens
    const usersRes = await pool.query('SELECT id, name, email, role FROM users;');
    const users = {};
    usersRes.rows.forEach((u) => { users[u.email] = u; });

    function makeToken(user) {
      return jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    const adminToken = makeToken(users['admin@odoo-ldce.org']);
    const eventManagerToken = makeToken(users['ethan@odoo-ldce.org']);
    const volunteerToken = makeToken(users['vik@odoo-ldce.org']);
    const mayaMemberToken = makeToken(users['maya@odoo-ldce.org']);
    const eddieExpiredToken = makeToken(users['eddie@odoo-ldce.org']);
    const gregGuestToken = makeToken(users['greg@odoo-ldce.org']);

    // -------------------------------------------------------------------------
    // 1. SHARED MEMBERSHIP FUNCTION
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Shared Membership Function (isActiveMember) ---');
    const mayaActive = await isActiveMember(users['maya@odoo-ldce.org'].id);
    assert(mayaActive === true, 'isActiveMember(Maya) returns true (paid, valid through Dec 31 2026)');

    const eddieActive = await isActiveMember(users['eddie@odoo-ldce.org'].id);
    assert(eddieActive === false, 'isActiveMember(Eddie) returns false (expired Dec 31 2025)');

    const gregActive = await isActiveMember(users['greg@odoo-ldce.org'].id);
    assert(gregActive === false, 'isActiveMember(Greg) returns false (no membership)');

    const eddieStatus = await getMembershipStatus(users['eddie@odoo-ldce.org'].id);
    assert(eddieStatus.status === 'EXPIRED', 'getMembershipStatus(Eddie) correctly identifies EXPIRED state');
    console.log();

    // -------------------------------------------------------------------------
    // 2. SHARED QR FUNCTIONS
    // -------------------------------------------------------------------------
    console.log('--- 2. Testing Shared QR Functions (sign, generate, verify) ---');
    const testCode = 'TCK-TEST-123456';
    const sig = signTicketCode(testCode);
    assert(typeof sig === 'string' && sig.length === 10, 'signTicketCode returns 10-char hex string');

    const qrResult = await generateQR(testCode);
    assert(qrResult.payload === `${testCode}.${sig}`, 'generateQR formats payload as ticket_code.signature');
    assert(qrResult.qrDataUrl.startsWith('data:image/png;base64,'), 'generateQR creates base64 PNG data URL');

    const verifyValid = verifyQR(`${testCode}.${sig}`);
    assert(verifyValid.valid === true && verifyValid.ticketCode === testCode, 'verifyQR accepts valid signature');

    const verifyTampered = verifyQR(`${testCode}.0000000000`);
    assert(verifyTampered.valid === false && verifyTampered.error === 'INVALID_SIGNATURE', 'verifyQR rejects tampered signature');

    const verifyMalformed = verifyQR('INVALID_NO_DOT');
    assert(verifyMalformed.valid === false && verifyMalformed.error === 'MALFORMED_QR_STRUCTURE', 'verifyQR rejects malformed string');
    console.log();

    // -------------------------------------------------------------------------
    // 3. SHARED TRANSACTION FUNCTION (IDEMPOTENCY)
    // -------------------------------------------------------------------------
    console.log('--- 3. Testing Shared createTransaction (Idempotency) ---');
    const dummyId = 999999;
    const tx1 = await createTransaction({
      source_type: 'ticket',
      source_id: dummyId,
      user_id: users['maya@odoo-ldce.org'].id,
      amount: 300.00,
      direction: 'in',
      payment_mode: 'online',
      status: 'paid',
    });
    assert(tx1 && tx1.id, 'createTransaction creates first transaction successfully');

    // Attempt duplicate transaction with exact same (source_type, source_id)
    const tx2 = await createTransaction({
      source_type: 'ticket',
      source_id: dummyId,
      user_id: users['maya@odoo-ldce.org'].id,
      amount: 300.00,
      direction: 'in',
      payment_mode: 'online',
      status: 'paid',
    });
    assert(tx2 && tx2.id === tx1.id, 'createTransaction returns existing transaction on duplicate (idempotent)');

    const countDuplicate = await pool.query(
      'SELECT COUNT(*) FROM transactions WHERE source_type = $1 AND source_id = $2;',
      ['ticket', dummyId]
    );
    assert(parseInt(countDuplicate.rows[0].count, 10) === 1, 'Database contains exactly 1 row for unique transaction source');

    // Clean up dummy test transaction
    await pool.query('DELETE FROM transactions WHERE source_type = $1 AND source_id = $2;', ['ticket', dummyId]);
    console.log();

    // -------------------------------------------------------------------------
    // 4. EVENTS API (CRUD, ROLE ACCESS & STATS)
    // -------------------------------------------------------------------------
    console.log('--- 4. Testing Events API Endpoints ---');

    // 4a. Create Event with event_manager role
    const createRes = await api('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${eventManagerToken}` },
      body: {
        title: 'Robotics Workshop 2026',
        venue: 'Electrical Seminar Hall',
        starts_at: '2026-12-05T10:00:00Z',
        capacity: 40,
        member_price: 150.00,
        non_member_price: 250.00,
      },
    });
    assert(createRes.status === 201 && createRes.body.event.id, 'POST /events by event_manager creates new event');
    const createdEventId = createRes.body.event.id;

    // 4b. Create Event with guest role (should fail with 403)
    const guestCreateRes = await api('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${gregGuestToken}` },
      body: {
        title: 'Unauthorized Event',
        venue: 'Park',
        starts_at: '2026-12-05T10:00:00Z',
        capacity: 10,
        member_price: 100,
        non_member_price: 200,
      },
    });
    assert(guestCreateRes.status === 403, 'POST /events by guest returns 403 Forbidden');

    // 4c. List all events (public)
    const listRes = await api('/events');
    assert(listRes.status === 200 && Array.isArray(listRes.body.events) && listRes.body.events.length >= 3, 'GET /events lists events publicly');

    // 4d. Get single event
    const singleRes = await api(`/events/${createdEventId}`);
    assert(singleRes.status === 200 && singleRes.body.event.title === 'Robotics Workshop 2026', 'GET /events/:id retrieves single event');

    // 4e. Get stats (requires role)
    const statsRes = await api(`/events/${createdEventId}/stats`, {
      headers: { Authorization: `Bearer ${eventManagerToken}` },
    });
    assert(statsRes.status === 200 && statsRes.body.stats.capacity === 40, 'GET /events/:id/stats returns capacity and seat stats');
    console.log();

    // -------------------------------------------------------------------------
    // 5. TICKET CHECKOUT & DYNAMIC MEMBER PRICING
    // -------------------------------------------------------------------------
    console.log('--- 5. Testing Ticket Checkout & Dynamic Member Pricing ---');

    // Fetch Spring Gala (capacity 100, member: 300, non_member: 500)
    const springGala = (await pool.query("SELECT * FROM events WHERE title = 'Spring Gala 2026';")).rows[0];

    // 5a. Active Member Checkout (Maya)
    const mayaCheckout = await api(`/events/${springGala.id}/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaMemberToken}` },
      body: { checkout_session_id: `SES-MAYA-${Date.now()}` },
    });
    assert(mayaCheckout.status === 201, 'POST /events/:id/tickets creates checkout for member');
    assert(parseFloat(mayaCheckout.body.ticket.price) === 300.00, 'Active member receives member price (₹300.00)');
    assert(mayaCheckout.body.ticket.price_type === 'member', 'price_type is member');
    assert(mayaCheckout.body.ticket.payment_status === 'pending', 'Ticket checkout status is pending');

    // Verify seats were NOT consumed by pending checkout
    const galaAfterCheckout = (await pool.query('SELECT seats_remaining FROM events WHERE id = $1;', [springGala.id])).rows[0];
    assert(parseInt(galaAfterCheckout.seats_remaining, 10) === parseInt(springGala.seats_remaining, 10), 'Seats are NOT decremented on pending checkout');

    // 5b. Guest Checkout (Greg)
    const gregCheckout = await api(`/events/${springGala.id}/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${gregGuestToken}` },
      body: { checkout_session_id: `SES-GREG-${Date.now()}` },
    });
    assert(parseFloat(gregCheckout.body.ticket.price) === 500.00, 'Guest receives non-member price (₹500.00)');
    assert(gregCheckout.body.ticket.price_type === 'non_member', 'Guest price_type is non_member');

    // 5c. Expired Member Checkout (Eddie)
    const eddieCheckout = await api(`/events/${springGala.id}/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${eddieExpiredToken}` },
      body: { checkout_session_id: `SES-EDDIE-${Date.now()}` },
    });
    assert(parseFloat(eddieCheckout.body.ticket.price) === 500.00, 'Expired member receives non-member price (₹500.00)');
    console.log();

    // -------------------------------------------------------------------------
    // 6. TICKET PAYMENT (ATOMIC SEAT DECREMENT & LEDGER)
    // -------------------------------------------------------------------------
    console.log('--- 6. Testing Ticket Payment & Atomic Seat Decrement ---');
    const mayaTicketId = mayaCheckout.body.ticket.id;
    const initialSeats = parseInt(galaAfterCheckout.seats_remaining, 10);

    const mayaPayRes = await api(`/tickets/${mayaTicketId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaMemberToken}` },
      body: { payment_mode: 'online' },
    });
    assert(mayaPayRes.status === 200, 'POST /tickets/:id/pay marks ticket as paid');
    assert(mayaPayRes.body.ticket.payment_status === 'paid', 'Ticket status updated to paid');

    // Verify seats_remaining decremented
    const galaAfterPay = (await pool.query('SELECT seats_remaining FROM events WHERE id = $1;', [springGala.id])).rows[0];
    assert(parseInt(galaAfterPay.seats_remaining, 10) === initialSeats - 1, 'seats_remaining decremented by 1 upon payment');

    // Verify financial transaction created
    const txRow = (await pool.query(
      "SELECT * FROM transactions WHERE source_type = 'ticket' AND source_id = $1;",
      [mayaTicketId]
    )).rows[0];
    assert(txRow && parseFloat(txRow.amount) === 300.00 && txRow.direction === 'in', 'Exactly one incoming transaction row created for paid ticket');

    // Attempt duplicate payment on already paid ticket
    const dupPayRes = await api(`/tickets/${mayaTicketId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaMemberToken}` },
      body: { payment_mode: 'online' },
    });
    assert(dupPayRes.status === 400 && dupPayRes.body.error === 'TICKET_ALREADY_PAID', 'Duplicate payment attempt returns 400 TICKET_ALREADY_PAID');

    // Verify get my tickets
    const myTicketsRes = await api('/tickets/mine', {
      headers: { Authorization: `Bearer ${mayaMemberToken}` },
    });
    assert(myTicketsRes.status === 200 && myTicketsRes.body.tickets.some(t => t.id === mayaTicketId), 'GET /tickets/mine returns user purchased tickets');
    console.log();

    // -------------------------------------------------------------------------
    // 7. QR CODE ACCESS FOR TICKETS
    // -------------------------------------------------------------------------
    console.log('--- 7. Testing QR Code Retrieval ---');
    const gregPendingTicketId = gregCheckout.body.ticket.id;

    // Unpaid ticket cannot retrieve QR
    const unpaidQrRes = await api(`/tickets/${gregPendingTicketId}/qr`, {
      headers: { Authorization: `Bearer ${gregGuestToken}` },
    });
    assert(unpaidQrRes.status === 400 && unpaidQrRes.body.error === 'TICKET_NOT_PAID', 'Unpaid ticket cannot get QR (returns 400 TICKET_NOT_PAID)');

    // Paid ticket retrieves signed QR
    const paidQrRes = await api(`/tickets/${mayaTicketId}/qr`, {
      headers: { Authorization: `Bearer ${mayaMemberToken}` },
    });
    assert(paidQrRes.status === 200, 'Paid ticket successfully retrieves signed QR');
    assert(paidQrRes.body.qr && paidQrRes.body.qr.payload, 'QR response contains payload');
    const mayaQrPayload = paidQrRes.body.qr.payload;
    console.log();

    // -------------------------------------------------------------------------
    // 8. DOOR CHECK-IN (VALID, ALREADY_USED, TAMPERED & EXPIRED MEMBER)
    // -------------------------------------------------------------------------
    console.log('--- 8. Testing Door Check-in & Scanning Protocol ---');

    // 8a. Valid check-in by volunteer
    const scan1 = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: { payload: mayaQrPayload },
    });
    assert(scan1.status === 200 && scan1.body.result === 'VALID', 'First scan returns result: VALID');
    assert(scan1.body.member_status === 'ACTIVE', 'Valid scan displays member_status: ACTIVE');

    // 8b. Second scan of same ticket -> ALREADY_USED
    const scan2 = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: { payload: mayaQrPayload },
    });
    assert(scan2.status === 200 && scan2.body.result === 'ALREADY_USED', 'Second scan returns result: ALREADY_USED');
    assert(scan2.body.checked_in_at !== undefined, 'ALREADY_USED returns original checked_in_at timestamp');

    // 8c. Tampered QR signature
    const tamperedPayload = `${mayaCheckout.body.ticket.ticket_code}.BADSIG1234`;
    const scanTampered = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: { payload: tamperedPayload },
    });
    assert(scanTampered.status === 200 && scanTampered.body.result === 'INVALID', 'Tampered QR returns result: INVALID');

    // 8d. Expired Member Ticket Admission (Business Rule 10)
    // Pay for Eddie's ticket, generate QR, scan at door
    const eddieTicketId = eddieCheckout.body.ticket.id;
    await api(`/tickets/${eddieTicketId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${eddieExpiredToken}` },
      body: { payment_mode: 'online' },
    });
    const eddieQrRes = await api(`/tickets/${eddieTicketId}/qr`, {
      headers: { Authorization: `Bearer ${eddieExpiredToken}` },
    });
    const eddieQrPayload = eddieQrRes.body.qr.payload;

    const scanEddie = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: { payload: eddieQrPayload },
    });
    assert(scanEddie.status === 200 && scanEddie.body.result === 'VALID', 'Expired member ticket check-in is admitted (result: VALID)');
    assert(scanEddie.body.member_status === 'EXPIRED', 'Expired member check-in displays member_status: EXPIRED');
    console.log();

    // -------------------------------------------------------------------------
    // 9. CONCURRENT LAST-SEAT RACE CONDITION TEST
    // -------------------------------------------------------------------------
    console.log('--- 9. Testing Concurrent Last-Seat Race Condition ---');
    // Create an event with exactly 1 capacity and 1 seat remaining
    const raceEvent = await eventsService.createEvent({
      title: 'Exclusive VIP Masterclass',
      venue: 'VIP Room',
      starts_at: '2026-12-10T15:00:00Z',
      capacity: 1,
      member_price: 200.00,
      non_member_price: 400.00,
    });
    assert(raceEvent.capacity === 1 && raceEvent.seats_remaining === 1, 'Created race test event with capacity=1, seats_remaining=1');

    // Checkout two pending tickets for different users
    const ticketA = await ticketService.checkoutTicket(raceEvent.id, users['maya@odoo-ldce.org'].id);
    const ticketB = await ticketService.checkoutTicket(raceEvent.id, users['eddie@odoo-ldce.org'].id);

    // Concurrently trigger payment for both tickets
    const results = await Promise.allSettled([
      ticketService.payTicket(ticketA.id, users['maya@odoo-ldce.org'].id),
      ticketService.payTicket(ticketB.id, users['eddie@odoo-ldce.org'].id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert(fulfilled.length === 1, 'Exactly one concurrent payment succeeded for the final seat');
    assert(rejected.length === 1, 'Exactly one concurrent payment was rejected due to no seats available');
    assert(rejected[0].reason.code === 'NO_SEATS_AVAILABLE', 'Rejection reason code was NO_SEATS_AVAILABLE');

    const finalEventState = await eventsService.getEventById(raceEvent.id);
    assert(finalEventState.seats_remaining === 0, 'seats_remaining is exactly 0 (no oversell, never negative)');
    console.log();

    // -------------------------------------------------------------------------
    // 10. REAL-TIME EVENT STATS AUDIT
    // -------------------------------------------------------------------------
    console.log('--- 10. Testing Real-time Event Statistics Audit ---');
    const galaStats = await eventsService.getEventStats(springGala.id);
    assert(galaStats.tickets_sold >= 2, `Accurate tickets_sold count (${galaStats.tickets_sold})`);
    assert(galaStats.tickets_checked_in >= 2, `Accurate tickets_checked_in count (${galaStats.tickets_checked_in})`);
    assert(galaStats.ticket_revenue >= 800.00, `Accurate ticket_revenue sum (₹${galaStats.ticket_revenue})`);
    console.log();

    console.log('================================================================');
    console.log(`PHASE 2 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error in Phase 2 test suite:', err);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
  }
}

runTestSuite();
