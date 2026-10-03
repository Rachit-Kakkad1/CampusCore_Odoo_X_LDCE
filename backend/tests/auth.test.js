const http = require('http');
const app = require('../app');
const { pool } = require('../config/database');

async function runAuthTests() {
  console.log('================================================================');
  console.log('TEST SUITE: AUTHENTICATION MODULE (POST /auth/*, GET /auth/me)');
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

    const uniqueTimestamp = Date.now();
    const testEmail = `newstudent_${uniqueTimestamp}@ldce.edu`;
    const testPassword = 'Password123!';

    // 1. Successful Registration
    console.log('--- 1. Testing Registration ---');
    const regRes = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'New Student',
        email: testEmail,
        password: testPassword,
      },
    });
    assert(regRes.status === 201, 'POST /auth/register returns 201 Created');
    assert(regRes.body.user && regRes.body.user.email === testEmail, 'Returned user email matches input');
    assert(regRes.body.user.role === 'member', 'New user role defaults safely to member');
    assert(regRes.body.user.password_hash === undefined, 'password_hash is strictly excluded from response');
    assert(typeof regRes.body.token === 'string', 'Registration issues valid JWT token');

    // 2. Password Hashing Verification (In DB)
    const dbUser = (await pool.query('SELECT password_hash FROM users WHERE email = $1;', [testEmail])).rows[0];
    assert(dbUser && dbUser.password_hash.startsWith('$2'), 'Password stored as bcrypt hash ($2...), never plaintext');

    // 3. Duplicate Email Rejection
    const dupRes = await api('/auth/register', {
      method: 'POST',
      body: {
        name: 'Duplicate Attempt',
        email: testEmail,
        password: 'AnotherPassword123',
      },
    });
    assert(dupRes.status === 409, 'Duplicate email registration returns 409 Conflict');
    assert(dupRes.body.error === 'EMAIL_ALREADY_EXISTS', 'Error code is EMAIL_ALREADY_EXISTS');

    // 4. Input Validation
    const invalidEmailRes = await api('/auth/register', {
      method: 'POST',
      body: { name: 'Invalid Email', email: 'notanemail', password: '123' },
    });
    assert(invalidEmailRes.status === 400, 'Invalid email format returns 400');

    // 5. Successful Login
    console.log('--- 2. Testing Login ---');
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: {
        email: testEmail,
        password: testPassword,
      },
    });
    assert(loginRes.status === 200, 'POST /auth/login returns 200 OK');
    assert(loginRes.body.user && loginRes.body.user.email === testEmail, 'Login user profile returned');
    assert(typeof loginRes.body.token === 'string', 'Login returns JWT Bearer token');
    const authToken = loginRes.body.token;

    // 6. Invalid Password
    const wrongPassRes = await api('/auth/login', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'WrongPassword999',
      },
    });
    assert(wrongPassRes.status === 401, 'Wrong password returns 401 Unauthorized');
    assert(wrongPassRes.body.error === 'INVALID_CREDENTIALS', 'Error code is INVALID_CREDENTIALS');

    // 7. Non-existent User Login
    const noUserRes = await api('/auth/login', {
      method: 'POST',
      body: {
        email: 'nobody@nowhere.com',
        password: 'password123',
      },
    });
    assert(noUserRes.status === 401, 'Non-existent email returns 401 Unauthorized (does not reveal user existence)');

    // 8. GET /auth/me with Valid Token
    console.log('--- 3. Testing /auth/me ---');
    const meRes = await api('/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(meRes.status === 200, 'GET /auth/me with valid Bearer token returns 200 OK');
    assert(meRes.body.user && meRes.body.user.email === testEmail, '/auth/me returns authenticated user details');
    assert(meRes.body.user.password_hash === undefined, '/auth/me does not expose password_hash');

    // 9. GET /auth/me with Missing / Invalid Token
    const unauthRes = await api('/auth/me');
    assert(unauthRes.status === 401, 'GET /auth/me without token returns 401 Unauthorized');

    const badTokenRes = await api('/auth/me', {
      headers: { Authorization: 'Bearer invalid.token.string' },
    });
    assert(badTokenRes.status === 401, 'GET /auth/me with invalid token returns 401 Unauthorized');

    // Clean up test user
    await pool.query('DELETE FROM users WHERE email = $1;', [testEmail]);

    console.log('\n================================================================');
    console.log(`AUTH TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal error in auth test suite:', err);
    process.exit(1);
  } finally {
    if (server) await new Promise((res) => server.close(res));
    await pool.end();
  }
}

if (require.main === module) {
  runAuthTests();
}

module.exports = runAuthTests;
