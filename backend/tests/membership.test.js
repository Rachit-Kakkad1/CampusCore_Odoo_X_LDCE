const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const { pool } = require('../config/database');

async function runMembershipTests() {
  console.log('================================================================');
  console.log('TEST SUITE: MEMBERSHIP MODULE (GET /membership/*, POST /membership/pay)');
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
    const gregToken = makeToken(users['greg@odoo-ldce.org']);

    // 1. Check status for Maya (ACTIVE)
    console.log('--- 1. Testing GET /membership/me ---');
    const mayaRes = await api('/membership/me', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(mayaRes.status === 200, 'GET /membership/me returns 200 OK');
    assert(mayaRes.body.status === 'ACTIVE', 'Maya Member status is ACTIVE');

    // 2. Check status for Eddie (EXPIRED)
    const eddieRes = await api('/membership/me', {
      headers: { Authorization: `Bearer ${eddieToken}` },
    });
    assert(eddieRes.status === 200 && eddieRes.body.status === 'EXPIRED', 'Eddie status is EXPIRED');

    // 3. Check status for Pia (PENDING)
    const piaRes = await api('/membership/me', {
      headers: { Authorization: `Bearer ${piaToken}` },
    });
    assert(piaRes.status === 200 && piaRes.body.status === 'PENDING', 'Pia status is PENDING');

    // 4. Check status for Greg (NONE)
    const gregRes = await api('/membership/me', {
      headers: { Authorization: `Bearer ${gregToken}` },
    });
    assert(gregRes.status === 200 && gregRes.body.status === 'NONE', 'Greg status is NONE');

    // 5. Digital Member Pass
    console.log('--- 2. Testing Digital Member Pass ---');
    const passRes = await api('/membership/pass', {
      headers: { Authorization: `Bearer ${mayaToken}` },
    });
    assert(passRes.status === 200 && passRes.body.pass.member_code === 'MEM-2026-MAYA', 'GET /membership/pass returns member pass');
    assert(passRes.body.pass.status === 'ACTIVE', 'Pass card indicates ACTIVE status');

    // 6. Public Member Verification
    console.log('--- 3. Testing Public Verification ---');
    const verifyRes = await api('/membership/verify/MEM-2026-MAYA');
    assert(verifyRes.status === 200 && verifyRes.body.valid === true, 'GET /membership/verify/:code confirms valid member code');

    const verifyExpiredRes = await api('/membership/verify/MEM-2025-EDDIE');
    assert(verifyExpiredRes.status === 200 && verifyExpiredRes.body.valid === false && verifyExpiredRes.body.status === 'EXPIRED', 'Verification identifies expired member code');

    // 7. Membership Dues Payment (Pia Pending -> Paid)
    console.log('--- 4. Testing Membership Payment Flow ---');
    const payRes = await api('/membership/pay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${piaToken}` },
      body: { payment_mode: 'online' },
    });
    assert(payRes.status === 200, 'POST /membership/pay succeeds for pending member');
    assert(payRes.body.status === 'ACTIVE', 'Membership status becomes ACTIVE after payment');
    assert(payRes.body.membership.dues_status === 'paid', 'dues_status updated to paid');

    // Verify exactly one dues transaction created
    const txRes = await pool.query(
      "SELECT * FROM transactions WHERE source_type = 'dues' AND user_id = $1;",
      [users['pia@odoo-ldce.org'].id]
    );
    assert(txRes.rows.length === 1 && parseFloat(txRes.rows[0].amount) === 500.00, 'Exactly one dues transaction recorded in ledger');

    // Verify role upgrade from guest to member
    const updatedUserRes = await pool.query('SELECT role FROM users WHERE id = $1;', [users['pia@odoo-ldce.org'].id]);
    assert(updatedUserRes.rows[0].role === 'member', 'User role upgraded to member upon dues payment');

    // 8. Duplicate Payment Attempt (Should be rejected)
    const dupPayRes = await api('/membership/pay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${piaToken}` },
      body: { payment_mode: 'online' },
    });
    assert(dupPayRes.status === 400 && dupPayRes.body.error === 'MEMBERSHIP_ALREADY_ACTIVE', 'Duplicate payment rejected with MEMBERSHIP_ALREADY_ACTIVE');

    // 9. Expiring Memberships & Roster (Admin / Treasurer)
    console.log('--- 5. Testing Admin Roster & Renewal Reminders ---');
    const expiringRes = await api('/membership/expiring', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(expiringRes.status === 200 && Array.isArray(expiringRes.body.expiring), 'GET /membership/expiring returns renewal reminder list');

    const rosterRes = await api('/members', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(rosterRes.status === 200 && Array.isArray(rosterRes.body.members) && rosterRes.body.members.length >= 3, 'GET /members returns organization member roster');

    // 10. Unauthorized access to roster
    const unauthRoster = await api('/members', {
      headers: { Authorization: `Bearer ${gregToken}` },
    });
    assert(unauthRoster.status === 403, 'GET /members rejected with 403 Forbidden for non-admin');

    console.log('\n================================================================');
    console.log(`MEMBERSHIP TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
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
