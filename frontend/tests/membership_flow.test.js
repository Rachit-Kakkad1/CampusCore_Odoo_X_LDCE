// frontend/tests/membership_flow.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackPlans } from '../src/services/membership/membershipApi.js';

const BACKEND_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

test('Membership Plan Selection & Data Integrity', async (t) => {
  await t.test('fallbackPlans contains exactly 3 valid plans with correct keys and prices', () => {
    assert.equal(fallbackPlans.length, 3, 'Should have 3 plans');

    const p1 = fallbackPlans.find((p) => p.id === '1_month');
    const p6 = fallbackPlans.find((p) => p.id === '6_months');
    const p12 = fallbackPlans.find((p) => p.id === '12_months');

    assert.ok(p1, '1 Month plan must exist');
    assert.equal(p1.price, 99.00, '1 Month plan price must be 99.00');
    assert.equal(p1.duration_months, 1, '1 Month duration must be 1');
    assert.equal(p1.duration_label, '1 month');

    assert.ok(p6, '6 Months plan must exist');
    assert.equal(p6.price, 499.00, '6 Months plan price must be 499.00');
    assert.equal(p6.duration_months, 6, '6 Months duration must be 6');
    assert.equal(p6.duration_label, '6 months');

    assert.ok(p12, '12 Months plan must exist');
    assert.equal(p12.price, 899.00, '12 Months plan price must be 899.00');
    assert.equal(p12.duration_months, 12, '12 Months duration must be 12');
    assert.equal(p12.duration_label, '12 months');
  });

  await t.test('Frontend plan matching logic resolves query params correctly', () => {
    function resolvePlanFromParam(param, plans) {
      return (
        plans.find((p) => p.id === param) ||
        plans.find((p) => p.id === '12_months') ||
        plans[0]
      );
    }

    assert.equal(resolvePlanFromParam('1_month', fallbackPlans).id, '1_month');
    assert.equal(resolvePlanFromParam('6_months', fallbackPlans).id, '6_months');
    assert.equal(resolvePlanFromParam('12_months', fallbackPlans).id, '12_months');
    // Invalid plan gracefully defaults to 12_months
    assert.equal(resolvePlanFromParam('invalid_plan_100', fallbackPlans).id, '12_months');
    // Empty param defaults to 12_months
    assert.equal(resolvePlanFromParam('', fallbackPlans).id, '12_months');
  });
});

test('Checkout Price Display Calculations', async (t) => {
  function computeSummary(plan) {
    return {
      name: plan.name,
      duration: plan.duration_label,
      subtotal: plan.price,
      total: plan.price,
      ctaText: `Pay ₹${plan.price}`,
    };
  }

  await t.test('Flow 1 Price Display: 1 Month -> ₹99', () => {
    const plan = fallbackPlans.find((p) => p.id === '1_month');
    const summary = computeSummary(plan);
    assert.equal(summary.subtotal, 99.00);
    assert.equal(summary.total, 99.00);
    assert.equal(summary.ctaText, 'Pay ₹99');
    assert.equal(summary.duration, '1 month');
  });

  await t.test('Flow 2 Price Display: 6 Months -> ₹499', () => {
    const plan = fallbackPlans.find((p) => p.id === '6_months');
    const summary = computeSummary(plan);
    assert.equal(summary.subtotal, 499.00);
    assert.equal(summary.total, 499.00);
    assert.equal(summary.ctaText, 'Pay ₹499');
    assert.equal(summary.duration, '6 months');
  });

  await t.test('Flow 3 Price Display: 12 Months -> ₹899', () => {
    const plan = fallbackPlans.find((p) => p.id === '12_months');
    const summary = computeSummary(plan);
    assert.equal(summary.subtotal, 899.00);
    assert.equal(summary.total, 899.00);
    assert.equal(summary.ctaText, 'Pay ₹899');
    assert.equal(summary.duration, '12 months');
  });
});

