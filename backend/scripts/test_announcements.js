// backend/scripts/test_announcements.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const app = require('../app');
const { pool, query } = require('../db/connection');

async function runTests() {
  console.log('====================================================');
  console.log('STARTING ANNOUNCEMENTS VERIFICATION SUITE');
  console.log('====================================================\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
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

  let createdAnnouncementId = null;

  try {
    // 0. Base Health Check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthBody = await healthRes.json();
    assert(healthRes.status === 200 && healthBody.status === 'ok', '0. GET /api/health returns 200 and status: ok');

    // 1. GET /api/announcements (Initial list)
    const listRes = await fetch(`${baseUrl}/api/announcements`);
    const listBody = await listRes.json();
    assert(
      listRes.status === 200 && listBody.success === true && Array.isArray(listBody.data),
      '1. GET /api/announcements returns 200 with announcement array'
    );
    const initialCount = listBody.data.length;

    // 2. GET /api/announcements/:id (Seeded announcement id = 1)
    const getSingleRes = await fetch(`${baseUrl}/api/announcements/1`);
    const getSingleBody = await getSingleRes.json();
    assert(
      getSingleRes.status === 200 &&
        getSingleBody.success === true &&
        getSingleBody.data.id === 1 &&
        getSingleBody.data.title &&
        getSingleBody.data.body,
      '2. GET /api/announcements/1 returns 200 and single announcement details'
    );
    assert(
      getSingleBody.data.author_name !== undefined,
      '   Announcement includes author metadata (author_name, author_role)'
    );

    // 3. GET nonexistent announcement -> 404
    const notFoundRes = await fetch(`${baseUrl}/api/announcements/999999`);
    assert(notFoundRes.status === 404, '3. GET /api/announcements/999999 returns 404 Not Found');

    // Invalid ID format -> 400
    const invalidIdRes = await fetch(`${baseUrl}/api/announcements/abc`);
    assert(invalidIdRes.status === 400, '   GET /api/announcements/abc returns 400 Bad Request');

    // 4. POST valid announcement
    const uniqueTitle = `Emergency General Meeting - ${Date.now()}`;
    const testBody = 'All active members and volunteers are requested to attend the upcoming general meeting.';
    const createRes = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: uniqueTitle,
        body: testBody
      })
    });
    const createBody = await createRes.json();
    assert(
      createRes.status === 201 &&
        createBody.success === true &&
        createBody.data.id &&
        createBody.data.title === uniqueTitle &&
        createBody.data.body === testBody,
      '4. POST /api/announcements creates a new announcement and returns 201'
    );
    createdAnnouncementId = createBody.data.id;

    // Also test alias 'content' in body
    const aliasRes = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Alias Test - ${Date.now()}`,
        content: 'Content provided via alias field.'
      })
    });
    assert(aliasRes.status === 201, '   POST supports both "body" and "content" input keys');
    const aliasId = (await aliasRes.json()).data.id;

    // 5. POST missing required field -> 400
    const missingTitleRes = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Missing title content' })
    });
    assert(missingTitleRes.status === 400, '5. POST /api/announcements with missing title returns 400');

    const missingBodyRes = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Only Title' })
    });
    assert(missingBodyRes.status === 400, '   POST /api/announcements with missing body returns 400');

    // 6. Verify newly created announcement appears in history
    const updatedListRes = await fetch(`${baseUrl}/api/announcements`);
    const updatedListBody = await updatedListRes.json();
    const foundCreated = updatedListBody.data.find((a) => a.id === createdAnnouncementId);
    assert(
      foundCreated !== undefined && foundCreated.title === uniqueTitle,
      '6. Newly created announcement is persisted and appears in announcement history'
    );

    // 7. Verify newest announcements appear first
    const dates = updatedListBody.data.map((a) => new Date(a.created_at).getTime());
    let isSortedDesc = true;
    for (let i = 0; i < dates.length - 1; i++) {
      if (dates[i] < dates[i + 1]) {
        isSortedDesc = false;
        break;
      }
    }
    assert(isSortedDesc, '7. Announcements list is strictly ordered newest first (created_at DESC)');

    // Clean up test records
    await query('DELETE FROM announcements WHERE id IN ($1, $2)', [createdAnnouncementId, aliasId]);

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('====================================================\n');

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
