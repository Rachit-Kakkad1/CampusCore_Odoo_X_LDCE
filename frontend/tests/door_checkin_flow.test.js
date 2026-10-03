import { test, describe } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000/api';

describe('Door Check-In Station & Fallback Code Verification Flow', () => {
  let eventManagerToken = null;
  let volunteerToken = null;
  let memberToken = null;
  let createdTicket = null;

  test('Staff authentication (Event Manager & Volunteer)', async () => {
    // 1. Event Manager login
    const emRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ethan@odoo-ldce.org', password: 'password123' }),
    });
    const emData = await emRes.json();
    assert.strictEqual(emRes.status, 200);
    assert.ok(emData.token);
    assert.strictEqual(emData.user.role, 'event_manager');
    eventManagerToken = emData.token;

    // 2. Volunteer login
    const volRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vik@odoo-ldce.org', password: 'password123' }),
    });
    const volData = await volRes.json();
    assert.strictEqual(volRes.status, 200);
    assert.ok(volData.token);
    assert.strictEqual(volData.user.role, 'volunteer');
    volunteerToken = volData.token;

    // 3. Member login (to purchase a ticket)
    const memRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'maya@odoo-ldce.org', password: 'password123' }),
    });
    const memData = await memRes.json();
    assert.strictEqual(memRes.status, 200);
    memberToken = memData.token;
  });

  test('Create and pay a new ticket to test check-in flow', async () => {
    // Reserve ticket under Event #1 (Spring Gala)
    const checkoutRes = await fetch(`${BASE_URL}/events/1/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({
        checkout_session_id: `cs_test_${Date.now()}`,
      }),
    });
    assert.strictEqual(checkoutRes.status, 201);
    const checkoutData = await checkoutRes.json();
    const pendingTicket = checkoutData.ticket || checkoutData.data || checkoutData;
    assert.ok(pendingTicket.id);
    assert.ok(pendingTicket.ticket_code);

    // Pay ticket
    const payRes = await fetch(`${BASE_URL}/tickets/${pendingTicket.id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${memberToken}`,
      },
      body: JSON.stringify({ payment_mode: 'online' }),
    });
    assert.strictEqual(payRes.status, 200);
    const payData = await payRes.json();
    createdTicket = payData.ticket || payData.data || payData;
    assert.strictEqual(createdTicket.payment_status, 'paid');
    assert.ok(createdTicket.ticket_code);
    assert.ok(createdTicket.qr_payload);
    assert.ok(createdTicket.qr_data_url);
  });

  test('GET /tickets/:id/qr returns signed QR payload and data URL for member ticket', async () => {
    const qrRes = await fetch(`${BASE_URL}/tickets/${createdTicket.id}/qr`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });
    assert.strictEqual(qrRes.status, 200);
    const qrData = await qrRes.json();
    assert.ok(qrData.qr);
    assert.ok(qrData.qr.qrDataUrl.startsWith('data:image/png;base64,'));
    assert.strictEqual(qrData.ticket.id, createdTicket.id);
  });

  test('Door Station check-in via raw manual fallback ticket code (TCK-...)', async () => {
    const rawFallbackCode = createdTicket.ticket_code;
    assert.ok(!rawFallbackCode.includes('.'), 'Fallback code does not contain dot separator');

    // Event Manager scans raw fallback code
    const scanRes = await fetch(`${BASE_URL}/checkin/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${eventManagerToken}`,
      },
      body: JSON.stringify({
        payload: rawFallbackCode,
        event_id: 1,
      }),
    });

    assert.strictEqual(scanRes.status, 200);
    const scanData = await scanRes.json();
    assert.strictEqual(scanData.result, 'VALID');
    assert.strictEqual(scanData.scan_mode, 'manual_code');
    assert.strictEqual(scanData.ticket_code, rawFallbackCode);
    assert.strictEqual(scanData.holder.name, 'Maya Member');
    assert.strictEqual(scanData.member_status, 'ACTIVE');
  });

  test('Door Station rejects duplicate check-in with ALREADY_USED', async () => {
    const rawFallbackCode = createdTicket.ticket_code;

    // Volunteer attempts second scan of already-used ticket
    const dupRes = await fetch(`${BASE_URL}/checkin/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        payload: rawFallbackCode,
      }),
    });

    assert.strictEqual(dupRes.status, 200);
    const dupData = await dupRes.json();
    assert.strictEqual(dupData.result, 'ALREADY_USED');
    assert.ok(dupData.checked_in_at);
    assert.strictEqual(dupData.holder.name, 'Maya Member');
  });

  test('Door Station rejects non-existent ticket code with INVALID', async () => {
    const fakeCode = 'TCK-999999999-FAKEHEX';

    const fakeRes = await fetch(`${BASE_URL}/checkin/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`,
      },
      body: JSON.stringify({
        payload: fakeCode,
      }),
    });

    assert.strictEqual(fakeRes.status, 200);
    const fakeData = await fakeRes.json();
    assert.strictEqual(fakeData.result, 'INVALID');
    assert.strictEqual(fakeData.error, 'TICKET_NOT_FOUND');
  });
});
