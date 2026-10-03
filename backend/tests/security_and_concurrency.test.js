// backend/tests/security_and_concurrency.test.js
process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../app');
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const bcrypt = require('bcryptjs');

console.log('================================================================');
console.log('SECURITY & CONCURRENCY TEST SUITE (PHASES 2, 3, 5, 8, 15, 27, 28, 46)');
console.log('================================================================\n');

function createToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTestSuite() {
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
      return {
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        body: data,
      };
    });
  }

  let adminUser, memberUser, volunteerUser;
  let adminToken, memberToken, volunteerToken;

  try {
    // 0. Setup test users
    const usersRes = await pool.query("SELECT * FROM users WHERE email IN ('admin@odoo-ldce.org', 'maya@odoo-ldce.org', 'vik@odoo-ldce.org');");
    const usersMap = {};
    usersRes.rows.forEach(u => { usersMap[u.email] = u; });

    adminUser = usersMap['admin@odoo-ldce.org'];
    memberUser = usersMap['maya@odoo-ldce.org'];
    volunteerUser = usersMap['vik@odoo-ldce.org'];

    adminToken = createToken(adminUser);
    memberToken = createToken(memberUser);
    volunteerToken = createToken(volunteerUser);

    // =========================================================================
    // 1. AUTHENTICATION, LOCKOUT & PASSWORD SECURITY
    // =========================================================================
    console.log('--- 1. Authentication, Account Lockout & Password Security ---');

    // Create a dedicated user for lockout testing
    const lockEmail = `lock_test_${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('CorrectPassword123', 10);
    const lockUserRes = await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Lockout Tester', $1, $2, 'member')
      RETURNING *;
    `, [lockEmail, passwordHash]);
    const lockUser = lockUserRes.rows[0];

    // Failed login 1 to 4 should increment failed_login_attempts
    for (let i = 1; i <= 4; i++) {
      const failRes = await api('/auth/login', {
        method: 'POST',
        body: { email: lockEmail, password: 'WrongPassword' },
      });
      assert(failRes.status === 401, `Failed attempt ${i} returns 401`);
    }

    const checkAttempts = await pool.query('SELECT failed_login_attempts, locked_until FROM users WHERE id = $1;', [lockUser.id]);
    assert(checkAttempts.rows[0].failed_login_attempts === 4, 'User failed_login_attempts is 4');
    assert(checkAttempts.rows[0].locked_until === null, 'User is not yet locked');

    // 5th failed attempt triggers temporary lockout
    const fifthFail = await api('/auth/login', {
      method: 'POST',
      body: { email: lockEmail, password: 'WrongPassword' },
    });
    assert(fifthFail.status === 401, '5th attempt returns 401');

    const checkLocked = await pool.query('SELECT failed_login_attempts, locked_until FROM users WHERE id = $1;', [lockUser.id]);
    assert(checkLocked.rows[0].failed_login_attempts === 5, 'User failed_login_attempts is 5');
    assert(checkLocked.rows[0].locked_until !== null, 'Account locked_until timestamp set');

    // 6th attempt (even with CORRECT password) is rejected with 403 ACCOUNT_LOCKED
    const lockedRes = await api('/auth/login', {
      method: 'POST',
      body: { email: lockEmail, password: 'CorrectPassword123' },
    });
    assert(lockedRes.status === 403, 'Locked account is rejected with 403 ACCOUNT_LOCKED');
    assert(lockedRes.body.error === 'ACCOUNT_LOCKED', 'Error code is ACCOUNT_LOCKED');

    // Admin unlocks user account
    const unlockRes = await api(`/api/admin/security/unlock-user/${lockUser.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(unlockRes.status === 200, 'Admin can unlock user account (200 OK)');

    // Now login with correct password succeeds and resets failed attempts
    const loginSuccess = await api('/auth/login', {
      method: 'POST',
      body: { email: lockEmail, password: 'CorrectPassword123' },
    });
    assert(loginSuccess.status === 200, 'Login succeeds after unlock (200 OK)');
    assert(loginSuccess.body.session_token !== undefined, 'Login returns a session_token');

    const checkUnlocked = await pool.query('SELECT failed_login_attempts, locked_until FROM users WHERE id = $1;', [lockUser.id]);
    assert(checkUnlocked.rows[0].failed_login_attempts === 0, 'failed_login_attempts reset to 0');
    assert(checkUnlocked.rows[0].locked_until === null, 'locked_until cleared');

    // Password reset flow
    const resetReqRes = await api('/auth/forgot-password', {
      method: 'POST',
      body: { email: lockEmail },
    });
    assert(resetReqRes.status === 200, 'Forgot password returns 200 generic message');
    assert(resetReqRes.body.devResetToken !== undefined, 'Dev reset token provided in test environment');

    const rawToken = resetReqRes.body.devResetToken;
    const resetConfirmRes = await api('/auth/reset-password', {
      method: 'POST',
      body: { token: rawToken, new_password: 'NewSuperPassword123!' },
    });
    assert(resetConfirmRes.status === 200, 'Password reset confirm succeeds (200 OK)');

    // Reusing the same token fails (single-use enforcement)
    const tokenReuseRes = await api('/auth/reset-password', {
      method: 'POST',
      body: { token: rawToken, new_password: 'AnotherPassword123!' },
    });
    assert(tokenReuseRes.status === 400, 'Reused reset token is rejected (400 Bad Request)');
    assert(tokenReuseRes.body.error === 'INVALID_RESET_TOKEN', 'Error code is INVALID_RESET_TOKEN');

    // =========================================================================
    // 2. SESSION MANAGEMENT & REVOCATION (PHASE 3)
    // =========================================================================
    console.log('\n--- 2. Session Management & Revocation ---');

    // Login creates session
    const userSessionLogin = await api('/auth/login', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0 (Test Device)' },
      body: { email: lockEmail, password: 'NewSuperPassword123!' },
    });

    const sessionToken = userSessionLogin.body.session_token;
    const userJwt = userSessionLogin.body.token;

    // View active sessions
    const sessionsRes = await api('/auth/sessions', {
      headers: {
        Authorization: `Bearer ${userJwt}`,
        'x-session-token': sessionToken,
      },
    });
    assert(sessionsRes.status === 200, 'GET /auth/sessions returns 200 OK');
    assert(Array.isArray(sessionsRes.body.sessions), 'Sessions returned as an array');
    const activeSession = sessionsRes.body.sessions.find(s => s.is_current);
    assert(activeSession !== undefined, 'Current session identified correctly');

    // Request with valid session succeeds
    const meBefore = await api('/auth/me', {
      headers: {
        Authorization: `Bearer ${userJwt}`,
        'x-session-token': sessionToken,
      },
    });
    assert(meBefore.status === 200, 'Authorized request with active session succeeds');

    // Revoke the session
    const revokeRes = await api(`/auth/sessions/${activeSession.id}/revoke`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userJwt}`,
        'x-session-token': sessionToken,
      },
    });
    assert(revokeRes.status === 200, 'Session revocation succeeds (200 OK)');

    // Next request with revoked session is rejected with 401 SESSION_REVOKED
    const meAfter = await api('/auth/me', {
      headers: {
        Authorization: `Bearer ${userJwt}`,
        'x-session-token': sessionToken,
      },
    });
    assert(meAfter.status === 401, 'Request with revoked session is rejected (401 Unauthorized)');
    assert(meAfter.body.error === 'SESSION_REVOKED', 'Error code is SESSION_REVOKED');

    // =========================================================================
    // 3. OBJECT-LEVEL AUTHORIZATION & SECURITY CENTER (PHASES 4, 5, 24)
    // =========================================================================
    console.log('\n--- 3. Object-Level Authorization & Security Center ---');

    // Non-admin cannot access admin security overview (403)
    const nonAdminSec = await api('/api/admin/security/overview', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(nonAdminSec.status === 403, 'Non-admin cannot access /api/admin/security/overview (403 Forbidden)');

    // Admin can access security overview
    const adminSec = await api('/api/admin/security/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminSec.status === 200, 'Admin can access /api/admin/security/overview (200 OK)');
    assert(typeof adminSec.body.activeSessions === 'number', 'activeSessions count returned');
    assert(Array.isArray(adminSec.body.recentLogs), 'recentLogs returned');

    // Audit logs pagination
    const auditRes = await api('/api/admin/security/audit-logs?limit=5&page=1', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(auditRes.status === 200, 'Admin can access paginated audit logs (200 OK)');
    assert(auditRes.body.logs.length <= 5, 'Audit logs respects pagination limit');
    assert(typeof auditRes.body.total === 'number', 'Total audit logs count returned');

    // Notifications object-level isolation: User A cannot read User B's notification
    const notifUserA = await pool.query(`
      INSERT INTO notifications (user_id, type, title, message)
      VALUES ($1, 'security', 'Private Alert', 'Do not share')
      RETURNING *;
    `, [adminUser.id]);

    const unauthorizedRead = await api(`/api/notifications/${notifUserA.rows[0].id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(unauthorizedRead.status === 404, 'User cannot read another user notification (404 Not Found)');

    // =========================================================================
    // 4. EVENT CANCELLATION STATE MACHINE (PHASE 46)
    // =========================================================================
    console.log('\n--- 4. Event Cancellation State Machine ---');

    // Create an event to test cancellation
    const cancelEvtRes = await api('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `Cancellation Test Event ${Date.now()}`,
        venue: 'Main Hall',
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 172800000).toISOString(),
        capacity: 50,
        member_price: 150,
        non_member_price: 250,
        volunteers_enabled: true,
        volunteers_required: 5,
      },
    });
    assert(cancelEvtRes.status === 201, 'Created event for cancellation testing');
    const evtId = cancelEvtRes.body.event?.id || cancelEvtRes.body.data?.id;

    // Admin cancels event
    const cancelActionRes = await api(`/events/${evtId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { reason: 'Weather warning' },
    });
    assert(cancelActionRes.status === 200, 'Admin cancels event (200 OK)');
    assert(cancelActionRes.body.event.status === 'cancelled', 'Event status updated to cancelled');
    assert(cancelActionRes.body.event.cancellation_reason === 'Weather warning', 'Cancellation reason saved');

    // Attempting ticket purchase on cancelled event is rejected
    const buyCancelledRes = await api(`/events/${evtId}/purchase`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: {},
    });
    assert(buyCancelledRes.status === 409, 'Ticket purchase on cancelled event rejected (409 Conflict)');
    assert(buyCancelledRes.body.error === 'EVENT_CANCELLED', 'Error code is EVENT_CANCELLED');

    // Attempting volunteer application on cancelled event is rejected
    const volCancelledRes = await api(`/events/${evtId}/volunteers/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
    });
    assert(volCancelledRes.status === 409, 'Volunteer application on cancelled event rejected (409 Conflict)');
    assert(volCancelledRes.body.error === 'EVENT_CANCELLED', 'Error code is EVENT_CANCELLED');

    // =========================================================================
    // 5. IDEMPOTENCY & CONCURRENCY (PHASES 15 & 28)
    // =========================================================================
    console.log('\n--- 5. Payment Idempotency & Concurrency ---');

    // Create an active event with 1 seat for concurrency testing
    const limitedEvtRes = await api('/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `Single Seat Event ${Date.now()}`,
        venue: 'Room 101',
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 172800000).toISOString(),
        capacity: 1,
        member_price: 100,
        non_member_price: 200,
        volunteers_enabled: true,
        volunteers_required: 1,
      },
    });
    const limitedEvt = limitedEvtRes.body.event || limitedEvtRes.body.data;

    // Idempotency: Checkout with Idempotency-Key
    const idempotencyKey = `idemp-test-${Date.now()}`;
    const firstReq = await api(`/events/${limitedEvt.id}/tickets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: { price_type: 'member' },
    });
    assert(firstReq.status === 201, 'First ticket checkout succeeds (201 Created)');

    // Repeat identical request with same key
    const secondReq = await api(`/events/${limitedEvt.id}/tickets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: { price_type: 'member' },
    });
    assert(secondReq.status === 201, 'Second request returns 201 from cache');
    assert(secondReq.headers['x-idempotent-replay'] === 'true', 'X-Idempotent-Replay header present');
    assert(secondReq.body.id === firstReq.body.id, 'Same ticket object returned without duplicate creation');

    // Reusing same Idempotency-Key with different payload rejected with 409
    const mismatchReq = await api(`/events/${limitedEvt.id}/tickets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: { price_type: 'different_payload_tamper' },
    });
    assert(mismatchReq.status === 409, 'Mismatched payload with same key rejected (409 Conflict)');

    // Concurrency: 2 simultaneous volunteer applications for 1 slot
    await pool.query('DELETE FROM event_volunteers WHERE event_id = $1;', [limitedEvt.id]);

    const volUser2Res = await pool.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Concurrent Vol 2', $1, 'hash', 'volunteer')
      RETURNING *;
    `, [`conc_vol2_${Date.now()}@example.com`]);
    const volToken2 = createToken(volUser2Res.rows[0]);

    const [compete1, compete2] = await Promise.all([
      api(`/events/${limitedEvt.id}/volunteers/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${volunteerToken}` },
      }),
      api(`/events/${limitedEvt.id}/volunteers/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${volToken2}` },
      }),
    ]);

    const statuses = [compete1.status, compete2.status].sort();
    assert(statuses[0] === 201, 'Exactly one concurrent volunteer application succeeds (201)');
    assert(statuses[1] === 409, 'Other concurrent application rejected due to capacity limit (409)');

    // =========================================================================
    // 6. SECURITY HEADERS & HEALTH READINESS (PHASES 7, 9, 49)
    // =========================================================================
    console.log('\n--- 6. Security Headers & Health Readiness ---');

    const healthRes = await api('/health');
    assert(healthRes.status === 200, 'GET /health returns 200 OK');

    const readyRes = await api('/ready');
    assert(readyRes.status === 200, 'GET /ready returns 200 OK and database connected');
    assert(readyRes.body.status === 'ready', 'Ready status is ready');

    assert(readyRes.headers['x-request-id'] !== undefined, 'X-Request-ID correlation header present on response');
    assert(readyRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff header present');
    assert(readyRes.headers['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options: SAMEORIGIN header present');

    console.log('\n================================================================');
    console.log(`ALL SECURITY & CONCURRENCY TESTS PASSED: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
    await pool.end();
  }
}

if (require.main === module) {
  runTestSuite()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}

module.exports = { runTestSuite };
