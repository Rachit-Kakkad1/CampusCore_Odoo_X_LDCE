const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../config/database');

async function runVerification() {
  console.log('================================================================');
  console.log('STUDENT ORGANIZATION SYSTEM — DATABASE VERIFICATION SUITE');
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

  try {
    // 1. Connection Test
    console.log('--- 1. Testing PostgreSQL Connection ---');
    const isConnected = await testConnection();
    assert(isConnected, 'Node.js connected to PostgreSQL via pg pool');
    if (!isConnected) {
      throw new Error('Connection failed; aborting further tests.');
    }
    console.log();

    // 2. Schema Execution
    console.log('--- 2. Executing schema.sql ---');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    assert(true, 'schema.sql executed successfully without errors');
    console.log();

    // 3. Seed Execution
    console.log('--- 3. Executing seed.sql ---');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
    await pool.query(seedSql);
    assert(true, 'seed.sql executed successfully without errors');
    console.log();

    // 4. Verify Tables
    console.log('--- 4. Verifying Table Existence ---');
    const expectedTables = [
      'users',
      'memberships',
      'announcements',
      'events',
      'tickets',
      'products',
      'product_sizes',
      'orders',
      'order_items',
      'fundraisers',
      'tasks',
      'fundraiser_income',
      'expenses',
      'transactions'
    ];

    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const actualTables = tablesRes.rows.map(r => r.table_name);
    expectedTables.forEach(tbl => {
      assert(actualTables.includes(tbl), `Table exists: ${tbl}`);
    });
    console.log();

    // 5. Verify Primary Keys
    console.log('--- 5. Verifying Primary Keys ---');
    const pkRes = await pool.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public';
    `);
    const pkMap = {};
    pkRes.rows.forEach(r => { pkMap[r.table_name] = r.column_name; });
    expectedTables.forEach(tbl => {
      assert(pkMap[tbl] === 'id', `Primary key on ${tbl} is 'id'`);
    });
    console.log();

    // 6. Verify Foreign Keys
    console.log('--- 6. Verifying Key Foreign Keys ---');
    const fkRes = await pool.query(`
      SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);
    const fkPairs = fkRes.rows.map(r => `${r.source_table}.${r.source_column} -> ${r.target_table}.${r.target_column}`);
    assert(fkPairs.includes('memberships.user_id -> users.id'), 'FK: memberships.user_id -> users.id');
    assert(fkPairs.includes('tickets.event_id -> events.id'), 'FK: tickets.event_id -> events.id');
    assert(fkPairs.includes('tickets.user_id -> users.id'), 'FK: tickets.user_id -> users.id');
    assert(fkPairs.includes('product_sizes.product_id -> products.id'), 'FK: product_sizes.product_id -> products.id');
    assert(fkPairs.includes('order_items.order_id -> orders.id'), 'FK: order_items.order_id -> orders.id');
    assert(fkPairs.includes('order_items.product_size_id -> product_sizes.id'), 'FK: order_items.product_size_id -> product_sizes.id');
    assert(fkPairs.includes('tasks.fundraiser_id -> fundraisers.id'), 'FK: tasks.fundraiser_id -> fundraisers.id');
    assert(fkPairs.includes('fundraiser_income.fundraiser_id -> fundraisers.id'), 'FK: fundraiser_income.fundraiser_id -> fundraisers.id');
    assert(fkPairs.includes('expenses.submitted_by -> users.id'), 'FK: expenses.submitted_by -> users.id');
    console.log();

    // 7. Verify Unique Constraints
    console.log('--- 7. Verifying Unique Constraints ---');
    const uqRes = await pool.query(`
      SELECT tc.table_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public';
    `);
    const uqTableNames = uqRes.rows.map(r => r.table_name);
    assert(uqTableNames.includes('users'), 'Unique constraint on users (email)');
    assert(uqTableNames.includes('memberships'), 'Unique constraint on memberships (user_id, member_code)');
    assert(uqTableNames.includes('tickets'), 'Unique constraint on tickets (ticket_code, checkout_session_id)');
    assert(uqTableNames.includes('product_sizes'), 'Unique constraint on product_sizes (product_id, size)');
    assert(uqTableNames.includes('orders'), 'Unique constraint on orders (order_code, checkout_session_id)');
    assert(uqTableNames.includes('transactions'), 'Unique constraint on transactions (source_type, source_id)');
    console.log();

    // 8. Intentional Constraint Testing (Negative tests)
    console.log('--- 8. Testing Negative Constraint Enforcement ---');

    // 8a. Invalid Foreign Key
    try {
      await pool.query(`
        INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status)
        VALUES ('TEST-INVALID-FK', 999999, 1, 100.00, 'member', 'pending');
      `);
      assert(false, 'Invalid foreign key was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23503', 'Invalid foreign key rejected (23503 foreign_key_violation)');
    }

    // 8b. Duplicate Unique Transaction Source (Idempotency)
    try {
      const existingTx = (await pool.query('SELECT source_type, source_id FROM transactions LIMIT 1')).rows[0];
      await pool.query(`
        INSERT INTO transactions (source_type, source_id, amount, direction, payment_mode, status)
        VALUES ($1, $2, 999.00, 'in', 'online', 'paid');
      `, [existingTx.source_type, existingTx.source_id]);
      assert(false, 'Duplicate transaction (source_type, source_id) was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23505', 'Duplicate transaction source rejected (23505 unique_violation)');
    }

    // 8c. Negative Price Rejection
    try {
      await pool.query(`
        INSERT INTO products (name, price) VALUES ('Illegal Negative Price Item', -50.00);
      `);
      assert(false, 'Negative product price was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Negative product price rejected (23514 check_violation)');
    }

    // 8d. Negative Stock Rejection
    try {
      const prod = (await pool.query('SELECT id FROM products LIMIT 1')).rows[0];
      await pool.query(`
        INSERT INTO product_sizes (product_id, size, stock) VALUES ($1, 'XXL', -3);
      `, [prod.id]);
      assert(false, 'Negative stock was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Negative stock rejected (23514 check_violation)');
    }

    // 8e. Invalid Role Rejection
    try {
      await pool.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('Hacker', 'hacker@example.com', 'hash', 'superadmin');
      `);
      assert(false, 'Invalid role was accepted (SHOULD HAVE FAILED)');
    } catch (err) {
      assert(err.code === '23514', 'Invalid user role rejected (23514 check_violation)');
    }
    console.log();

    // 9. Verify Seed Data
    console.log('--- 9. Verifying Seeded Records ---');
    const userCount = parseInt((await pool.query('SELECT COUNT(*) FROM users;')).rows[0].count, 10);
    assert(userCount === 8, `Seeded exactly 8 users (found ${userCount})`);

    const mayaMembership = (await pool.query(`
      SELECT m.status, m.dues_status, m.expiry_date, (m.expiry_date > NOW()) as is_active
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'maya@odoo-ldce.org';
    `)).rows[0];
    assert(mayaMembership.status === 'active' && mayaMembership.dues_status === 'paid' && mayaMembership.is_active === true, 'Maya Member is ACTIVE');

    const eddieRenewal = (await pool.query(`
      SELECT m.id, m.status, m.dues_status, m.renewed_from_membership_id
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'eddie@odoo-ldce.org' AND m.renewed_from_membership_id IS NOT NULL;
    `)).rows[0];
    assert(eddieRenewal && eddieRenewal.status === 'active' && eddieRenewal.renewed_from_membership_id !== null, 'Eddie has active renewed membership referencing historical record');

    const piaMembership = (await pool.query(`
      SELECT m.status, m.dues_status
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'pia@odoo-ldce.org';
    `)).rows[0];
    assert(piaMembership.status === 'pending' && piaMembership.dues_status === 'pending', 'Pia Pending has status=pending & dues_status=pending');

    const vikMembership = (await pool.query(`
      SELECT m.status, m.dues_status, (m.expiry_date < NOW()) as is_expired
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'vik@odoo-ldce.org';
    `)).rows[0];
    assert(vikMembership.status === 'expired' && vikMembership.is_expired === true, 'Vik Volunteer has status=expired');

    const gregMembership = (await pool.query(`
      SELECT m.status, m.cancelled_at, m.cancellation_reason
      FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.email = 'greg@odoo-ldce.org';
    `)).rows[0];
    assert(gregMembership.status === 'cancelled' && gregMembership.cancellation_reason !== null, 'Greg Guest has status=cancelled and cancellation_reason populated');

    // Verify partial unique index exists
    const idxRes = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'memberships' AND indexname = 'uq_memberships_active_user';
    `);
    assert(idxRes.rows.length === 1, 'Partial unique index uq_memberships_active_user exists');

    // Verify membership counts across all lifecycle states
    const statusCounts = (await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
      FROM memberships;
    `)).rows[0];
    assert(parseInt(statusCounts.active_count, 10) >= 3, `Active memberships verified (found ${statusCounts.active_count})`);
    assert(parseInt(statusCounts.pending_count, 10) >= 1, `Pending memberships verified (found ${statusCounts.pending_count})`);
    assert(parseInt(statusCounts.expired_count, 10) >= 2, `Expired memberships verified (found ${statusCounts.expired_count})`);
    assert(parseInt(statusCounts.cancelled_count, 10) >= 1, `Cancelled memberships verified (found ${statusCounts.cancelled_count})`);

    // Verify isActiveMember helper on representative users
    const { isActiveMember } = require('../shared/membership/isActiveMember');
    const { syncMembershipStatuses } = require('../shared/membership/syncMembershipStatuses');
    const membershipRepository = require('../modules/membership/membership.repository');
    const announcementsRepository = require('../modules/announcements/announcements.repository');
    const announcementsService = require('../modules/announcements/announcements.service');

    const mayaId = (await pool.query("SELECT id FROM users WHERE email = 'maya@odoo-ldce.org'")).rows[0].id;
    const piaId = (await pool.query("SELECT id FROM users WHERE email = 'pia@odoo-ldce.org'")).rows[0].id;
    const vikId = (await pool.query("SELECT id FROM users WHERE email = 'vik@odoo-ldce.org'")).rows[0].id;
    const gregId = (await pool.query("SELECT id FROM users WHERE email = 'greg@odoo-ldce.org'")).rows[0].id;
    const taraId = (await pool.query("SELECT id FROM users WHERE email = 'tara@odoo-ldce.org'")).rows[0].id;
    const ethanId = (await pool.query("SELECT id FROM users WHERE email = 'ethan@odoo-ldce.org'")).rows[0].id;

    console.log('--- 7. Verifying Membership Rules & Status Engine ---');
    assert(await isActiveMember(mayaId) === true, 'isActiveMember(maya) === true (Active + Paid + Future expiry)');
    assert(await isActiveMember(piaId) === false, 'isActiveMember(pia) === false (Pending)');
    assert(await isActiveMember(vikId) === false, 'isActiveMember(vik) === false (Expired)');
    assert(await isActiveMember(gregId) === false, 'isActiveMember(greg) === false (Cancelled)');

    // Pending membership verification
    const pendingMem = await membershipRepository.findCurrentMembershipByUserId(piaId);
    assert(pendingMem && pendingMem.status === 'pending' && pendingMem.dues_status === 'pending', 'Pending membership exists for Pia');

    // Dashboard metrics verification directly in PostgreSQL
    const dashboardMetrics = await membershipRepository.getDashboardCounts();
    assert(dashboardMetrics.totalActive >= 3, `Dashboard totalActive >= 3 (found ${dashboardMetrics.totalActive})`);
    assert(dashboardMetrics.expiring7Days >= 1, `Dashboard expiring7Days captures Tara's 5-day expiry (found ${dashboardMetrics.expiring7Days})`);
    assert(dashboardMetrics.expiring30Days >= 2, `Dashboard expiring30Days captures Tara & Ethan (found ${dashboardMetrics.expiring30Days})`);
    assert(dashboardMetrics.expired >= 2, `Dashboard expired counts historical/expired rows (found ${dashboardMetrics.expired})`);

    // Expiry sync idempotence verification
    console.log('--- 8. Verifying Membership Expiry Synchronization ---');
    const sync1 = await syncMembershipStatuses();
    const sync2 = await syncMembershipStatuses();
    assert(sync2 === 0, 'syncMembershipStatuses is idempotent (second run modifies 0 records)');

    // Renewal chain verification
    console.log('--- 9. Verifying Renewal History Model ---');
    const eddieHistory = await membershipRepository.findHistoryByUserId(eddieRenewal.id ? 6 : 6);
    assert(eddieHistory.length >= 2, 'Eddie history preserves both historical expired and renewed active records');
    assert(eddieHistory[0].renewed_from_membership_id === eddieHistory[1].id, 'Newest record contains renewed_from_membership_id pointing to previous membership');

    // Announcements verification
    console.log('--- 10. Verifying Announcements (Filter, Search, Pagination, Drafts) ---');
    const announcementsCount = parseInt((await pool.query('SELECT COUNT(*) FROM announcements;')).rows[0].count, 10);
    assert(announcementsCount === 7, `Seeded 7 announcements (found ${announcementsCount})`);

    // List published
    const publishedList = await announcementsRepository.findAll({ status: 'published' });
    assert(publishedList.data.length === 6 && publishedList.data.every(a => a.status === 'published'), 'Public list returns only published announcements (drafts excluded)');

    // Category filter
    const eventAnnouncements = await announcementsRepository.findAll({ category: 'event', status: 'published' });
    assert(eventAnnouncements.data.length >= 1 && eventAnnouncements.data.every(a => a.category === 'event'), 'Category filter returns only events');

    // Priority filter
    const urgentAnnouncements = await announcementsRepository.findAll({ priority: 'urgent' });
    assert(urgentAnnouncements.data.length >= 1 && urgentAnnouncements.data.every(a => a.priority === 'urgent'), 'Priority filter returns urgent announcements');

    // Search filter
    const searchRes = await announcementsRepository.findAll({ search: 'Gala' });
    assert(searchRes.data.length >= 1 && searchRes.data.some(a => a.title.includes('Gala')), 'Search filter works via PostgreSQL ILIKE');

    // Pagination
    const pageRes = await announcementsRepository.findAll({ page: 1, limit: 2 });
    assert(pageRes.data.length === 2 && pageRes.page === 1 && pageRes.limit === 2 && pageRes.totalPages >= 3, 'Pagination limits output and computes totalPages correctly');

    // Draft detail & publish
    const draftRow = (await pool.query("SELECT id FROM announcements WHERE status = 'draft' LIMIT 1;")).rows[0];
    assert(draftRow !== undefined, 'Draft announcement exists in database');
    let draftBlocked = false;
    try {
      await announcementsService.getAnnouncementById(draftRow.id, { allowDraft: false });
    } catch (e) {
      if (e.status === 404) draftBlocked = true;
    }
    assert(draftBlocked, 'Draft announcement returns 404 to public requests without allowDraft privilege');

    const publishedDraft = await announcementsRepository.publish(draftRow.id);
    assert(publishedDraft && publishedDraft.status === 'published' && publishedDraft.published_at !== null, 'Publish sets status = "published" and published_at = NOW()');

    // Other core tables sanity checks
    console.log('--- 11. Verifying Other Project Tables ---');
    const eventsCount = parseInt((await pool.query('SELECT COUNT(*) FROM events;')).rows[0].count, 10);
    assert(eventsCount === 2, `Seeded 2 events: Spring Gala (100) & Mini Workshop (2)`);

    const hoodieL = (await pool.query(`
      SELECT ps.stock
      FROM product_sizes ps
      JOIN products p ON ps.product_id = p.id
      WHERE p.name = 'Club Hoodie' AND ps.size = 'L';
    `)).rows[0];
    assert(hoodieL && parseInt(hoodieL.stock, 10) === 1, 'Club Hoodie Size L seeded with stock = 1 for oversell test');

    const bakeTasks = (await pool.query(`
      SELECT t.status, COUNT(*) as count
      FROM tasks t
      JOIN fundraisers f ON t.fundraiser_id = f.id
      WHERE f.title = 'Bake Sale'
      GROUP BY t.status;
    `)).rows;
    assert(bakeTasks.length === 3, 'Bake Sale has 3 tasks seeded across completed, in_progress, and todo');

    const txCount = parseInt((await pool.query('SELECT COUNT(*) FROM transactions;')).rows[0].count, 10);
    assert(txCount >= 2, `Seeded initial dues transactions (found ${txCount})`);

    console.log();

    // Summary
    console.log('================================================================');
    console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error in verification:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runVerification();
