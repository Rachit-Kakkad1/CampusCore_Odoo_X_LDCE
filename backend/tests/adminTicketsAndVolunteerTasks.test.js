// backend/tests/adminTicketsAndVolunteerTasks.test.js
const assert = require('assert');
const http = require('http');
const app = require('../app');
const { pool } = require('../config/database');

function request(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: server.address().port,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  let server;
  let passed = 0;
  let failed = 0;

  function pass(msg) {
    console.log(`[PASS] ${msg}`);
    passed++;
  }

  function fail(msg, err) {
    console.error(`[FAIL] ${msg}`);
    if (err) console.error(err);
    failed++;
  }

  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    console.log(`\n================================================================`);
    console.log(`ADMIN TICKETS, VOLUNTEER TASKS & PROFILE TEST SUITE`);
    console.log(`================================================================\n`);

    const timestamp = Date.now();

    // 1. Setup Identities: Admin, Event Manager A, Event Manager B, Volunteer A, Volunteer B, Member A
    const adminEmail = `admin_tck_${timestamp}@odoo-ldce.org`;
    const emAEmail = `ema_tck_${timestamp}@odoo-ldce.org`;
    const emBEmail = `emb_tck_${timestamp}@odoo-ldce.org`;
    const volAEmail = `vola_tck_${timestamp}@odoo-ldce.org`;
    const volBEmail = `volb_tck_${timestamp}@odoo-ldce.org`;
    const memberEmail = `mem_tck_${timestamp}@odoo-ldce.org`;
    const password = 'Password@123';

    // Register Member and activate membership
    const regRes = await request(server, { path: '/api/auth/register', method: 'POST' }, {
      name: 'Member Alice',
      email: memberEmail,
      password,
    });
    const memberToken = regRes.data.token;
    const memberId = regRes.data.user.id;

    // Activate Alice's membership to active/paid
    await pool.query(
      `UPDATE memberships SET status = 'active', dues_status = 'paid', started_at = NOW(), expiry_date = NOW() + INTERVAL '1 year' WHERE user_id = $1;`,
      [memberId]
    );

    // Create Admin, Event Managers & Volunteers via Admin API
    // First create admin user directly in DB
    const bcrypt = require('bcryptjs');
    const pwdHash = await bcrypt.hash(password, 10);
    const adminInsert = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1, $2, $3, 'admin', '9876543210') RETURNING id, name, email, role, phone;`,
      ['Admin Chief', adminEmail, pwdHash]
    );
    const adminId = adminInsert.rows[0].id;

    // Login Admin to get Token
    const adminLogin = await request(server, { path: '/api/auth/login', method: 'POST' }, {
      email: adminEmail,
      password,
    });
    const adminToken = adminLogin.data.token;
    assert.strictEqual(adminLogin.status, 200);

    // Admin creates Event Manager A
    const emACreate = await request(server, {
      path: '/api/users',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Manager Arthur',
      email: emAEmail,
      password,
      role: 'event_manager',
    });
    assert.strictEqual(emACreate.status, 201);
    const emAId = emACreate.data.user.id;

    // Admin creates Event Manager B
    const emBCreate = await request(server, {
      path: '/api/users',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Manager Boris',
      email: emBEmail,
      password,
      role: 'event_manager',
    });
    const emBId = emBCreate.data.user.id;

    // Admin creates Volunteer A
    const volACreate = await request(server, {
      path: '/api/users',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Volunteer Victor',
      email: volAEmail,
      password,
      role: 'volunteer',
    });
    assert.strictEqual(volACreate.status, 201);
    const volAId = volACreate.data.user.id;

    // Admin creates Volunteer B
    const volBCreate = await request(server, {
      path: '/api/users',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Volunteer Wendy',
      email: volBEmail,
      password,
      role: 'volunteer',
    });
    const volBId = volBCreate.data.user.id;

    // Log in EM A, EM B, Vol A, Vol B
    const emALogin = await request(server, { path: '/api/auth/login', method: 'POST' }, { email: emAEmail, password });
    const emAToken = emALogin.data.token;

    const emBLogin = await request(server, { path: '/api/auth/login', method: 'POST' }, { email: emBEmail, password });
    const emBToken = emBLogin.data.token;

    const volALogin = await request(server, { path: '/api/auth/login', method: 'POST' }, { email: volAEmail, password });
    const volAToken = volALogin.data.token;

    const volBLogin = await request(server, { path: '/api/auth/login', method: 'POST' }, { email: volBEmail, password });
    const volBToken = volBLogin.data.token;

    console.log('--- 1. Testing Admin Volunteer Creation & Unique Email Validation ---');
    // Test duplicate email
    const dupRes = await request(server, {
      path: '/api/users',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      name: 'Duplicate Guy',
      email: volAEmail,
      password,
      role: 'volunteer',
    });
    assert.strictEqual(dupRes.status, 409);
    pass('Duplicate volunteer email rejected with 409 Conflict');

    // Test password hashing
    const dbVol = await pool.query('SELECT password_hash FROM users WHERE id = $1;', [volAId]);
    assert.notStrictEqual(dbVol.rows[0].password_hash, password);
    assert.ok(dbVol.rows[0].password_hash.startsWith('$2'));
    pass('Volunteer password is appropriately hashed with bcrypt (never plaintext)');

    console.log('\n--- 2. Testing Events Setup & Ticket Purchases (Member + Guest) ---');
    // Create Event 1 (Managed by EM A)
    const event1Res = await request(server, {
      path: '/api/events',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      title: `Grand Tech Symposium ${timestamp}`,
      venue: 'Main Auditorium',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      capacity: 100,
      member_price: 150.00,
      non_member_price: 300.00,
      volunteers_enabled: true,
      volunteers_required: 5,
      event_manager_id: emAId,
    });
    assert.strictEqual(event1Res.status, 201);
    const event1Id = event1Res.data.event.id;
    pass('Admin created Event 1 assigned to Event Manager A');

    // Create Event 2 (Managed by EM B)
    const event2Res = await request(server, {
      path: '/api/events',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    }, {
      title: `Cultural Gala Night ${timestamp}`,
      venue: 'Open Amphitheatre',
      starts_at: new Date(Date.now() + 172800000).toISOString(),
      capacity: 50,
      member_price: 100.00,
      non_member_price: 250.00,
      volunteers_enabled: true,
      volunteers_required: 4,
      event_manager_id: emBId,
    });
    const event2Id = event2Res.data.event.id;
    pass('Admin created Event 2 assigned to Event Manager B');

    // Member purchases ticket for Event 1
    const tck1Checkout = await request(server, {
      path: `/api/events/${event1Id}/tickets`,
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.strictEqual(tck1Checkout.status, 201);
    const tck1Id = tck1Checkout.data.id;

    const tck1Pay = await request(server, {
      path: `/api/tickets/${tck1Id}/pay`,
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.strictEqual(tck1Pay.status, 200);
    pass('Member purchased and paid for Event 1 ticket');

    // Guest purchases ticket for Event 1
    const guestData = {
      name: 'Guest Gregory',
      email: `gregory_${timestamp}@guest.com`,
      mobile: '+91 9988776655',
    };
    const guestTckCheckout = await request(server, {
      path: `/api/events/${event1Id}/tickets`,
      method: 'POST',
    }, {
      attendee: guestData,
    });
    assert.strictEqual(guestTckCheckout.status, 201);
    const guestTckId = guestTckCheckout.data.id;

    const guestTckPay = await request(server, {
      path: `/api/tickets/${guestTckId}/pay`,
      method: 'POST',
    });
    assert.strictEqual(guestTckPay.status, 200);
    pass('Guest attendee booked and paid for Event 1 ticket');

    console.log('\n--- 3. Testing Admin Ticket Management & Query Capabilities ---');
    // 3a. Admin lists all tickets
    const adminTckList = await request(server, {
      path: '/api/admin/tickets?page=1&pageSize=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminTckList.status, 200);
    assert.ok(adminTckList.data.tickets.length >= 2);
    assert.strictEqual(adminTckList.data.page, 1);
    assert.ok(adminTckList.data.totalItems >= 2);
    pass('Admin can list all platform tickets with real pagination metadata');

    // 3b. Verify Member ticket fields
    const memberTckRow = adminTckList.data.tickets.find(t => t.id === tck1Id);
    assert.ok(memberTckRow);
    assert.strictEqual(memberTckRow.buyer_type, 'MEMBER');
    assert.strictEqual(memberTckRow.buyer_name, 'Member Alice');
    assert.strictEqual(memberTckRow.buyer_email, memberEmail);
    assert.strictEqual(memberTckRow.payment_status, 'paid');
    assert.strictEqual(parseFloat(memberTckRow.price), 150.00);
    assert.ok(!memberTckRow.password_hash);
    pass('Member ticket row correctly derives member information without exposing secrets');

    // 3c. Verify Guest ticket fields
    const guestTckRow = adminTckList.data.tickets.find(t => t.id === guestTckId);
    assert.ok(guestTckRow);
    assert.strictEqual(guestTckRow.buyer_type, 'GUEST');
    assert.strictEqual(guestTckRow.buyer_name, 'Guest Gregory');
    assert.strictEqual(guestTckRow.buyer_email, `gregory_${timestamp}@guest.com`);
    assert.strictEqual(guestTckRow.buyer_phone, '+91 9988776655');
    assert.strictEqual(parseFloat(guestTckRow.price), 300.00);
    pass('Guest ticket row correctly preserves guest buyer name, email, and mobile');

    // 3d. Search tickets
    const searchRes = await request(server, {
      path: `/api/admin/tickets?search=${guestData.email}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(searchRes.status, 200);
    assert.strictEqual(searchRes.data.tickets.length, 1);
    assert.strictEqual(searchRes.data.tickets[0].id, guestTckId);
    pass('Parameterized search finds ticket by buyer email');

    // 3e. Filter tickets by buyer_type=MEMBER
    const filterMemberRes = await request(server, {
      path: `/api/admin/tickets?buyer_type=MEMBER`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(filterMemberRes.status, 200);
    assert.ok(filterMemberRes.data.tickets.every(t => t.buyer_type === 'MEMBER'));
    pass('Filtering by buyer_type=MEMBER works accurately');

    // 3f. Detailed Ticket View with Audit Trail
    const detailRes = await request(server, {
      path: `/api/admin/tickets/${tck1Id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.data.ticket.id, tck1Id);
    assert.ok(Array.isArray(detailRes.data.ticket.audit_logs));
    pass('Admin single ticket detailed view returns ticket and associated audit logs');

    // 3g. Unauthorized access check
    const unauthorizedTck = await request(server, {
      path: '/api/admin/tickets',
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.strictEqual(unauthorizedTck.status, 403);
    pass('Non-admin member rejected from admin ticket management (403 Forbidden)');

    // 3h. Event Manager scoped access
    const emATckList = await request(server, {
      path: '/api/admin/tickets',
      method: 'GET',
      headers: { Authorization: `Bearer ${emAToken}` },
    });
    assert.strictEqual(emATckList.status, 200);
    assert.ok(emATckList.data.tickets.every(t => t.event_id === event1Id));
    pass('Event Manager A only receives tickets for their assigned Event 1');

    console.log('\n--- 4. Testing Volunteer Event Applications & Approval Workflow ---');
    // Volunteer A applies for Event 1
    const applyRes = await request(server, {
      path: `/api/events/${event1Id}/volunteers/apply`,
      method: 'POST',
      headers: { Authorization: `Bearer ${volAToken}` },
    });
    assert.strictEqual(applyRes.status, 201);
    const applicationId = applyRes.data.application.id;
    pass('Volunteer A applied to Event 1 with status PENDING');

    // Event Manager A approves Volunteer A
    const approveRes = await request(server, {
      path: `/api/events/${event1Id}/volunteers/${applicationId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emAToken}` },
    }, {
      status: 'approved',
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.application.status, 'approved');
    pass('Event Manager A approved Volunteer A application');

    console.log('\n--- 5. Testing Volunteer Task Assignment & Scoping ---');
    // 5a. Event Manager A creates task for approved Volunteer A
    const task1Create = await request(server, {
      path: '/api/tasks',
      method: 'POST',
      headers: { Authorization: `Bearer ${emAToken}` },
    }, {
      title: 'Setup Registration Desk',
      description: 'Check attendee credentials and hand out badges at Entrance Gate 1',
      event_id: event1Id,
      assignee_id: volAId,
      priority: 'HIGH',
      due_date: new Date(Date.now() + 3600000).toISOString(),
    });
    assert.strictEqual(task1Create.status, 201);
    const task1Id = task1Create.data.id;
    assert.strictEqual(task1Create.data.status, 'PENDING');
    pass('Event Manager A created and assigned task to approved Volunteer A');

    // 5b. Verify in-app notification created for Volunteer A
    const notifRes = await request(server, {
      path: '/api/notifications',
      method: 'GET',
      headers: { Authorization: `Bearer ${volAToken}` },
    });
    assert.strictEqual(notifRes.status, 200);
    const notifs = notifRes.data.notifications || notifRes.data.data || [];
    assert.ok(notifs.some(n => n.type === 'task_assigned'));
    pass('In-app notification generated for Volunteer A upon task assignment');

    // 5c. Reject task creation if volunteer is NOT approved for the event
    const unapprovedTaskCreate = await request(server, {
      path: '/api/tasks',
      method: 'POST',
      headers: { Authorization: `Bearer ${emAToken}` },
    }, {
      title: 'Unapproved Volunteer Task',
      event_id: event1Id,
      assignee_id: volBId, // Volunteer B is not applied/approved
      priority: 'MEDIUM',
    });
    assert.strictEqual(unapprovedTaskCreate.status, 400);
    assert.strictEqual(unapprovedTaskCreate.data.error, 'VOLUNTEER_NOT_APPROVED_FOR_EVENT');
    pass('Backend validates volunteer is approved for the event before allowing task assignment');

    // 5d. Event Manager B cannot create tasks for Event Manager A event
    const unauthorizedEventTask = await request(server, {
      path: '/api/tasks',
      method: 'POST',
      headers: { Authorization: `Bearer ${emBToken}` },
    }, {
      title: 'Sneaky Task',
      event_id: event1Id,
      assignee_id: volAId,
      priority: 'LOW',
    });
    assert.strictEqual(unauthorizedEventTask.status, 403);
    pass('Event Manager B rejected when attempting to create tasks for Event 1 (403 Forbidden)');

    console.log('\n--- 6. Testing Volunteer Task Execution & Concurrency Protection ---');
    // 6a. Volunteer A retrieves "MY TASKS"
    const myTasksRes = await request(server, {
      path: '/api/tasks/mine',
      method: 'GET',
      headers: { Authorization: `Bearer ${volAToken}` },
    });
    assert.strictEqual(myTasksRes.status, 200);
    const myTasksList = Array.isArray(myTasksRes.data) ? myTasksRes.data : myTasksRes.data.tasks;
    assert.ok(myTasksList.some(t => t.id === task1Id));
    pass('Volunteer A can view their assigned task in MY TASKS');

    // 6b. Volunteer B cannot see Volunteer A tasks
    const volBOwnTasks = await request(server, {
      path: '/api/tasks/mine',
      method: 'GET',
      headers: { Authorization: `Bearer ${volBToken}` },
    });
    const volBList = Array.isArray(volBOwnTasks.data) ? volBOwnTasks.data : volBOwnTasks.data.tasks;
    assert.ok(!volBList.some(t => t.id === task1Id));
    pass('Volunteer B does NOT see Volunteer A tasks in MY TASKS');

    // 6c. Volunteer A starts task -> IN_PROGRESS
    const startTaskRes = await request(server, {
      path: `/api/tasks/${task1Id}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volAToken}` },
    }, {
      status: 'IN_PROGRESS',
    });
    assert.strictEqual(startTaskRes.status, 200);
    assert.strictEqual(startTaskRes.data.status, 'IN_PROGRESS');
    pass('Volunteer A transitioned task from PENDING to IN_PROGRESS');

    // 6d. Volunteer B cannot complete Volunteer A task
    const hijackRes = await request(server, {
      path: `/api/tasks/${task1Id}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volBToken}` },
    }, {
      status: 'COMPLETED',
    });
    assert.strictEqual(hijackRes.status, 403);
    pass('Volunteer B rejected when trying to modify Volunteer A task (403 Forbidden)');

    // 6e. Volunteer A marks task as COMPLETED
    const completeTaskRes = await request(server, {
      path: `/api/tasks/${task1Id}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volAToken}` },
    }, {
      status: 'COMPLETED',
    });
    assert.strictEqual(completeTaskRes.status, 200);
    assert.strictEqual(completeTaskRes.data.status, 'COMPLETED');
    assert.ok(completeTaskRes.data.completed_at);
    assert.strictEqual(completeTaskRes.data.completed_by, volAId);
    pass('Volunteer A marked task COMPLETED with completed_at timestamp and completed_by audit ID');

    // 6f. Duplicate completion / double-click protection
    const dupCompleteRes = await request(server, {
      path: `/api/tasks/${task1Id}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volAToken}` },
    }, {
      status: 'COMPLETED',
    });
    assert.strictEqual(dupCompleteRes.status, 409);
    assert.strictEqual(dupCompleteRes.data.error, 'TASK_ALREADY_COMPLETED');
    pass('Duplicate task completion attempt handled safely (409 TASK_ALREADY_COMPLETED)');

    // 6g. Verify audit log entry for task completion
    const auditLogs = await pool.query(
      `SELECT * FROM audit_logs WHERE entity_type = 'task' AND entity_id = $1 AND action = 'VOLUNTEER_TASK_COMPLETED';`,
      [task1Id]
    );
    assert.strictEqual(auditLogs.rows.length >= 1, true);
    pass('Audit log entry VOLUNTEER_TASK_COMPLETED verified in database');


    console.log('\n--- 7. Testing Event Volunteer Roster Real Task Aggregation ---');
    const rosterRes = await request(server, {
      path: `/api/events/${event1Id}/volunteers`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(rosterRes.status, 200);
    const volARosterRow = rosterRes.data.volunteers.find(v => v.user_id === volAId);
    assert.ok(volARosterRow);
    assert.strictEqual(volARosterRow.task_count, 1);
    assert.strictEqual(volARosterRow.completed_tasks, 1);
    assert.strictEqual(volARosterRow.pending_tasks, 0);
    pass('Event volunteer roster returns real aggregated task metrics (1 total, 1 completed, 0 pending)');

    console.log('\n--- 8. Testing User Profile Self-Management & Password Security ---');
    // 8a. Retrieve own profile
    const getProfileRes = await request(server, {
      path: '/api/profile',
      method: 'GET',
      headers: { Authorization: `Bearer ${volAToken}` },
    });
    assert.strictEqual(getProfileRes.status, 200);
    assert.strictEqual(getProfileRes.data.user.id, volAId);
    pass('Volunteer can retrieve own profile via GET /api/profile');

    // 8b. Update own profile (name & phone)
    const updateProfileRes = await request(server, {
      path: '/api/profile',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volAToken}` },
    }, {
      name: 'Victor Vance Senior',
      phone: '+91 9123456780',
    });
    assert.strictEqual(updateProfileRes.status, 200);
    assert.strictEqual(updateProfileRes.data.user.name, 'Victor Vance Senior');
    assert.strictEqual(updateProfileRes.data.user.phone, '+91 9123456780');
    pass('Volunteer updated own profile name and phone via PATCH /api/profile');

    // 8c. Password change workflow
    const changePwdRes = await request(server, {
      path: '/api/profile/password',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volAToken}` },
    }, {
      current_password: password,
      new_password: 'NewSecurePassword@456',
    });
    assert.strictEqual(changePwdRes.status, 200);
    pass('Volunteer successfully changed password via PATCH /api/profile/password');

    // 8d. Incorrect current password rejected
    const badPwdRes = await request(server, {
      path: '/api/profile/password',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${volAToken}` },
    }, {
      current_password: 'WrongCurrentPassword',
      new_password: 'AnotherPassword@789',
    });
    assert.strictEqual(badPwdRes.status, 400);
    assert.strictEqual(badPwdRes.data.error, 'INVALID_CURRENT_PASSWORD');
    pass('Incorrect current password is safe and rejected with 400 INVALID_CURRENT_PASSWORD');

    // 8e. New password login succeeds
    const newLoginRes = await request(server, {
      path: '/api/auth/login',
      method: 'POST',
    }, {
      email: volAEmail,
      password: 'NewSecurePassword@456',
    });
    assert.strictEqual(newLoginRes.status, 200);
    assert.ok(newLoginRes.data.token);
    pass('Volunteer successfully logged in using new password');

    console.log(`\n================================================================`);
    console.log(`ALL ADMIN TICKETS, VOLUNTEER TASKS & PROFILE TESTS PASSED`);
    console.log(`Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================\n`);
  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