test('Backend Integration: Backend Authority & Invalid Plan Handling', async (t) => {
  await t.test('GET /api/membership/plans returns backend authoritative plans', async () => {
    const res = await fetch(`${BACKEND_URL}/membership/plans`);
    assert.equal(res.status, 200, 'Should return 200');
    const body = await res.json();
    assert.ok(body.success, 'Response success should be true');
    assert.equal(body.plans.length, 3, 'Should return 3 backend plans');

    const p1 = body.plans.find((p) => p.id === '1_month');
    const p6 = body.plans.find((p) => p.id === '6_months');
    const p12 = body.plans.find((p) => p.id === '12_months');

    assert.equal(p1.price, 99);
    assert.equal(p6.price, 499);
    assert.equal(p12.price, 899);
  });

  await t.test('POST /api/membership/checkout with invalid plan is rejected with 400', async () => {
    const res = await fetch(`${BACKEND_URL}/membership/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'super_fake_plan',
        name: 'Invalid Test',
        email: 'invalid_plan_test@example.com',
      }),
    });
    assert.equal(res.status, 400, 'Invalid plan should return 400 Bad Request');
    const body = await res.json();
    assert.ok(
      body.code === 'INVALID_MEMBERSHIP_PLAN' || body.error === 'INVALID_MEMBERSHIP_PLAN',
      'Should return INVALID_MEMBERSHIP_PLAN error code'
    );
  });
});

test('End-to-End Membership Activation Flows (1m, 6m, 12m) & Expiry Dates', async (t) => {
  const ts = Date.now();

  // Test Flow 1: 1 Month Plan (@ ₹99)
  await t.test('Flow 1: 1 Month Plan -> ₹99 -> ACTIVE -> ~1 month expiry', async () => {
    const email = `test_flow1_${ts}@example.com`;
    const res = await fetch(`${BACKEND_URL}/membership/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: '1_month',
        payment_mode: 'card',
        name: 'Flow One User',
        email,
      }),
    });
    assert.equal(res.status, 200, 'Checkout should succeed');
    const body = await res.json();
    assert.ok(body.success);
    assert.equal(body.membership.status, 'active');
    assert.equal(body.membership.dues_status, 'paid');
    assert.equal(body.membership.dues_amount, 99.00);

    const started = new Date(body.membership.started_at);
    const expiry = new Date(body.membership.expiry_date);
    const diffDays = Math.round((expiry - started) / (1000 * 60 * 60 * 24));
    assert.ok(diffDays >= 28 && diffDays <= 32, `1 month interval should be ~30 days (got ${diffDays})`);
  });

  // Test Flow 2: 6 Months Plan (@ ₹499)
  await t.test('Flow 2: 6 Months Plan -> ₹499 -> ACTIVE -> ~6 months expiry', async () => {
    const email = `test_flow2_${ts}@example.com`;
    const res = await fetch(`${BACKEND_URL}/membership/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: '6_months',
        payment_mode: 'upi',
        name: 'Flow Two User',
        email,
      }),
    });
    assert.equal(res.status, 200, 'Checkout should succeed');
    const body = await res.json();
    assert.ok(body.success);
    assert.equal(body.membership.status, 'active');
    assert.equal(body.membership.dues_status, 'paid');
    assert.equal(body.membership.dues_amount, 499.00);

    const started = new Date(body.membership.started_at);
    const expiry = new Date(body.membership.expiry_date);
    const diffDays = Math.round((expiry - started) / (1000 * 60 * 60 * 24));
    assert.ok(diffDays >= 180 && diffDays <= 185, `6 months interval should be ~182 days (got ${diffDays})`);
  });

  // Test Flow 3: 12 Months Plan (@ ₹899)
  await t.test('Flow 3: 12 Months Plan -> ₹899 -> ACTIVE -> ~12 months expiry', async () => {
    const email = `test_flow3_${ts}@example.com`;
    const res = await fetch(`${BACKEND_URL}/membership/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: '12_months',
        payment_mode: 'netbanking',
        name: 'Flow Three User',
        email,
      }),
    });
    assert.equal(res.status, 200, 'Checkout should succeed');
    const body = await res.json();
    assert.ok(body.success);
    assert.equal(body.membership.status, 'active');
    assert.equal(body.membership.dues_status, 'paid');
    assert.equal(body.membership.dues_amount, 899.00);

    const started = new Date(body.membership.started_at);
    const expiry = new Date(body.membership.expiry_date);
    const diffDays = Math.round((expiry - started) / (1000 * 60 * 60 * 24));
    assert.ok(diffDays >= 365 && diffDays <= 366, `12 months interval should be ~365 days (got ${diffDays})`);
  });

  await t.test('Duplicate active checkout prevents double billing (409 Conflict)', async () => {
    const email = `test_flow3_${ts}@example.com`;
    const res = await fetch(`${BACKEND_URL}/membership/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: '12_months',
        name: 'Flow Three User',
        email,
      }),
    });
    assert.equal(res.status, 409, 'Duplicate checkout for active member should return 409 Conflict');
    const body = await res.json();
    assert.ok(
      body.code === 'MEMBERSHIP_ALREADY_ACTIVE' || body.error === 'MEMBERSHIP_ALREADY_ACTIVE'
    );
  });
});

test('Member Pricing Integration on Event Ticket Purchase', async (t) => {
  // Login as active member (Maya Member, id = 5)
  const mayaLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maya@odoo-ldce.org', password: 'password123' }),
  });
  assert.equal(mayaLoginRes.status, 200, 'Maya login should succeed');
  const mayaData = await mayaLoginRes.json();
  const mayaToken = mayaData.token || mayaData.accessToken || mayaData.data?.token;

  // Login as expired member (Vik Volunteer, id = 4, status = expired)
  const vikLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vik@odoo-ldce.org', password: 'password123' }),
  });
  assert.equal(vikLoginRes.status, 200, 'Vik login should succeed');
  const vikData = await vikLoginRes.json();
  const vikToken = vikData.token || vikData.accessToken || vikData.data?.token;

  // Login as cancelled member (Greg Guest, id = 7, status = cancelled)
  const gregLoginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'greg@odoo-ldce.org', password: 'password123' }),
  });
  assert.equal(gregLoginRes.status, 200, 'Greg login should succeed');
  const gregData = await gregLoginRes.json();
  const gregToken = gregData.token || gregData.accessToken || gregData.data?.token;

  await t.test('ACTIVE member (Maya) gets member price (₹300)', async () => {
    const ticketRes = await fetch(`${BACKEND_URL}/events/1/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mayaToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(ticketRes.status, 201);
    const body = await ticketRes.json();
    const ticket = body.ticket || body.data;
    assert.equal(ticket.price_type, 'member');
    assert.equal(parseFloat(ticket.price), 300.00);
  });

  await t.test('EXPIRED member (Vik) gets non-member price (₹500)', async () => {
    const ticketRes = await fetch(`${BACKEND_URL}/events/1/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vikToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(ticketRes.status, 201);
    const body = await ticketRes.json();
    const ticket = body.ticket || body.data;
    assert.equal(ticket.price_type, 'non_member');
    assert.equal(parseFloat(ticket.price), 500.00);
  });

  await t.test('CANCELLED member (Greg) gets non-member price (₹500)', async () => {
    const ticketRes = await fetch(`${BACKEND_URL}/events/1/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gregToken}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(ticketRes.status, 201);
    const body = await ticketRes.json();
    const ticket = body.ticket || body.data;
    assert.equal(ticket.price_type, 'non_member');
    assert.equal(parseFloat(ticket.price), 500.00);
  });

  await t.test('No membership (Guest) gets non-member price (₹500)', async () => {
    const guestTs = Date.now();
    const guestRes = await fetch(`${BACKEND_URL}/events/1/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `guest_buyer_${guestTs}@example.com`,
        name: 'Guest Buyer',
        mobile: '9876543210',
      }),
    });
    assert.equal(guestRes.status, 201);
    const body = await guestRes.json();
    const ticket = body.ticket || body.data;
    assert.equal(ticket.price_type, 'non_member');
    assert.equal(parseFloat(ticket.price), 500.00);
  });
});
