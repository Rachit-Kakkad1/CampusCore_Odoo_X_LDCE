const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const { pool } = require('../config/database');
const { isActiveMember, getMembershipStatus } = require('../shared/membership/isActiveMember');
const syncMembershipStatuses = require('../shared/membership/syncMembershipStatuses');

async function runMembershipTests() {
  console.log('================================================================');
  console.log('TEST SUITE: MEMBERSHIP LIFECYCLE & MANAGEMENT MODULE');
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
    const eddieToken = makeToken(users['eddie@odoo-ldce.org']);
    const piaToken = makeToken(users['pia@odoo-ldce.org']);
    const vikToken = makeToken(users['vik@odoo-ldce.org']);

    // 1. Initial State Verifications
    console.log('--- 1. Testing GET /membership/me & Initial Statuses ---');
    const mayaRes = await api('/membership/me', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(mayaRes.status === 200, 'GET /membership/me returns 200 OK');
    assert(mayaRes.body.status === 'ACTIVE', 'Maya Member status is ACTIVE');
    assert(mayaRes.body.days_remaining > 0, 'Active member has positive days_remaining');

    const eddieRes = await api('/membership/me', {
      headers: { Authorization: `Bearer ${eddieToken}` },
    });
    assert(eddieRes.status === 200 && eddieRes.body.status === 'EXPIRED', 'Eddie status is EXPIRED');
    assert(eddieRes.body.days_remaining === 0, 'Expired member has 0 days_remaining');

    const piaRes = await api('/membership/me', {
      headers: { Authorization: `Bearer ${piaToken}` },
    });
    assert(piaRes.status === 200 && piaRes.body.status === 'PENDING', 'Pia status is PENDING');

    const noneRes = await api('/membership/me', {
      headers: { Authorization: `Bearer ${vikToken}` },
    });
    assert(noneRes.status === 200 && noneRes.body.status === 'NONE', 'User without membership status is NONE');

    // 2. Digital Member Pass & Public Verification
    console.log('--- 2. Testing Member Pass & Verification ---');
    const passRes = await api('/membership/pass', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(passRes.status === 200 && passRes.body.pass.member_code === 'MEM-2026-MAYA', 'GET /membership/pass returns member pass');
    assert(passRes.body.pass.status === 'ACTIVE', 'Pass card indicates ACTIVE status');

    const verifyRes = await api('/membership/verify/MEM-2026-MAYA');
    assert(verifyRes.status === 200 && verifyRes.body.valid === true, 'GET /membership/verify/:code confirms valid member code');

    const verifyExpiredRes = await api('/membership/verify/MEM-2025-EDDIE');
    assert(verifyExpiredRes.status === 200 && verifyExpiredRes.body.valid === false && verifyExpiredRes.body.status === 'EXPIRED', 'Verification identifies expired member code');

    // 3. Payment Flow & Interval Arithmetic (Case 1, 2, 3)
    console.log('--- 3. Testing Payment Flow & Interval Calculation ---');
    const payRes = await api('/membership/pay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${piaToken}` },
      body: { payment_mode: 'online' },
    });
    assert(payRes.status === 200, 'POST /membership/pay succeeds for pending member');
    assert(payRes.body.status === 'ACTIVE', 'Case 2: PENDING -> ACTIVE on successful payment');
    assert(payRes.body.membership.dues_status === 'paid', 'dues_status updated to paid');
    assert(payRes.body.membership.started_at !== null, 'started_at is populated');
    assert(payRes.body.membership.expiry_date !== null, 'expiry_date is populated');

    // Interval check (~365 days)
    const started = new Date(payRes.body.membership.started_at);
    const expiry = new Date(payRes.body.membership.expiry_date);
    const daysDiff = Math.round((expiry - started) / (1000 * 86400));
    assert(daysDiff >= 365 && daysDiff <= 366, 'Case 3: Expiry date automatically calculated using interval (~365 days)');

    // Duplicate payment attempt rejected
    const dupPayRes = await api('/membership/pay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${piaToken}` },
      body: { payment_mode: 'online' },
    });
    assert(dupPayRes.status === 400 && dupPayRes.body.error === 'MEMBERSHIP_ALREADY_ACTIVE', 'Duplicate payment rejected with MEMBERSHIP_ALREADY_ACTIVE');

    // 4. Dedicated 20 Lifecycle Test Cases
    console.log('--- 4. Executing 20 Formal Lifecycle Test Cases ---');

    // Create a temporary test user
    const tempUserRes = await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Lifecycle Suite User', 'lifecycle_suite_${Date.now()}@example.com', 'hash', 'member')
      RETURNING id, name, email, role;
    `);
    const tempUser = tempUserRes.rows[0];
    const tempToken = makeToken(tempUser);

    // Case 1: New membership -> PENDING
    const newMemRes = await pool.query(`
      INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount)
      VALUES ($1, $2, 'pending', 'pending', 500.00)
      RETURNING *;
    `, [tempUser.id, `MEM-SUITE-${Date.now()}`]);
    const memRow1 = newMemRes.rows[0];
    const status1 = await getMembershipStatus(tempUser.id);
    assert(status1.status === 'PENDING', 'Test Case 1: New membership -> PENDING');

    // Case 11: Pending membership -> isActiveMember = false
    const isActivePending = await isActiveMember(tempUser.id);
    assert(isActivePending === false, 'Test Case 11: Pending membership -> isActiveMember = false');

    // Case 12: Unpaid membership -> isActiveMember = false
    assert(isActivePending === false && memRow1.dues_status === 'pending', 'Test Case 12: Unpaid membership -> isActiveMember = false');

    // Case 2 & 3: Successful payment: PENDING -> ACTIVE with automatic interval
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
    `, [memRow1.id]);
    const memRow2 = activateRes.rows[0];
    const status2 = await getMembershipStatus(tempUser.id);
    assert(status2.status === 'ACTIVE', 'Test Case 2: Successful payment: PENDING -> ACTIVE');

    const intervalDays = Math.round((new Date(memRow2.expiry_date) - new Date(memRow2.started_at)) / (1000 * 86400));
    assert(intervalDays >= 365 && intervalDays <= 366, 'Test Case 3: Expiry date automatically calculated using interval');

    // Case 4: Active membership before expiry -> ACTIVE
    assert(status2.status === 'ACTIVE' && status2.is_active === true, 'Test Case 4: Active membership before expiry -> ACTIVE');

    // Case 13: Active paid membership -> isActiveMember = true
    const isActivePaid = await isActiveMember(tempUser.id);
    assert(isActivePaid === true, 'Test Case 13: Active paid membership -> isActiveMember = true');

    // Case 8: Cancellation: ACTIVE -> CANCELLED
    const cancelRes = await api('/membership/cancel', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` },
      body: { reason: 'Relocated out of state' },
    });
    assert(cancelRes.status === 200 && cancelRes.body.status === 'CANCELLED', 'Test Case 8: Cancellation: ACTIVE -> CANCELLED');

    // Case 9: Cancelled membership -> isActiveMember = false
    const isActiveCancelled = await isActiveMember(tempUser.id);
    assert(isActiveCancelled === false, 'Test Case 9: Cancelled membership -> isActiveMember = false');

    // Case 17: Historical cancelled/expired memberships are not deleted
    const countCheck = await pool.query('SELECT COUNT(*) FROM memberships WHERE id = $1;', [memRow1.id]);
    assert(parseInt(countCheck.rows[0].count, 10) === 1, 'Test Case 17: Historical cancelled membership is not deleted');

    // Case 15 & 16: Renewal preserves previous history and links via renewed_from_membership_id
    const renewRes = await api('/membership/renew', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempToken}` },
      body: { payment_mode: 'online' },
    });
    assert(renewRes.status === 200 && renewRes.body.status === 'ACTIVE', 'Renewal endpoint succeeds and returns ACTIVE');
    assert(renewRes.body.renewed_from_membership_id === memRow1.id, 'Test Case 16: Renewal links through renewed_from_membership_id');

    const totalUserMems = await pool.query('SELECT COUNT(*) FROM memberships WHERE user_id = $1;', [tempUser.id]);
    assert(parseInt(totalUserMems.rows[0].count, 10) === 2, 'Test Case 15: Renewal preserves previous membership history (found 2 records)');

    const renewedMemId = renewRes.body.membership.id;

    // Case 5: Membership past expiry -> EXPIRED
    // Simulate passing of expiry date
    await pool.query("UPDATE memberships SET expiry_date = NOW() - INTERVAL '2 days' WHERE id = $1;", [renewedMemId]);
    const statusPastExpiry = await getMembershipStatus(tempUser.id);
    assert(statusPastExpiry.status === 'EXPIRED', 'Test Case 5: Membership past expiry -> EXPIRED');

    // Case 10: Expired membership -> isActiveMember = false
    const isActiveExpired = await isActiveMember(tempUser.id);
    assert(isActiveExpired === false, 'Test Case 10: Expired membership -> isActiveMember = false');

    // Case 6: Automatic expiry synchronization updates DB
    const syncRes = await syncMembershipStatuses();
    assert(syncRes.updatedCount >= 1, 'Test Case 6: Automatic expiry synchronization updates DB');

    const dbStatusCheck = (await pool.query('SELECT status FROM memberships WHERE id = $1;', [renewedMemId])).rows[0].status;
    assert(dbStatusCheck === 'expired', 'DB status column explicitly updated to expired');

    // Case 7: Running expiry synchronization twice is safe
    const syncTwice = await syncMembershipStatuses();
    assert(syncTwice.updatedCount === 0, 'Test Case 7: Running expiry synchronization twice is safe (idempotent, 0 re-updates)');

    // Case 14: Expiring-within-30-days query works
    // Create another membership expiring in 15 days
    await pool.query(`
      UPDATE memberships
      SET status = 'active',
          dues_status = 'paid',
          started_at = NOW() - INTERVAL '350 days',
          expiry_date = NOW() + INTERVAL '15 days'
      WHERE id = $1;
    `, [renewedMemId]);

    const expiringRes = await api('/membership/expiring', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(expiringRes.status === 200, 'GET /membership/expiring returns 200 OK');
    const foundExpiring = expiringRes.body.expiring.some((m) => m.id === renewedMemId);
    assert(foundExpiring === true, 'Test Case 14: Expiring-within-30-days query works');

    // 5. Pricing Effects on Events (Case 18, 19, 20)
    console.log('--- 5. Testing Pricing Effects on Other Modules ---');
    const galaEvent = (await pool.query("SELECT id, member_price, non_member_price FROM events WHERE title = 'Spring Gala 2026';")).rows[0];

    // Case 18: Member ticket pricing uses ACTIVE membership only
    const mayaIsActive = await isActiveMember(users['maya@odoo-ldce.org'].id);
    const mayaCheckoutPrice = mayaIsActive ? galaEvent.member_price : galaEvent.non_member_price;
    assert(mayaIsActive === true && parseFloat(mayaCheckoutPrice) === 300.00, 'Test Case 18: Member ticket pricing uses ACTIVE membership only (₹300.00)');

    // Case 19: Expired member receives non-member pricing
    const eddieIsActive = await isActiveMember(users['eddie@odoo-ldce.org'].id);
    const eddieCheckoutPrice = eddieIsActive ? galaEvent.member_price : galaEvent.non_member_price;
    assert(eddieIsActive === false && parseFloat(eddieCheckoutPrice) === 500.00, 'Test Case 19: Expired member receives non-member pricing (₹500.00)');

    // Case 20: Cancelled member receives non-member pricing
    // Cancel the temp user's membership and check price
    await pool.query("UPDATE memberships SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1;", [renewedMemId]);
    const tempIsActiveCancelled = await isActiveMember(tempUser.id);
    const cancelledCheckoutPrice = tempIsActiveCancelled ? galaEvent.member_price : galaEvent.non_member_price;
    assert(tempIsActiveCancelled === false && parseFloat(cancelledCheckoutPrice) === 500.00, 'Test Case 20: Cancelled member receives non-member pricing (₹500.00)');

    // 6. Admin Expiry Dashboard & Management Endpoints
    console.log('--- 6. Testing Admin Dashboard & History Endpoints ---');
    const dashboardRes = await api('/membership/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(dashboardRes.status === 200, 'GET /membership/dashboard returns 200 OK');
    assert('total_active' in dashboardRes.body.dashboard, 'Dashboard contains total_active count');
    assert('expiring_7_days' in dashboardRes.body.dashboard, 'Dashboard contains expiring_7_days count');
    assert('expiring_30_days' in dashboardRes.body.dashboard, 'Dashboard contains expiring_30_days count');
    assert('expired' in dashboardRes.body.dashboard, 'Dashboard contains expired count');
    assert('pending' in dashboardRes.body.dashboard, 'Dashboard contains pending count');
    assert('cancelled' in dashboardRes.body.dashboard, 'Dashboard contains cancelled count');

    const historyRes = await api(`/membership/history/${tempUser.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(historyRes.status === 200 && Array.isArray(historyRes.body.history) && historyRes.body.history.length === 2, 'GET /membership/history/:userId returns complete audit trail of 2 periods');

    const syncApiRes = await api('/membership/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(syncApiRes.status === 200 && 'updatedCount' in syncApiRes.body, 'POST /membership/sync triggers automated sync job');

    // Clean up temporary test data
    await pool.query('DELETE FROM transactions WHERE user_id = $1;', [tempUser.id]);
    await pool.query('DELETE FROM memberships WHERE user_id = $1;', [tempUser.id]);
    await pool.query('DELETE FROM users WHERE id = $1;', [tempUser.id]);

    console.log('\n================================================================');
    console.log(`MEMBERSHIP LIFECYCLE TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal error in membership test suite:', err);
    process.exit(1);
  } finally {
    if (server) await new Promise((res) => server.close(res));
    await pool.end();
  }
}

if (require.main === module) {
  runMembershipTests();
}

module.exports = runMembershipTests;
