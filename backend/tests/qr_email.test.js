const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const { pool } = require('../config/database');
const signTicketCode = require('../shared/qr/signTicketCode');
const generateQR = require('../shared/qr/generateQR');
const verifyQR = require('../shared/qr/verifyQR');
const {
  getEmailProvider,
  setEmailProvider,
  resetEmailProvider,
  defaultDevProvider,
  MockFailingEmailProvider,
} = require('../shared/email/email.provider');
const { renderTicketEmail } = require('../shared/email/email.templates');
const { sendTicketEmail } = require('../shared/email/email.service');
const checkinService = require('../modules/events/checkin.service');
const eventRepository = require('../modules/events/event.repository');

async function runQREmailTests() {
  // Ensure development email provider is active for test assertions
  setEmailProvider(defaultDevProvider);

  console.log('================================================================');
  console.log('TEST SUITE: QR GENERATION, CRYPTOGRAPHIC VERIFICATION & EMAIL SERVICE');
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

  let server;
  let baseUrl;

  function api(endpoint, options = {}) {
    return fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

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
    const mayaToken = makeToken(users['maya@odoo-ldce.org']);
    const vikToken = makeToken(users['vik@odoo-ldce.org']);

    const eventsRes = await pool.query("SELECT * FROM events WHERE title = 'Spring Gala 2026' LIMIT 1;");
    const galaEvent = eventsRes.rows[0];

    // =========================================================================
    // SECTION 1: QR CRYPTOGRAPHIC & STRUCTURAL VERIFICATION TESTS
    // =========================================================================
    console.log('--- 1. Testing QR Cryptographic & Structural Integrity ---');

    const sampleCode = `TCK-TEST-QR-${Date.now()}`;
    const signature = signTicketCode(sampleCode);
    assert(typeof signature === 'string' && signature.length === 10, 'signTicketCode returns 10-character hex HMAC signature');

    // Valid QR generation
    const qrResult = await generateQR(sampleCode);
    assert(qrResult.payload === `${sampleCode}.${signature}`, 'generateQR formats payload as ticket_code.signature');
    assert(qrResult.qrDataUrl.startsWith('data:image/png;base64,'), 'generateQR creates base64 PNG data URL');

    // Verification: valid payload
    const validVerify = verifyQR(qrResult.payload);
    assert(validVerify.valid === true && validVerify.ticketCode === sampleCode, 'verifyQR accepts valid signed payload');

    // Verification: malformed payloads (no dot, multiple dots, non-string, empty)
    const malformed1 = verifyQR('just_a_code_without_signature');
    assert(malformed1.valid === false && malformed1.error === 'MALFORMED_QR_STRUCTURE', 'verifyQR rejects missing dot separator');

    const malformed2 = verifyQR('part1.part2.part3');
    assert(malformed2.valid === false && malformed2.error === 'MALFORMED_QR_STRUCTURE', 'verifyQR rejects multiple dot separators');

    const malformed3 = verifyQR('');
    assert(malformed3.valid === false && malformed3.error === 'INVALID_PAYLOAD_FORMAT', 'verifyQR rejects empty payload');

    const malformed4 = verifyQR(null);
    assert(malformed4.valid === false && malformed4.error === 'INVALID_PAYLOAD_FORMAT', 'verifyQR rejects null payload');

    // Verification: wrong signature length
    const wrongLen = verifyQR(`${sampleCode}.12345`);
    assert(wrongLen.valid === false && wrongLen.error === 'INVALID_SIGNATURE_LENGTH', 'verifyQR rejects signature with invalid length');

    // Verification: tampered payload (altered ticket code)
    const tamperedPayload = `TCK-TAMPERED-CODE.${signature}`;
    const tamperedVerify = verifyQR(tamperedPayload);
    assert(tamperedVerify.valid === false && tamperedVerify.error === 'INVALID_SIGNATURE', 'verifyQR rejects tampered ticket code with original signature');

    // Verification: wrong signature (tampered signature)
    const wrongSigVerify = verifyQR(`${sampleCode}.deadbeef00`);
    assert(wrongSigVerify.valid === false && wrongSigVerify.error === 'INVALID_SIGNATURE', 'verifyQR rejects wrong signature via constant-time comparison');

    // Verification: signature generated with different secret
    const foreignSignature = signTicketCode(sampleCode, 'different_secret_key_123');
    const foreignSigVerify = verifyQR(`${sampleCode}.${foreignSignature}`);
    assert(foreignSigVerify.valid === false && foreignSigVerify.error === 'INVALID_SIGNATURE', 'verifyQR rejects signature generated with different secret');

    // =========================================================================
    // SECTION 2: CHECK-IN SERVICE TESTS (QR, UNPAID, USED & FALLBACK CODE)
    // =========================================================================
    console.log('\n--- 2. Testing Check-in Service & Manual Fallback Code ---');

    // Create an unpaid ticket in DB
    const unpaidCode = `TCK-UNPAID-${Date.now()}`;
    const unpaidTicketRes = await pool.query(`
      INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status)
      VALUES ($1, $2, $3, 300.00, 'member', 'pending')
      RETURNING *;
    `, [unpaidCode, galaEvent.id, users['maya@odoo-ldce.org'].id]);
    const unpaidTicket = unpaidTicketRes.rows[0];

    const unpaidQR = await generateQR(unpaidCode);
    const unpaidCheckin = await checkinService.processScan(unpaidQR.payload, users['admin@odoo-ldce.org'].id);
    assert(unpaidCheckin.result === 'INVALID' && unpaidCheckin.error === 'TICKET_NOT_PAID', 'Check-in strictly rejects unpaid ticket');

    // Mark ticket paid
    await pool.query("UPDATE tickets SET payment_status = 'paid' WHERE id = $1;", [unpaidTicket.id]);

    // Check-in via signed QR payload
    const firstCheckin = await checkinService.processScan(unpaidQR.payload, users['admin@odoo-ldce.org'].id);
    assert(firstCheckin.result === 'VALID' && firstCheckin.ticket_code === unpaidCode, 'Successful check-in with valid signed QR payload');
    assert(firstCheckin.scan_mode === 'qr_scan', 'Check-in identifies scan mode as qr_scan');

    // Duplicate check-in attempt via QR
    const dupCheckin = await checkinService.processScan(unpaidQR.payload, users['admin@odoo-ldce.org'].id);
    assert(dupCheckin.result === 'ALREADY_USED', 'Duplicate check-in rejected with ALREADY_USED');
    assert(dupCheckin.checked_in_at !== null, 'Duplicate check-in response includes original checked_in_at timestamp');

    // Manual fallback ticket code test (for damaged phone / scanner failure)
    const fallbackCode = `TCK-FALLBACK-${Date.now()}`;
    await pool.query(`
      INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status)
      VALUES ($1, $2, $3, 300.00, 'member', 'paid')
      RETURNING *;
    `, [fallbackCode, galaEvent.id, users['maya@odoo-ldce.org'].id]);

    // Staff types in raw fallback code without signature
    const fallbackCheckin = await checkinService.processScan(fallbackCode, users['admin@odoo-ldce.org'].id);
    assert(fallbackCheckin.result === 'VALID' && fallbackCheckin.ticket_code === fallbackCode, 'Successful check-in via raw manual fallback ticket code');
    assert(fallbackCheckin.scan_mode === 'manual_code', 'Check-in identifies scan mode as manual_code');

    // Duplicate check-in via fallback code
    const dupFallback = await checkinService.processScan(fallbackCode, users['admin@odoo-ldce.org'].id);
    assert(dupFallback.result === 'ALREADY_USED', 'Duplicate check-in via fallback code rejected with ALREADY_USED');

    // Event mismatch check: ticket belonging to Event A presented at Event B
    const mismatchCode = `TCK-MISMATCH-${Date.now()}`;
    await pool.query(`
      INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status)
      VALUES ($1, $2, $3, 300.00, 'member', 'paid')
      RETURNING *;
    `, [mismatchCode, galaEvent.id, users['maya@odoo-ldce.org'].id]);
    const mismatchQR = await generateQR(mismatchCode);
    const mismatchRes = await checkinService.processScan(mismatchQR.payload, users['admin@odoo-ldce.org'].id, 99999);
    assert(mismatchRes.result === 'INVALID' && mismatchRes.error === 'EVENT_MISMATCH', 'Check-in rejects ticket belonging to different event');

    // =========================================================================
    // SECTION 3: EMAIL SERVICE & TEMPLATES UNIT TESTS
    // =========================================================================
    console.log('\n--- 3. Testing Email Service & Templates ---');

    const devProvider = defaultDevProvider;
    devProvider.clearMailbox();

    // Template rendering verification
    const rendered = renderTicketEmail({
      attendeeName: 'Alex Student',
      eventName: 'Grand Gala 2026',
      eventDate: '2026-11-15T18:00:00Z',
      venue: 'University Hall',
      ticketCode: 'TCK-ALEX-101',
      price: 300.00,
      priceType: 'member',
      qrDataUrl: 'data:image/png;base64,sampleQRData',
    });

    assert(rendered.subject.includes('Grand Gala 2026') && rendered.subject.includes('TCK-ALEX-101'), 'Email subject contains event name and ticket code');
    assert(rendered.html.includes('Alex Student'), 'Email HTML contains attendee name');
    assert(rendered.html.includes('Grand Gala 2026'), 'Email HTML contains event name');
    assert(rendered.html.includes('University Hall'), 'Email HTML contains venue');
    assert(rendered.html.includes('data:image/png;base64,sampleQRData'), 'Email HTML contains embedded QR image');
    assert(rendered.html.includes('TCK-ALEX-101'), 'Email HTML contains prominent fallback ticket code');
    assert(rendered.html.includes('Door Check-in Instructions'), 'Email HTML contains check-in instructions');
    assert(rendered.text.includes('MANUAL FALLBACK CODE: TCK-ALEX-101'), 'Email text contains fallback code section');

    // Direct email service dispatch
    const emailResult = await sendTicketEmail({
      recipientEmail: 'alex@example.com',
      recipientName: 'Alex Student',
      event: { title: 'Grand Gala 2026', venue: 'University Hall', starts_at: '2026-11-15T18:00:00Z' },
      ticket: { ticket_code: 'TCK-ALEX-101', price: 300.00, price_type: 'member' },
      qrDataUrl: 'data:image/png;base64,sampleQRData',
    });

    assert(emailResult.success === true, 'sendTicketEmail succeeds in development mode');
    assert(emailResult.recipient === 'alex@example.com', 'sendTicketEmail dispatches to correct recipient');
    assert(devProvider.getSentEmails().length === 1, 'Development provider recorded 1 sent email in memory');

    const lastEmail = devProvider.getLastEmail();
    assert(lastEmail.to === 'alex@example.com', 'Recorded email recipient matches input');
    assert(lastEmail.html.includes('TCK-ALEX-101'), 'Recorded email content includes fallback ticket code');

    // Missing recipient handling
    const missingRecipientRes = await sendTicketEmail({
      recipientEmail: null,
      recipientName: 'No Email',
    });
    assert(missingRecipientRes.success === false && missingRecipientRes.error === 'MISSING_RECIPIENT', 'sendTicketEmail handles missing recipient safely');

    // Email provider failure resiliency test
    setEmailProvider(new MockFailingEmailProvider());
    const failingResult = await sendTicketEmail({
      recipientEmail: 'test_fail@example.com',
      recipientName: 'Fail Test',
      event: { title: 'Test Event' },
      ticket: { ticket_code: 'TCK-FAIL' },
    });
    assert(failingResult.success === false && failingResult.error === 'DELIVERY_FAILED', 'Provider failure is safely caught without throwing');
    setEmailProvider(defaultDevProvider);

    // =========================================================================
    // SECTION 4: END-TO-END FLOW: GUEST ATTENDEE (Register -> Pay -> QR -> Email -> Scan)
    // =========================================================================
    
    console.log('\n--- 4. Testing End-to-End Guest Attendee Flow ---');
    devProvider.clearMailbox();

    const guestEmail = `guest_e2e_${Date.now()}@example.com`;

    // 1. Guest checkout
    const guestCheckoutRes = await api(`/events/${galaEvent.id}/tickets`, {
      method: 'POST',
      body: {
        name: 'Grace Guest',
        email: guestEmail,
        mobile: '9123456789',
      },
    });
    assert(guestCheckoutRes.status === 201, 'Guest registers for ticket checkout (201 Created)');
    const guestTicket = guestCheckoutRes.body.ticket;
    assert(guestTicket.price_type === 'non_member' && parseFloat(guestTicket.price) === 500.00, 'Guest receives non-member price (₹500.00)');
    assert(guestTicket.payment_status === 'pending', 'Guest ticket is initially pending');

    // 2. Guest payment
    const guestPayRes = await api(`/tickets/${guestTicket.id}/pay`, {
      method: 'POST',
      body: { payment_mode: 'online' },
    });
    assert(guestPayRes.status === 200, 'Guest ticket payment succeeds (200 OK)');
    assert(guestPayRes.body.ticket.payment_status === 'paid', 'Ticket status becomes paid');
    assert(typeof guestPayRes.body.ticket.qr_payload === 'string', 'Paid ticket response includes signed QR payload');
    assert(verifyQR(guestPayRes.body.ticket.qr_payload).valid === true, 'Generated QR payload cryptographically verified via verifyQR()');
    assert(guestPayRes.body.ticket.qr_data_url.startsWith('data:image/png;base64,'), 'Paid ticket response includes QR image data URL');
    assert(guestPayRes.body.ticket.email_delivery.success === true, 'Ticket email successfully delivered to guest');

    // 3. Verify email delivery details in development mailbox
    const guestSentEmail = devProvider.getSentEmails().find((e) => e.to === guestEmail);
    assert(guestSentEmail !== undefined, 'Guest confirmation email present in mailbox');
    assert(guestSentEmail.to === guestEmail, 'Email recipient matches ticket attendee email');
    assert(guestSentEmail.html.includes(galaEvent.title), 'Email contains event name');
    assert(guestSentEmail.html.includes(guestTicket.ticket_code), 'Email contains ticket code');
    assert(guestSentEmail.html.includes('data:image/png;base64,'), 'Email contains embedded QR image/data URL');
    assert(guestSentEmail.html.includes(guestTicket.ticket_code), 'Email contains manual fallback ticket code');
    assert(guestSentEmail.html.includes('Show this QR code at the entrance.'), 'Email contains entrance instruction: "Show this QR code at the entrance."');
    assert(!guestSentEmail.text.includes('test delivery') && guestSentEmail.text.includes('OFFICIAL ADMISSION TICKET'), 'Email sent is the official ticket email, NOT the generic test email');
    assert(guestSentEmail.html.includes('Grace Guest'), 'Guest email contains guest name');

    // 4. Door check-in via QR payload
    const guestScanRes = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { payload: guestPayRes.body.ticket.qr_payload },
    });
    assert(guestScanRes.status === 200 && guestScanRes.body.result === 'VALID', 'Guest ticket check-in admitted (result: VALID)');
    assert(guestScanRes.body.holder.type === 'attendee', 'Check-in identifies ticket holder as attendee');
    assert(guestScanRes.body.member_status === 'NONE', 'Guest check-in displays member_status: NONE');

    // 5. Tampered QR rejected
    const tamperedGuestPayload = guestPayRes.body.ticket.qr_payload.slice(0, -2) + '99';
    const tamperedScanRes = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { payload: tamperedGuestPayload },
    });
    assert(tamperedScanRes.body.result === 'INVALID', 'Tampered QR code rejected with result: INVALID');


    // 6. Second scan rejected
    const guestSecondScan = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { payload: guestPayRes.body.ticket.qr_payload },
    });
    assert(guestSecondScan.status === 200 && guestSecondScan.body.result === 'ALREADY_USED', 'Second scan of guest ticket rejected with ALREADY_USED');


    // =========================================================================
    // SECTION 5: END-TO-END FLOW: ACTIVE MEMBER (Checkout -> Pay -> QR -> Email -> Check-in)
    // =========================================================================
    console.log('\n--- 5. Testing End-to-End Active Member Flow ---');

    // 1. Active member checkout
    const memberCheckoutRes = await api(`/events/${galaEvent.id}/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(memberCheckoutRes.status === 201, 'Active member checkouts ticket (201 Created)');
    const memberTicket = memberCheckoutRes.body.ticket;
    assert(memberTicket.price_type === 'member' && parseFloat(memberTicket.price) === 300.00, 'Active member receives discounted member price (₹300.00)');

    // 2. Active member payment
    const memberPayRes = await api(`/tickets/${memberTicket.id}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: { payment_mode: 'upi' },
    });
    assert(memberPayRes.status === 200, 'Member ticket payment succeeds');
    assert(memberPayRes.body.ticket.payment_status === 'paid', 'Member ticket marked as paid');
    assert(memberPayRes.body.ticket.qr_payload.includes(memberTicket.ticket_code), 'Member receives signed QR code');
    assert(memberPayRes.body.ticket.email_delivery.success === true, 'Member ticket confirmation email dispatched');

    // 3. Door check-in
    const memberScanRes = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { payload: memberPayRes.body.ticket.qr_payload },
    });
    assert(memberScanRes.status === 200 && memberScanRes.body.result === 'VALID', 'Member check-in admitted (VALID)');
    assert(memberScanRes.body.holder.type === 'user', 'Check-in identifies ticket holder as registered user');
    assert(memberScanRes.body.member_status === 'ACTIVE', 'Member check-in displays member_status: ACTIVE');

    // =========================================================================
    // SECTION 6: END-TO-END FLOW: EXPIRED MEMBER (Checkout -> Non-Member Price -> Pay -> QR -> Email)
    // =========================================================================
    console.log('\n--- 6. Testing End-to-End Expired Member Flow ---');

    // 1. Expired member checkout
    const expiredCheckoutRes = await api(`/events/${galaEvent.id}/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vikToken}` },
    });
    assert(expiredCheckoutRes.status === 201, 'Expired member checkouts ticket');
    const expiredTicket = expiredCheckoutRes.body.ticket;
    assert(expiredTicket.price_type === 'non_member' && parseFloat(expiredTicket.price) === 500.00, 'Expired member receives regular non-member price (₹500.00)');

    // 2. Expired member payment
    const expiredPayRes = await api(`/tickets/${expiredTicket.id}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vikToken}` },
      body: { payment_mode: 'card' },
    });
    assert(expiredPayRes.status === 200, 'Expired member ticket payment succeeds');
    assert(expiredPayRes.body.ticket.payment_status === 'paid', 'Expired member ticket status updated to paid');
    assert(expiredPayRes.body.ticket.email_delivery.success === true, 'Expired member ticket email sent');

    // 3. Expired member door check-in (admitted as paid attendee, flagged EXPIRED)
    const expiredScanRes = await api('/checkin/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { payload: expiredPayRes.body.ticket.qr_payload },
    });
    assert(expiredScanRes.status === 200 && expiredScanRes.body.result === 'VALID', 'Expired member paid ticket check-in is admitted');
    assert(expiredScanRes.body.member_status === 'EXPIRED', 'Expired member badge shows member_status: EXPIRED');

    // =========================================================================
    // SECTION 7: RESILIENCY: PAYMENT SUCCEEDS EVEN IF EMAIL PROVIDER FAILS
    // =========================================================================
    console.log('\n--- 7. Testing Resiliency: Email Outage Does Not Break Ticket Payment ---');

    // Simulate email provider outage
    setEmailProvider(new MockFailingEmailProvider());

    const outageTicketRes = await api(`/events/${galaEvent.id}/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    const outageTicket = outageTicketRes.body.ticket;

    const outagePayRes = await api(`/tickets/${outageTicket.id}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: { payment_mode: 'online' },
    });

    assert(outagePayRes.status === 200, 'Payment succeeds despite email provider outage');
    assert(outagePayRes.body.ticket.payment_status === 'paid', 'Database ticket remains PAID');
    assert(outagePayRes.body.ticket.email_delivery.success === false, 'Email delivery failure is flagged gracefully');
    assert(outagePayRes.body.ticket.qr_payload !== null, 'Signed QR is still generated and accessible');

    // Verify transaction exists in database ledger
    const ledgerRow = (await pool.query(
      "SELECT * FROM transactions WHERE source_type = 'ticket' AND source_id = $1;",
      [outageTicket.id]
    )).rows[0];
    assert(ledgerRow && ledgerRow.status === 'paid', 'Financial ledger transaction safely recorded');

    // Restore default email provider
    setEmailProvider(defaultDevProvider);

    // Clean up test tickets and attendees created during run
    const testAttendees = await pool.query("SELECT id FROM event_attendees WHERE email LIKE 'guest_e2e_%';");
    if (testAttendees.rows.length > 0) {
      const attIds = testAttendees.rows.map((r) => r.id);
      await pool.query("DELETE FROM transactions WHERE source_type = 'ticket' AND source_id IN (SELECT id FROM tickets WHERE attendee_id = ANY($1));", [attIds]);
      await pool.query("DELETE FROM tickets WHERE attendee_id = ANY($1);", [attIds]);
      await pool.query("DELETE FROM event_attendees WHERE id = ANY($1);", [attIds]);
    }

    await pool.query("DELETE FROM transactions WHERE source_type = 'ticket' AND source_id IN (SELECT id FROM tickets WHERE ticket_code LIKE 'TCK-TEST-QR-%' OR ticket_code LIKE 'TCK-UNPAID-%' OR ticket_code LIKE 'TCK-FALLBACK-%' OR ticket_code LIKE 'TCK-MISMATCH-%');");
    await pool.query("DELETE FROM tickets WHERE ticket_code LIKE 'TCK-TEST-QR-%' OR ticket_code LIKE 'TCK-UNPAID-%' OR ticket_code LIKE 'TCK-FALLBACK-%' OR ticket_code LIKE 'TCK-MISMATCH-%';");

    console.log('\n================================================================');
    console.log(`QR & EMAIL MODULE TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal error in QR & Email test suite:', err);
    process.exit(1);
  } finally {
    if (server) await new Promise((res) => server.close(res));
    await pool.end();
  }
}

if (require.main === module) {
  runQREmailTests();
}

module.exports = runQREmailTests;
