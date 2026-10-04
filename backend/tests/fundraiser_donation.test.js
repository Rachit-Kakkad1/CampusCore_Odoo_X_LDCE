const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const { pool } = require('../config/database');

async function runTestSuite() {
  console.log('================================================================');
  console.log('FUNDRAISER & REAL DONATION FINANCIAL LIFECYCLE TEST SUITE');
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

  let testFundraiserId;
  let testFundraiserSlug;
  let donation1Id;
  let donation1PublicId;
  let donation2Id;
  let adminToken;
  let memberToken;

  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`> Ephemeral test server running at ${baseUrl}\n`);

    // Prepare auth tokens using existing seeded admin (id: 1) and member (id: 5)
    adminToken = jwt.sign(
      { id: 1, userId: 1, email: 'admin@odoo-ldce.org', role: 'admin', name: 'Admin User' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { id: 5, userId: 5, email: 'maya@odoo-ldce.org', role: 'member', name: 'Maya Member' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // =========================================================================
    // 1. CAMPAIGN CREATION & PUBLIC LISTING (AUTHORITATIVE DB TOTALS)
    // =========================================================================
    console.log('--- 1. Fundraiser Campaign Creation & Authoritative Zero State ---');
    
    // Create new campaign
    const createRes = await api('/api/fundraisers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Community Robotics Workshop Drive',
        short_description: 'Support local students with modern robotics hardware.',
        description: 'Comprehensive fund to buy Arduino boards, sensors, and 3D printing equipment.',
        goal_amount: 10000.00,
        currency: 'INR',
        status: 'active',
      },
    });

    assert(createRes.status === 201 && createRes.body.success === true, 'Admin can create a new fundraiser campaign');
    assert(createRes.body.data.public_id && createRes.body.data.public_id.startsWith('FND-'), 'Campaign receives unique opaque public ID');
    assert(parseFloat(createRes.body.data.goal_amount) === 10000.00, 'Goal amount is saved accurately as 10000.00');

    testFundraiserId = createRes.body.data.id;
    testFundraiserSlug = createRes.body.data.slug;

    // Check public listing
    const publicList = await api('/api/fundraisers');
    assert(publicList.status === 200 && Array.isArray(publicList.body.data), 'Public can fetch fundraisers list');
    const campaign = publicList.body.data.find(f => f.id === testFundraiserId);
    assert(campaign !== undefined, 'Created campaign appears in public list');
    assert(parseFloat(campaign.total_raised) === 0.00, 'Initial raised amount is strictly ₹0.00 from real DB transactions');
    assert(campaign.donor_count === 0, 'Initial donor count is strictly 0');
    assert(parseFloat(campaign.percentage_raised) === 0.00, 'Initial percentage is strictly 0%');

    // =========================================================================
    // 2. DONATION VALIDATIONS (INPUT HARDENING)
    // =========================================================================
    console.log('\n--- 2. Donation Input Validation & Hardening ---');

    // Zero amount
    const zeroRes = await api(`/api/fundraisers/${testFundraiserId}/donations/checkout`, {
      method: 'POST',
      body: { amount: 0, name: 'John Doe', email: 'john@example.com', phone: '9876543210' },
    });
    assert(zeroRes.status === 400 && zeroRes.body.error.code === 'INVALID_AMOUNT', 'Rejects $0 donation');

    // Negative amount
    const negRes = await api(`/api/fundraisers/${testFundraiserId}/donations/checkout`, {
      method: 'POST',
      body: { amount: -50, name: 'John Doe', email: 'john@example.com', phone: '9876543210' },
    });
    assert(negRes.status === 400 && negRes.body.error.code === 'INVALID_AMOUNT', 'Rejects negative donation');

    // Missing name
    const missingName = await api(`/api/fundraisers/${testFundraiserId}/donations/checkout`, {
      method: 'POST',
      body: { amount: 50, name: '', email: 'john@example.com', phone: '9876543210' },
    });
    assert(missingName.status === 400 && missingName.body.error.code === 'MISSING_DONOR_NAME', 'Rejects missing donor name');

    // Invalid email
    const invalidEmail = await api(`/api/fundraisers/${testFundraiserId}/donations/checkout`, {
      method: 'POST',
      body: { amount: 50, name: 'John Doe', email: 'bad-email', phone: '9876543210' },
    });
    assert(invalidEmail.status === 400 && invalidEmail.body.error.code === 'INVALID_DONOR_EMAIL', 'Rejects malformed email');

    // Invalid fundraiser
    const badFundraiser = await api('/api/fundraisers/9999999/donations/checkout', {
      method: 'POST',
      body: { amount: 50, name: 'John Doe', email: 'john@example.com', phone: '9876543210' },
    });
    assert(badFundraiser.status === 404, 'Rejects donation to non-existent fundraiser');

    // =========================================================================
    // 3. FINANCIAL LIFECYCLE: PAYMENT, REAL LEDGER, AND REFUNDS
    // =========================================================================
    console.log('\n--- 3. Real Financial Lifecycle: ₹0 -> ₹50 -> ₹75 -> Refund ₹25 -> Net ₹50 ---');

    // Checkout Donation #1 ($50.00)
    const check1 = await api(`/api/fundraisers/${testFundraiserId}/donations/checkout`, {
      method: 'POST',
      body: {
        amount: 50.00,
        name: 'Alice Johnson',
        email: 'alice@student.edu',
        phone: '+91 9876500001',
        anonymous: true,
        message: 'Happy to support robotics education!',
      },
    });

    assert(check1.status === 201 && check1.body.data.status === 'pending', 'Guest donation checkout created in pending status');
    donation1Id = check1.body.data.id;
    donation1PublicId = check1.body.data.public_id;

    // Verify raised amount is STILL 0.00 before payment confirmation
    const prePay = await api(`/api/fundraisers/${testFundraiserId}`);
    assert(parseFloat(prePay.body.data.total_raised) === 0.00, 'Pending donation does NOT increase raised amount');
    assert(prePay.body.data.donor_count === 0, 'Pending donation does NOT increase donor count');

    // Pay Donation #1 ($50.00)
    const pay1 = await api(`/api/fundraisers/donations/${donation1Id}/pay`, {
      method: 'POST',
      body: {
        payment_reference: 'PAY-ROBOT-001',
        payment_mode: 'online',
      },
    });

    assert(pay1.status === 200 && pay1.body.data.status === 'paid', 'Payment successful: donation marked as PAID');
    assert(pay1.body.data.paid_at !== null, 'paid_at timestamp recorded');

    // Verify fundraiser updated to $50.00 and 1 donor
    const postPay1 = await api(`/api/fundraisers/${testFundraiserId}`);
    assert(parseFloat(postPay1.body.data.total_raised) === 50.00, 'Fundraiser raised amount increased to EXACTLY ₹50.00');
    assert(postPay1.body.data.donor_count === 1, 'Donor count is now 1');
    assert(parseFloat(postPay1.body.data.percentage_raised) === 0.5, 'Percentage raised is 0.5% (50/10000)');

    // Verify ledger transaction row was created
    const ledgerRow = await pool.query(`
      SELECT * FROM transactions WHERE source_type = 'donation' AND source_id = $1
    `, [donation1Id]);
    assert(ledgerRow.rows.length === 1, 'Strictly 1 ledger transaction created for donation payment');
    assert(parseFloat(ledgerRow.rows[0].amount) === 50.00 && ledgerRow.rows[0].direction === 'in', 'Ledger transaction amount is 50.00 IN');

    // Checkout & Pay Donation #2 ($25.00)
    const check2 = await api(`/api/fundraisers/${testFundraiserId}/donations/checkout`, {
      method: 'POST',
      body: {
        amount: 25.00,
        name: 'Bob Martin',
        email: 'bob@student.edu',
        phone: '+91 9876500002',
        anonymous: false,
      },
    });
    donation2Id = check2.body.data.id;

    await api(`/api/fundraisers/donations/${donation2Id}/pay`, {
      method: 'POST',
      body: { payment_reference: 'PAY-ROBOT-002', payment_mode: 'online' },
    });

    const postPay2 = await api(`/api/fundraisers/${testFundraiserId}`);
    assert(parseFloat(postPay2.body.data.total_raised) === 75.00, 'Fundraiser raised amount increased to EXACTLY ₹75.00');
    assert(postPay2.body.data.donor_count === 2, 'Donor count is now 2');

    // Process Refund for Donation #2 ($25.00)
    const refundRes = await api(`/api/fundraisers/donations/${donation2Id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Accidental duplicate donation' },
    });

    assert(refundRes.status === 200 && refundRes.body.data.status === 'refunded', 'Admin successfully refunded donation #2');
    assert(parseFloat(refundRes.body.data.refund_amount) === 25.00, 'Refund amount recorded as 25.00');

    // Verify financial totals after refund
    const postRefund = await api(`/api/fundraisers/${testFundraiserId}`);
    assert(parseFloat(postRefund.body.data.total_raised) === 50.00, 'Net raised correctly drops to ₹50.00 after ₹25 refund');
    assert(parseFloat(postRefund.body.data.gross_raised) === 75.00, 'Gross raised remains ₹75.00');
    assert(parseFloat(postRefund.body.data.refunded_amount) === 25.00, 'Refunded amount is ₹25.00');
    assert(postRefund.body.data.donor_count === 1, 'Donor count reflects successful non-refunded donors (1)');

    // =========================================================================
    // 4. IDEMPOTENCY & ANONYMOUS MASKING
    // =========================================================================
    console.log('\n--- 4. Idempotency, Concurrency, and Anonymous Masking ---');

    // Duplicate pay call on already paid donation
    const dupPay = await api(`/api/fundraisers/donations/${donation1Id}/pay`, {
      method: 'POST',
      body: { payment_reference: 'PAY-DUP-TEST' },
    });
    assert(dupPay.status === 200 && dupPay.body.data.status === 'paid', 'Duplicate payment request is idempotent');

    const checkNetAfterDup = await api(`/api/fundraisers/${testFundraiserId}`);
    assert(parseFloat(checkNetAfterDup.body.data.total_raised) === 50.00, 'Duplicate payment does NOT double increment totals');

    // Check anonymous masking in public campaign details
    const publicDetails = await api(`/api/fundraisers/${testFundraiserId}`);
    const anonEntry = publicDetails.body.data.recent_donations.find(d => d.id === donation1Id);
    assert(anonEntry !== undefined, 'Recent donation appears in public ticker');
    assert(anonEntry.donor_name === 'Anonymous Supporter', 'Anonymous donor name is masked as "Anonymous Supporter"');
    assert(anonEntry.donor_email === undefined, 'Donor email is never exposed in public endpoint');
    assert(anonEntry.donor_phone === undefined, 'Donor phone is never exposed in public endpoint');

    // Non-admin refund rejection
    const unauthRefund = await api(`/api/fundraisers/donations/${donation1Id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: { reason: 'Hacking attempt' },
    });
    assert(unauthRefund.status === 403, 'Member cannot issue donation refund (403 Forbidden)');

    // =========================================================================
    // 5. WEBHOOK INTEGRATION
    // =========================================================================
    console.log('\n--- 5. Payment Provider Webhook Integration ---');

    const whCheckout = await api(`/api/fundraisers/${testFundraiserId}/donations/checkout`, {
      method: 'POST',
      body: {
        amount: 100.00,
        name: 'Webhook Tester',
        email: 'webhook@test.com',
        phone: '+91 9999900000',
      },
    });

    const whPubId = whCheckout.body.data.public_id;
    const whDonId = whCheckout.body.data.id;

    const webhookRes = await api('/api/fundraisers/donations/webhook', {
      method: 'POST',
      body: {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_webhook_999',
              notes: {
                donation_public_id: whPubId,
              },
            },
          },
        },
      },
    });

    assert(webhookRes.status === 200 && webhookRes.body.result.action === 'paid', 'Webhook payment.captured successfully processed');
    const whDonationCheck = await api(`/api/fundraisers/donations/${whPubId}`);
    assert(whDonationCheck.status === 200 && whDonationCheck.body.data.status === 'paid', 'Donation marked PAID via webhook');

    // Final total calculation check
    const finalTotals = await api(`/api/fundraisers/${testFundraiserId}`);
    assert(parseFloat(finalTotals.body.data.total_raised) === 150.00, 'Final Net Raised is ₹150.00 (50 + 100)');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  } finally {
    if (testFundraiserId) {
      await pool.query('DELETE FROM fundraisers WHERE id = $1', [testFundraiserId]);
    }
    if (server) {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
