// backend/scripts/test_auth_membership.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const app = require('../app');
const { pool, query } = require('../db/connection');
const { isActiveMember } = require('../shared/membership/isActiveMember');

async function runTests() {
  console.log('====================================================');
  console.log('STARTING AUTH & MEMBERSHIP VERIFICATION SUITE');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

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
    // ----------------------------------------------------
    // AUTH TESTS
    // ----------------------------------------------------
    console.log('--- 1. AUTHENTICATION TESTS ---');

    const testEmail = `testuser_${Date.now()}@skyline.org`;
    const testPassword = 'Password123!';

    // 1. Register new user
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test New User',
        email: testEmail,
        password: testPassword
      })
    });
    const regBody = await regRes.json();
    assert(regRes.status === 201 && regBody.success === true && regBody.user && regBody.user.email === testEmail,
      '1. Register new user returns 201 and safe user profile without password_hash');
    assert(!regBody.user.password_hash && !regBody.user.password,
      '   User response strictly excludes password / password_hash');

    const registeredUserId = regBody.user.id;
    const regToken = regBody.token;

    // 2. Duplicate email -> 409
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Attempt',
        email: testEmail,
        password: 'AnotherPassword!'
      })
    });
    assert(dupRes.status === 409, '2. Duplicate email registration returns 409 Conflict');

    // 3. Login with correct password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const loginBody = await loginRes.json();
    assert(loginRes.status === 200 && loginBody.success === true && loginBody.token,
      '3. Login with correct password returns 200 and valid JWT token');

    const token = loginBody.token;

    // 4. Login with wrong password -> 401
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999'
      })
    });
    assert(wrongPassRes.status === 401, '4. Login with wrong password returns 401 Unauthorized');

    // 5. GET /api/auth/me without token -> 401
    const noTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    assert(noTokenRes.status === 401, '5. GET /api/auth/me without token returns 401 Unauthorized');

    // 6. GET /api/auth/me with valid token -> success
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const meBody = await meRes.json();
    assert(meRes.status === 200 && meBody.success === true && meBody.user && meBody.user.email === testEmail,
      '6. GET /api/auth/me with valid token returns authenticated user profile');

    // 7. Invalid JWT -> 401
    const badJwtRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid.fake.token' }
    });
    assert(badJwtRes.status === 401, '7. Invalid JWT token returns 401 Unauthorized');

    // ----------------------------------------------------
    // AUTHORIZATION / RBAC TESTS
    // ----------------------------------------------------
    console.log('\n--- 2. AUTHORIZATION (RBAC) TESTS ---');

    // Log in as seeded Admin (admin@skyline.org / Password123!)
    // Note: the seed password hash in seed_data.sql was created for a sample password or we can generate a valid admin token
    const jwt = require('jsonwebtoken');
    const adminToken = jwt.sign(
      { userId: 1, email: 'admin@skyline.org', role: 'admin' },
      process.env.JWT_SECRET || 'skyline_super_secret_jwt_key_2026',
      { expiresIn: '2h' }
    );
    const memberToken = jwt.sign(
      { userId: 5, email: 'maya@skyline.org', role: 'member' },
      process.env.JWT_SECRET || 'skyline_super_secret_jwt_key_2026',
      { expiresIn: '2h' }
    );

    // 8. Correct role -> allowed (/api/membership/all requires admin/treasurer)
    const adminRoleRes = await fetch(`${baseUrl}/api/membership/all`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminRoleRes.status === 200, '8. Correct role (admin) allows access to admin-only endpoint (200)');

    // 9. Wrong role -> 403 (/api/membership/all accessed by member role)
    const wrongRoleRes = await fetch(`${baseUrl}/api/membership/all`, {
      headers: { 'Authorization': `Bearer ${memberToken}` }
    });
    assert(wrongRoleRes.status === 403, '9. Wrong role (member) is rejected with 403 Forbidden');

    // ----------------------------------------------------
    // MEMBERSHIP TESTS
    // ----------------------------------------------------
    console.log('\n--- 3. MEMBERSHIP TESTS ---');

    // 10. Create membership
    const createMemRes = await fetch(`${baseUrl}/api/membership`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const createMemBody = await createMemRes.json();
    assert(createMemRes.status === 201 && createMemBody.data.dues_status === 'pending',
      '10. Create membership creates record with dues_status="pending"');

    // 11. View membership
    const viewMemRes = await fetch(`${baseUrl}/api/membership/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const viewMemBody = await viewMemRes.json();
    assert(viewMemRes.status === 200 && viewMemBody.data.exists === true,
      '11. View membership returns current user membership status and details');

    // Pay dues test for user
    const payRes = await fetch(`${baseUrl}/api/membership/dues/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ payment_mode: 'online' })
    });
    const payBody = await payRes.json();
    assert(payRes.status === 200 && payBody.data.dues_status === 'paid' && payBody.data.is_active === true,
      '   Pay dues updates dues_status="paid" and activates membership');

    // Verify financial transaction record was created
    const txCheck = await query(
      `SELECT * FROM transactions WHERE source_type = 'dues' AND source_id = $1`,
      [payBody.data.id]
    );
    assert(txCheck.rows.length === 1 && txCheck.rows[0].status === 'paid' && Number(txCheck.rows[0].amount) === 500,
      '   Ledger transaction record created atomically for paid dues');

    // 12. Paid + non-expired -> isActiveMember = true
    // Seed user 5 (Maya Member) has dues_status='paid', expiry_date='2027-12-31'
    const isMayaActive = await isActiveMember(5);
    assert(isMayaActive === true, '12. Paid + non-expired (user 5) -> isActiveMember = true');

    // 13. Unpaid + non-expired -> isActiveMember = false
    // Seed user 8 (Pia Pending) has dues_status='pending'
    const isPiaActive = await isActiveMember(8);
    assert(isPiaActive === false, '13. Unpaid (pending) (user 8) -> isActiveMember = false');

    // 14. Paid + expired -> isActiveMember = false
    // Seed user 6 (Eddie Expired) has dues_status='paid', expiry_date='2025-12-31'
    const isEddieActive = await isActiveMember(6);
    assert(isEddieActive === false, '14. Paid + expired (user 6) -> isActiveMember = false');

    // 15. Unpaid + expired -> false
    // Temporarily insert or check synthetic user
    const testExpiredUserRes = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Unpaid Expired', 'unpaid_expired_${Date.now()}@test.org', 'dummyhash', 'guest')
       RETURNING id;`
    );
    const unpaidExpiredUserId = testExpiredUserRes.rows[0].id;
    await query(
      `INSERT INTO memberships (user_id, member_code, dues_amount, dues_status, start_date, expiry_date)
       VALUES ($1, 'MEM-TEST-UNPAID-EXP', 500.00, 'pending', '2024-01-01', '2024-12-31');`,
      [unpaidExpiredUserId]
    );
    const isUnpaidExpiredActive = await isActiveMember(unpaidExpiredUserId);
    assert(isUnpaidExpiredActive === false, '15. Unpaid + expired -> isActiveMember = false');

    // Member Pass check
    const passRes = await fetch(`${baseUrl}/api/membership/pass`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const passBody = await passRes.json();
    assert(passRes.status === 200 && passBody.data.member_name === 'Test New User' && passBody.data.is_active === true,
      '   Member pass endpoint returns safe digital pass data');

    // Clean up temporary test user
    await query('DELETE FROM users WHERE id = $1', [unpaidExpiredUserId]);
    await query('DELETE FROM users WHERE id = $1', [registeredUserId]);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('====================================================');

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

runTests();
