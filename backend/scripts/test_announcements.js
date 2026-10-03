// backend/scripts/test_announcements.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const app = require('../app');
const { pool, query } = require('../db/connection');

async function runTests() {
  console.log('====================================================');
  console.log('STARTING ENHANCED ANNOUNCEMENTS VERIFICATION SUITE');
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

  const cleanupIds = [];

  try {
    // 0. Base Health Check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthBody = await healthRes.json();
    assert(healthRes.status === 200 && healthBody.status === 'ok', '0. GET /api/health returns 200 and status: ok');

    // 1. GET /api/announcements (Default public list - only published)
    const listRes = await fetch(`${baseUrl}/api/announcements`);
    const listBody = await listRes.json();
    assert(
      listRes.status === 200 &&
        listBody.success === true &&
        Array.isArray(listBody.data) &&
        typeof listBody.total === 'number' &&
        typeof listBody.totalPages === 'number',
      '1. GET /api/announcements returns 200 with data array and pagination metadata'
    );
    assert(
      listBody.data.every((a) => a.status === 'published'),
      '   All announcements in default public list have status = "published" (drafts hidden)'
    );

    // 2. Pagination test: page=1&limit=2
    const pagedRes = await fetch(`${baseUrl}/api/announcements?page=1&limit=2`);
    const pagedBody = await pagedRes.json();
    assert(
      pagedRes.status === 200 &&
        pagedBody.data.length === 2 &&
        pagedBody.page === 1 &&
        pagedBody.limit === 2 &&
        pagedBody.totalPages >= 2,
      '2. GET /api/announcements?page=1&limit=2 correctly limits results to 2 items and computes totalPages'
    );

    // 3. Category filter test: category=event
    const catRes = await fetch(`${baseUrl}/api/announcements?category=event`);
    const catBody = await catRes.json();
    assert(
      catRes.status === 200 &&
        catBody.data.length > 0 &&
        catBody.data.every((a) => a.category === 'event'),
      '3. GET /api/announcements?category=event returns only events'
    );

    // 4. Priority filter test: priority=urgent
    const prioRes = await fetch(`${baseUrl}/api/announcements?priority=urgent`);
    const prioBody = await prioRes.json();
    assert(
      prioRes.status === 200 &&
        prioBody.data.length > 0 &&
        prioBody.data.every((a) => a.priority === 'urgent'),
      '4. GET /api/announcements?priority=urgent returns only urgent items'
    );

    // 5. Search test: search=Gala
    const searchRes = await fetch(`${baseUrl}/api/announcements?search=Gala`);
    const searchBody = await searchRes.json();
    assert(
      searchRes.status === 200 &&
        searchBody.data.length > 0 &&
        searchBody.data.some((a) => a.title.toLowerCase().includes('gala') || a.body.toLowerCase().includes('gala')),
      '5. GET /api/announcements?search=Gala performs case-insensitive ILIKE search in PostgreSQL'
    );

    // 6. Validation: Invalid category -> 400
    const invalidCatRes = await fetch(`${baseUrl}/api/announcements?category=space_exploration`);
    assert(invalidCatRes.status === 400, '6. GET /api/announcements?category=invalid returns 400 Bad Request');

    // 7. Validation: Invalid priority -> 400
    const invalidPrioRes = await fetch(`${baseUrl}/api/announcements?priority=super_mega_urgent`);
    assert(invalidPrioRes.status === 400, '7. GET /api/announcements?priority=invalid returns 400 Bad Request');

    // 8. Validation: Invalid pagination bounds -> 400
    const invalidPageRes = await fetch(`${baseUrl}/api/announcements?page=0`);
    assert(invalidPageRes.status === 400, '8. GET /api/announcements?page=0 returns 400 Bad Request');
    const invalidLimitRes = await fetch(`${baseUrl}/api/announcements?limit=500`);
    assert(invalidLimitRes.status === 400, '   GET /api/announcements?limit=500 returns 400 Bad Request');

    // 9. POST announcement with custom priority & category
    const customTitle = `Academic Tech Talk ${Date.now()}`;
    const customRes = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: customTitle,
        content: 'Special guest lecture on Cloud Native systems.',
        priority: 'important',
        category: 'academic',
        status: 'published',
      }),
    });
    const customBody = await customRes.json();
    assert(
      customRes.status === 201 &&
        customBody.success === true &&
        customBody.data.priority === 'important' &&
        customBody.data.category === 'academic',
      '9. POST /api/announcements persists custom priority and category'
    );
    cleanupIds.push(customBody.data.id);

    // 10. POST draft announcement
    const draftTitle = `Internal Strategy Draft ${Date.now()}`;
    const draftRes = await fetch(`${baseUrl}/api/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: draftTitle,
        body: 'Internal executive planning notes. Must not be visible publicly.',
        priority: 'normal',
        category: 'general',
        status: 'draft',
      }),
    });
    const draftBody = await draftRes.json();
    const draftId = draftBody.data.id;
    cleanupIds.push(draftId);

    assert(
      draftRes.status === 201 && draftBody.data.status === 'draft',
      '10. POST /api/announcements creates announcement with status = "draft"'
    );

    // 11. Verify draft is NOT visible in public list
    const checkPublicListRes = await fetch(`${baseUrl}/api/announcements`);
    const checkPublicListBody = await checkPublicListRes.json();
    const draftInPublic = checkPublicListBody.data.find((a) => a.id === draftId);
    assert(
      draftInPublic === undefined,
      '11. Draft announcement is NOT present in standard public GET /api/announcements'
    );

    // 12. Verify draft detail returns 404 for public request
    const draftDetailRes = await fetch(`${baseUrl}/api/announcements/${draftId}`);
    assert(
      draftDetailRes.status === 404,
      '12. GET /api/announcements/:draftId returns 404 Not Found to prevent leaking draft existence'
    );

    // 13. Verify draft detail accessible when authorized / include_drafts=true
    const draftPrivRes = await fetch(`${baseUrl}/api/announcements/${draftId}?include_drafts=true`);
    const draftPrivBody = await draftPrivRes.json();
    assert(
      draftPrivRes.status === 200 && draftPrivBody.data.id === draftId,
      '13. GET /api/announcements/:draftId?include_drafts=true returns complete draft details'
    );

    // 14. PATCH /api/announcements/:id/publish
    const publishRes = await fetch(`${baseUrl}/api/announcements/${draftId}/publish`, {
      method: 'PATCH',
    });
    const publishBody = await publishRes.json();
    assert(
      publishRes.status === 200 &&
        publishBody.success === true &&
        publishBody.data.status === 'published' &&
        publishBody.data.published_at !== null,
      '14. PATCH /api/announcements/:id/publish sets status = "published" and published_at'
    );

    // 15. Verify published announcement now appears in public listing
    const checkPublishedRes = await fetch(`${baseUrl}/api/announcements`);
    const checkPublishedBody = await checkPublishedRes.json();
    const publishedFound = checkPublishedBody.data.find((a) => a.id === draftId);
    assert(
      publishedFound !== undefined && publishedFound.status === 'published',
      '15. Published announcement now appears in public GET /api/announcements'
    );

    // 16. Verify ordering: newest announcements first
    const dates = checkPublishedBody.data.map((a) => new Date(a.created_at).getTime());
    let isSortedDesc = true;
    for (let i = 0; i < dates.length - 1; i++) {
      if (dates[i] < dates[i + 1]) {
        isSortedDesc = false;
        break;
      }
    }
    assert(isSortedDesc, '16. Announcements list is strictly ordered newest first (created_at DESC)');

    // 17. Clean up test records
    if (cleanupIds.length > 0) {
      await query('DELETE FROM announcements WHERE id = ANY($1::int[])', [cleanupIds]);
    }

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
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
