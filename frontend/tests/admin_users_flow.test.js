// frontend/tests/admin_users_flow.test.js
import { test, describe } from 'node:test';
import assert from 'node:assert';

const API_BASE = 'http://localhost:5000/api';

describe('Admin Users Management API & Routing Verification', async () => {
  let adminToken = '';
  let memberToken = '';
  let createdUserId = null;

  test('Admin authentication generates valid JWT token', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@odoo-ldce.org',
        password: 'password123',
      }),
    });
    assert.strictEqual(res.status, 200, 'Admin login should succeed with 200');
    const data = await res.json();
    assert.ok(data.token, 'Token should be returned');
    assert.strictEqual(data.user.role, 'admin', 'User role should be admin');
    adminToken = data.token;
  });

  test('Member authentication generates non-admin token', async () => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maya@odoo-ldce.org',
        password: 'password123',
      }),
    });
    assert.strictEqual(res.status, 200, 'Member login should succeed');
    const data = await res.json();
    memberToken = data.token;
    assert.strictEqual(data.user.role, 'member', 'Role should be member');
  });

  test('Non-admin user cannot access GET /api/users (403 Forbidden)', async () => {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert.strictEqual(res.status, 403, 'Member should receive 403 Forbidden on admin endpoint');
  });

  test('Admin can access GET /api/users and receive full user directory', async () => {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200, 'Admin should receive 200 OK');
    const json = await res.json();
    assert.ok(Array.isArray(json.data), 'Data should be an array of users');
    assert.ok(json.data.length >= 8, 'Should return all users');

    const adminUser = json.data.find((u) => u.email === 'admin@odoo-ldce.org');
    assert.ok(adminUser, 'Admin user should be in list');
    assert.strictEqual(adminUser.role, 'admin');

    const maya = json.data.find((u) => u.email === 'maya@odoo-ldce.org');
    assert.ok(maya, 'Maya should be in list');
    assert.strictEqual(maya.membership_status, 'ACTIVE');
  });

  test('Admin can access GET /api/users/stats for charts', async () => {
    const res = await fetch(`${API_BASE}/users/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200, 'Stats endpoint should return 200');
    const json = await res.json();
    assert.ok(json.data.totalUsers >= 8, 'Total users should be >= 8');
    assert.ok(Array.isArray(json.data.roleDistribution), 'roleDistribution array should exist');
    assert.ok(Array.isArray(json.data.membershipDistribution), 'membershipDistribution array should exist');
    assert.ok(Array.isArray(json.data.timeline), 'timeline array should exist');
  });

  test('Admin can create a new user via POST /api/users', async () => {
    const uniqueEmail = `test_operator_${Date.now()}@odoo-ldce.org`;
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Test Operator',
        email: uniqueEmail,
        password: 'password123',
        role: 'volunteer',
      }),
    });

    assert.strictEqual(res.status, 201, 'User should be created with 201 Created');
    const json = await res.json();
    assert.ok(json.user?.id, 'Created user should have an ID');
    assert.strictEqual(json.user.role, 'volunteer');
    createdUserId = json.user.id;
  });

  test("Admin can update user role via PATCH /api/users/:id/role", async () => {
    assert.ok(createdUserId, 'Created user ID must exist');
    const res = await fetch(`${API_BASE}/users/${createdUserId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'event_manager' }),
    });

    assert.strictEqual(res.status, 200, 'Role update should succeed with 200');
    const json = await res.json();
    assert.strictEqual(json.user.role, 'event_manager', 'Role should be event_manager');
  });

  test('Admin self-deletion is prevented (400 Bad Request)', async () => {
    const res = await fetch(`${API_BASE}/users/1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 400, 'Self-deletion should be blocked');
  });

  test("Admin can delete test user via DELETE /api/users/:id", async () => {
    assert.ok(createdUserId, 'Created user ID must exist');
    const res = await fetch(`${API_BASE}/users/${createdUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200, 'User deletion should succeed with 200');
  });
});
