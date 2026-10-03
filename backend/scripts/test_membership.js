// backend/scripts/test_membership.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const app = require('../app');
const { pool, query } = require('../db/connection');
const { isActiveMember } = require('../shared/membership/isActiveMember');
const { getMembershipStatus } = require('../shared/membership/getMembershipStatus');
const { syncMembershipStatuses } = require('../shared/membership/syncMembershipStatuses');
const membershipService = require('../modules/membership/membership.service');
const membershipRepository = require('../modules/membership/membership.repository');

async function runMembershipTests() {
  console.log('====================================================');
  console.log('STARTING COMPLETE MEMBERSHIP VERIFICATION SUITE');
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

  // Temporary test user created for test isolation
  let testUserId = null;
  let testMembershipId = null;
  let renewedMembershipId = null;

  try {
    // Setup clean test user (User 99)
    await query("DELETE FROM users WHERE email = 'test_member@odoo-ldce.org';");
    const userRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Test Member', 'test_member@odoo-ldce.org', 'fakehash', 'member')
      RETURNING id;
    `);
    testUserId = userRes.rows[0].id;

    // 0. Base Health Check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, '0. GET /api/health returns 200 OK');

    // 1. Create membership -> pending
    const createRes = await fetch(`${baseUrl}/api/membership`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: testUserId }),
    });
    const createBody = await createRes.json();
    assert(
      createRes.status === 201 &&
        createBody.success === true &&
        createBody.data.status === 'pending' &&
        createBody.data.dues_status === 'pending' &&
        createBody.data.started_at === null &&
        createBody.data.expiry_date === null &&
        createBody.data.member_code.startsWith('SKY-MEM-'),
      '1. Create membership initializes status=pending, dues_status=pending, and unique member_code'
    );
    testMembershipId = createBody.data.id;

    // 2. Pay membership -> active
    const payRes = await fetch(`${baseUrl}/api/membership/${testMembershipId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_mode: 'online' }),
    });
    const payBody = await payRes.json();
    assert(
      payRes.status === 200 &&
        payBody.success === true &&
        payBody.data.status === 'active',
      '2. Pay membership transitions status to active'
    );

    // 3. Payment sets: dues_status = paid
    assert(
      payBody.data.dues_status === 'paid',
      '3. Payment sets dues_status = paid'
    );

    // 4. Payment sets: started_at
    const startedAt = new Date(payBody.data.started_at);
    assert(
      payBody.data.started_at !== null && !isNaN(startedAt.getTime()),
      '4. Payment sets valid started_at timestamp'
    );

    // 5. Payment calculates: expiry_date = started_at + 1 year
    const expiryDate = new Date(payBody.data.expiry_date);
    const expectedExpiryYear = startedAt.getFullYear() + 1;
    assert(
      payBody.data.expiry_date !== null &&
        expiryDate.getFullYear() === expectedExpiryYear &&
        expiryDate > startedAt,
      '5. Payment calculates expiry_date = started_at + 1 year via PostgreSQL arithmetic'
    );

    // Verify financial transaction was recorded atomically
    const txRes = await query(
      "SELECT * FROM transactions WHERE source_type = 'dues' AND source_id = $1;",
      [testMembershipId]
    );
    assert(
      txRes.rows.length === 1 &&
        txRes.rows[0].status === 'paid' &&
        txRes.rows[0].direction === 'in',
      '   Payment automatically and safely creates financial transaction in transactions ledger'
    );

    // Verify payment idempotency (cannot pay twice)
    const doublePayRes = await fetch(`${baseUrl}/api/membership/${testMembershipId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_mode: 'online' }),
    });
    assert(
      doublePayRes.status === 409,
      '   Payment is idempotent: Paying already active membership returns 409 Conflict'
    );

    // 6. Active paid non-expired membership: isActiveMember = true
    const isMayaActive = await isActiveMember(5); // Maya Member from seed data
    assert(isMayaActive === true, '6. Active paid non-expired membership: isActiveMember = true (Maya Member)');

    // 7. Pending membership: isActiveMember = false
    const isPiaActive = await isActiveMember(8); // Pia Pending from seed data
    assert(isPiaActive === false, '7. Pending membership: isActiveMember = false (Pia Pending)');

    // 8. Unpaid membership: isActiveMember = false
    assert(isPiaActive === false, '8. Unpaid membership: isActiveMember = false');

    // 9. Expired membership: isActiveMember = false
    const isVikActive = await isActiveMember(4); // Vik Volunteer (expired)
    assert(isVikActive === false, '9. Expired membership: isActiveMember = false (Vik Volunteer)');

    // 10. Cancelled membership: isActiveMember = false
    const isGregActive = await isActiveMember(7); // Greg Guest (cancelled)
    assert(isGregActive === false, '10. Cancelled membership: isActiveMember = false (Greg Guest)');

    // 11. Expiry synchronization: active + past expiry -> expired
    // Create dedicated mock user to avoid active membership constraint violation
    const mockUserRes = await query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Mock Expiree', 'mock_expiree@odoo-ldce.org', 'fakehash', 'member')
      RETURNING id;
    `);
    const mockUserId = mockUserRes.rows[0].id;

    // Insert a membership with past expiry date that is still marked active
    const expiredMockRes = await query(`
      INSERT INTO memberships (user_id, member_code, status, dues_status, started_at, expiry_date)
      VALUES ($1, 'SKY-MEM-MOCK-EXP', 'active', 'paid', NOW() - INTERVAL '400 days', NOW() - INTERVAL '35 days')
      RETURNING id;
    `, [mockUserId]);
    const mockExpId = expiredMockRes.rows[0].id;

    const syncRes1 = await syncMembershipStatuses();
    const syncCount = typeof syncRes1 === 'number' ? syncRes1 : (syncRes1.updatedCount ?? Number(syncRes1));
    assert(syncCount >= 1, '11. Expiry synchronization detects and expires active records past their expiry date');

    const checkMockExp = await query('SELECT status FROM memberships WHERE id = $1;', [mockExpId]);
    assert(checkMockExp.rows[0].status === 'expired', '    Synchronized record updated to status=expired');

    // 12. Run expiry synchronization twice: no duplicate effects
    const syncRes2 = await syncMembershipStatuses();
    const syncCount2 = typeof syncRes2 === 'number' ? syncRes2 : (syncRes2.updatedCount ?? Number(syncRes2));
    assert(syncCount2 === 0, '12. Running expiry synchronization twice is idempotent (0 additional modifications)');

    // Clean mock expired row and user
    await query('DELETE FROM memberships WHERE id = $1;', [mockExpId]);
    await query('DELETE FROM users WHERE id = $1;', [mockUserId]);

    // 13. Cancel membership: row remains in database
    const cancelReason = 'Member requested account cancellation due to graduation';
    const cancelRes = await fetch(`${baseUrl}/api/membership/${testMembershipId}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    });
    const cancelBody = await cancelRes.json();
    assert(
      cancelRes.status === 200 &&
        cancelBody.success === true &&
        cancelBody.data.status === 'cancelled',
      '13. Cancel membership updates status to cancelled without deleting the row'
    );

    const rowAfterCancel = await query('SELECT * FROM memberships WHERE id = $1;', [testMembershipId]);
    assert(rowAfterCancel.rows.length === 1, '    Cancelled membership row persists in database for audit history');

    // 14. Cancellation stores reason and preserves history
    assert(
      rowAfterCancel.rows[0].cancellation_reason === cancelReason &&
        rowAfterCancel.rows[0].cancelled_at !== null &&
        rowAfterCancel.rows[0].started_at !== null &&
        rowAfterCancel.rows[0].payment_timestamp !== null,
      '14. Cancellation stores cancellation_reason and preserves started_at and payment_timestamp'
    );

    // 15. Renewal creates a new membership
    const renewRes = await fetch(`${baseUrl}/api/membership/${testMembershipId}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const renewBody = await renewRes.json();
    assert(
      renewRes.status === 201 &&
        renewBody.success === true &&
        renewBody.data.id !== testMembershipId &&
        renewBody.data.status === 'pending',
      '15. Renewal creates a new membership record in pending status'
    );
    renewedMembershipId = renewBody.data.id;

    // 16. Old membership remains unchanged
    const oldRowAfterRenew = await query('SELECT * FROM memberships WHERE id = $1;', [testMembershipId]);
    assert(
      oldRowAfterRenew.rows[0].status === 'cancelled' &&
        oldRowAfterRenew.rows[0].cancellation_reason === cancelReason,
      '16. Old membership remains unchanged and intact after renewal'
    );

    // 17. New membership links through: renewed_from_membership_id
    assert(
      renewBody.data.renewed_from_membership_id === testMembershipId,
      '17. New membership links through renewed_from_membership_id'
    );

    // 18. Membership history returns both records
    const historyRes = await fetch(`${baseUrl}/api/membership/${testUserId}/history`);
    const historyBody = await historyRes.json();
    assert(
      historyRes.status === 200 &&
        historyBody.success === true &&
        historyBody.data.length >= 2 &&
        historyBody.data[0].id === renewedMembershipId &&
        historyBody.data[1].id === testMembershipId,
      '18. Membership history returns both historical records ordered newest first'
    );

    // 19. Dashboard counts are correct
    const dashboardRes = await fetch(`${baseUrl}/api/membership/dashboard`);
    const dashboardBody = await dashboardRes.json();
    const d = dashboardBody.data;
    assert(
      dashboardRes.status === 200 &&
        dashboardBody.success === true &&
        typeof d.total_active === 'number' &&
        typeof d.expiring_7_days === 'number' &&
        typeof d.expiring_30_days === 'number' &&
        typeof d.expired === 'number' &&
        typeof d.pending === 'number' &&
        typeof d.cancelled === 'number' &&
        d.total_active >= 2 &&
        d.pending >= 1 &&
        d.expired >= 2 &&
        d.cancelled >= 1,
      '19. Dashboard counts are correctly aggregated from PostgreSQL database'
    );

    // 20. Expiring-within-7-days query works
    const expiring7Res = await membershipRepository.getExpiringMemberships(7);
    const taraIn7 = expiring7Res.find((m) => m.member_code === 'SKY-MEM-002-TARA');
    assert(
      taraIn7 !== undefined,
      '20. Expiring-within-7-days query accurately captures membership expiring in 5 days (Tara Treasurer)'
    );

    // 21. Expiring-within-30-days query works
    const expiring30Res = await membershipRepository.getExpiringMemberships(30);
    const taraIn30 = expiring30Res.find((m) => m.member_code === 'SKY-MEM-002-TARA');
    assert(
      taraIn30 !== undefined,
      '21. Expiring-within-30-days query accurately captures expiring memberships'
    );

    // Clean up test records
    await query('DELETE FROM transactions WHERE source_type = \'dues\' AND source_id IN ($1, $2);', [testMembershipId, renewedMembershipId]);
    await query('DELETE FROM memberships WHERE user_id = $1;', [testUserId]);
    await query('DELETE FROM users WHERE id = $1;', [testUserId]);

    console.log('\n====================================================');
    console.log(`MEMBERSHIP TEST SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal membership test error:', err);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

runMembershipTests();
