const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../app');
const env = require('../config/env');
const { pool } = require('../config/database');

async function runAnnouncementsTests() {
  console.log('================================================================');
  console.log('TEST SUITE: ANNOUNCEMENTS MODULE (GET & POST /announcements)');
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

    // 1. List Announcements (Public)
    console.log('--- 1. Testing Public Announcements Listing ---');
    const listRes = await api('/announcements');
    assert(listRes.status === 200, 'GET /announcements returns 200 OK');
    assert(Array.isArray(listRes.body.announcements), 'Returns announcements array');
    assert(listRes.body.announcements.length >= 2, 'Contains seeded announcements');
    assert(listRes.body.announcements[0].author_name !== undefined, 'Includes author_name attribution');

    // 2. Authorized Creation by Admin
    console.log('--- 2. Testing Announcement Posting ---');
    const createRes = await api('/announcements', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Hackathon Submission Deadline Extended',
        body: 'All teams have an additional 1 hour for the final submission checkpoint.',
      },
    });
    assert(createRes.status === 201, 'POST /announcements by admin returns 201 Created');
    assert(createRes.body.announcement.title === 'Hackathon Submission Deadline Extended', 'Created announcement title matches');

    // 3. Unauthorized Creation Attempt by Member (Should return 403)
    const unauthCreate = await api('/announcements', {
      method: 'POST',
      headers: { Authorization: `Bearer ${mayaToken}` },
      body: {
        title: 'Spam announcement',
        body: 'This should not be allowed.',
      },
    });
    assert(unauthCreate.status === 403, 'POST /announcements by non-admin returns 403 Forbidden');
    assert(unauthCreate.body.error === 'FORBIDDEN', 'Error code is FORBIDDEN');

    // 4. Missing Content Validation
    const emptyRes = await api('/announcements', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { title: '', body: '' },
    });
    assert(emptyRes.status === 400, 'Empty title/body rejected with 400 Bad Request');

    console.log('\n================================================================');
    console.log(`ANNOUNCEMENTS TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal error in announcements test suite:', err);
    process.exit(1);
  } finally {
    if (server) await new Promise((res) => server.close(res));
    await pool.end();
  }
}

if (require.main === module) {
  runAnnouncementsTests();
}

module.exports = runAnnouncementsTests;
