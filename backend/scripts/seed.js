#!/usr/bin/env node
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { pool } = require('../src/shared/db/pool');
const { withTransaction } = require('../src/shared/db/transaction');
const { MEMBERSHIP_DUES } = require('../src/shared/constants');

async function seed() {
  console.log('🌱 Starting database seeding for skyline_org...');

  const defaultPassword = 'Password123!';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(defaultPassword, salt);

  await withTransaction(async (client) => {
    // 1. SEED USERS
    console.log('👤 Seeding users...');
    const usersToSeed = [
      { name: 'Admin User', email: 'admin@skyline.org', role: 'admin' },
      { name: 'Tara Treasurer', email: 'tara@skyline.org', role: 'treasurer' },
      { name: 'Ethan Events', email: 'ethan@skyline.org', role: 'event_manager' },
      { name: 'Vik Volunteer', email: 'vik@skyline.org', role: 'volunteer' },
      { name: 'Maya Member', email: 'maya@skyline.org', role: 'member' },
      { name: 'Eddie Expired', email: 'eddie@skyline.org', role: 'member' },
      { name: 'Greg Guest', email: 'greg@skyline.org', role: 'guest' },
      { name: 'Pia Pending', email: 'pia@skyline.org', role: 'guest' },
    ];

    const userMap = {};

    for (const u of usersToSeed) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash
         RETURNING id, name, email, role;`,
        [u.name, u.email, passwordHash, u.role]
      );
      userMap[u.email] = res.rows[0];
    }

    // 2. SEED MEMBERSHIPS
    console.log('💳 Seeding memberships...');
    // Maya: dues_status = paid, expiry_date = future date (ACTIVE derived)
    // Eddie: dues_status = paid, expiry_date = past date (EXPIRED derived)
    // Pia: dues_status = pending, expiry_date = null (PENDING derived)
    const membershipsToSeed = [
      {
        userId: userMap['maya@skyline.org'].id,
        memberCode: 'MEM-2026-MAYA',
        duesAmount: MEMBERSHIP_DUES,
        duesStatus: 'paid',
        startDate: '2026-01-01',
        expiryDate: '2027-12-31',
        paidAt: '2026-01-01T10:00:00Z',
      },
      {
        userId: userMap['eddie@skyline.org'].id,
        memberCode: 'MEM-2025-EDDIE',
        duesAmount: MEMBERSHIP_DUES,
        duesStatus: 'paid',
        startDate: '2025-01-01',
        expiryDate: '2025-12-31',
        paidAt: '2025-01-01T10:00:00Z',
      },
      {
        userId: userMap['pia@skyline.org'].id,
        memberCode: 'MEM-2026-PIA',
        duesAmount: MEMBERSHIP_DUES,
        duesStatus: 'pending',
        startDate: null,
        expiryDate: null,
        paidAt: null,
      },
    ];

    for (const m of membershipsToSeed) {
      await client.query(
        `INSERT INTO memberships (user_id, member_code, dues_amount, dues_status, start_date, expiry_date, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id)
         DO UPDATE SET
           member_code = EXCLUDED.member_code,
           dues_amount = EXCLUDED.dues_amount,
           dues_status = EXCLUDED.dues_status,
           start_date = EXCLUDED.start_date,
           expiry_date = EXCLUDED.expiry_date,
           paid_at = EXCLUDED.paid_at;`,
        [m.userId, m.memberCode, m.duesAmount, m.duesStatus, m.startDate, m.expiryDate, m.paidAt]
      );
    }

    // 3. SEED EVENTS
    console.log('🎟️ Seeding events...');
    const eventsToSeed = [
      {
        title: 'Spring Gala',
        description: 'Annual flagship celebration featuring keynote talks, dinner, and networking.',
        venue: 'Grand Ballroom, Campus Center',
        startsAt: '2026-11-15T18:00:00Z',
        capacity: 100,
        seatsRemaining: 100,
        memberPrice: 300.00,
        nonMemberPrice: 500.00,
        createdBy: userMap['ethan@skyline.org'].id,
      },
      {
        title: 'Mini Workshop',
        description: 'Intensive hands-on workshop on system design and enterprise development.',
        venue: 'Lab 204, Tech Hall',
        startsAt: '2026-11-20T14:00:00Z',
        capacity: 2,
        seatsRemaining: 2,
        memberPrice: 50.00,
        nonMemberPrice: 100.00,
        createdBy: userMap['ethan@skyline.org'].id,
      },
    ];

    for (const e of eventsToSeed) {
      const existing = await client.query('SELECT id FROM events WHERE title = $1;', [e.title]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO events (title, description, venue, starts_at, capacity, seats_remaining, member_price, non_member_price, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
          [e.title, e.description, e.venue, e.startsAt, e.capacity, e.seatsRemaining, e.memberPrice, e.nonMemberPrice, e.createdBy]
        );
      } else {
        await client.query(
          `UPDATE events SET
             description = $1, venue = $2, starts_at = $3, capacity = $4,
             seats_remaining = $5, member_price = $6, non_member_price = $7
           WHERE id = $8;`,
          [e.description, e.venue, e.startsAt, e.capacity, e.seatsRemaining, e.memberPrice, e.nonMemberPrice, existing.rows[0].id]
        );
      }
    }

    // 4. SEED PRODUCTS & SIZES
    console.log('🛍️ Seeding products and sizes...');
    const productsToSeed = [
      {
        name: 'Club Hoodie',
        description: 'Premium heavyweight cotton hoodie with embroidered Skyline crest.',
        price: 1200.00,
        sizes: [
          { size: 'S', stock: 5 },
          { size: 'M', stock: 10 },
          { size: 'L', stock: 1 }, // specified L stock = 1
          { size: 'XL', stock: 4 },
        ],
      },
      {
        name: 'Club T-Shirt',
        description: 'Classic breathable cotton tee with official logo.',
        price: 600.00,
        sizes: [
          { size: 'S', stock: 15 },
          { size: 'M', stock: 20 },
          { size: 'L', stock: 12 },
        ],
      },
    ];

    for (const p of productsToSeed) {
      let prodId;
      const existing = await client.query('SELECT id FROM products WHERE name = $1;', [p.name]);
      if (existing.rows.length === 0) {
        const res = await client.query(
          `INSERT INTO products (name, description, price, is_active)
           VALUES ($1, $2, $3, true)
           RETURNING id;`,
          [p.name, p.description, p.price]
        );
        prodId = res.rows[0].id;
      } else {
        prodId = existing.rows[0].id;
        await client.query(
          `UPDATE products SET description = $1, price = $2 WHERE id = $3;`,
          [p.description, p.price, prodId]
        );
      }

      for (const s of p.sizes) {
        await client.query(
          `INSERT INTO product_sizes (product_id, size, stock)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, size)
           DO UPDATE SET stock = EXCLUDED.stock;`,
          [prodId, s.size, s.stock]
        );
      }
    }

    // 5. SEED FUNDRAISER & TASKS
    console.log('🍰 Seeding Bake Sale fundraiser and tasks...');
    let fundraiserId;
    const existingFundraiser = await client.query('SELECT id FROM fundraisers WHERE title = $1;', ['Bake Sale']);
    if (existingFundraiser.rows.length === 0) {
      const res = await client.query(
        `INSERT INTO fundraisers (title, description, goal_amount, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id;`,
        [
          'Bake Sale',
          'Raising funds for the annual student project showcase and community outreach.',
          5000.00,
          userMap['admin@skyline.org'].id,
        ]
      );
      fundraiserId = res.rows[0].id;
    } else {
      fundraiserId = existingFundraiser.rows[0].id;
    }

    const tasksToSeed = [
      {
        title: 'Coordinate booth setup and promotional banners',
        assigneeId: userMap['vik@skyline.org'].id,
        status: 'TODO',
      },
      {
        title: 'Prepare ingredient list and volunteer baker roster',
        assigneeId: userMap['ethan@skyline.org'].id,
        status: 'IN_PROGRESS',
      },
      {
        title: 'Bake chocolate chip cookies and package with custom labels',
        assigneeId: userMap['maya@skyline.org'].id,
        status: 'COMPLETED',
      },
    ];

    for (const t of tasksToSeed) {
      const existingTask = await client.query(
        'SELECT id FROM tasks WHERE fundraiser_id = $1 AND title = $2;',
        [fundraiserId, t.title]
      );
      if (existingTask.rows.length === 0) {
        await client.query(
          `INSERT INTO tasks (fundraiser_id, title, assignee_id, status)
           VALUES ($1, $2, $3, $4);`,
          [fundraiserId, t.title, t.assigneeId, t.status]
        );
      } else {
        await client.query(
          `UPDATE tasks SET assignee_id = $1, status = $2 WHERE id = $3;`,
          [t.assigneeId, t.status, existingTask.rows[0].id]
        );
      }
    }

    // 6. SEED ANNOUNCEMENTS
    console.log('📢 Seeding announcements...');
    const announcementsToSeed = [
      {
        title: 'Welcome to Skyline Student Organization!',
        body: 'We are thrilled to welcome all new and returning students! Check out our upcoming events, join our workshops, and get your official club merchandise.',
        createdBy: userMap['admin@skyline.org'].id,
      },
      {
        title: 'Spring Gala Registration is Now Open',
        body: 'Early bird registration for the annual Spring Gala is now officially open! Seats are limited, so reserve your tickets early.',
        createdBy: userMap['ethan@skyline.org'].id,
      },
    ];

    for (const a of announcementsToSeed) {
      const existingAnn = await client.query('SELECT id FROM announcements WHERE title = $1;', [a.title]);
      if (existingAnn.rows.length === 0) {
        await client.query(
          `INSERT INTO announcements (title, body, created_by)
           VALUES ($1, $2, $3);`,
          [a.title, a.body, a.createdBy]
        );
      } else {
        await client.query(
          `UPDATE announcements SET body = $1, created_by = $2 WHERE id = $3;`,
          [a.body, a.createdBy, existingAnn.rows[0].id]
        );
      }
    }

    console.log('🎉 Seeding completed successfully!');
  });
}

async function main() {
  try {
    await seed();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
