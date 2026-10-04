#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('../config/env');

/**
 * CampusCore Mega Dataset Seeder
 * Seeds 15,000 records (1,000 records per table across 15 core entities)
 * from campuscore_mega_dataset.json into PostgreSQL with full referential integrity.
 */
async function seedMegaDataset() {
  console.log('🚀 Loading CampusCore Mega Dataset (15,000 records across 15 tables)...');

  const jsonPath = path.resolve(__dirname, 'seeds', 'campuscore_mega_dataset.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dataset not found at ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const dataset = JSON.parse(raw);
  const tables = dataset.tables;

  const pool = new Pool({
    connectionString: env.DATABASE_URL || undefined,
    host: env.DATABASE_URL ? undefined : env.DB_HOST,
    port: env.DATABASE_URL ? undefined : env.DB_PORT,
    database: env.DATABASE_URL ? undefined : env.DB_NAME,
    user: env.DATABASE_URL ? undefined : env.DB_USER,
    password: env.DATABASE_URL ? undefined : env.DB_PASSWORD,
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Beginning PostgreSQL Transaction...');
    await client.query('BEGIN');

    // Clean existing tables in reverse dependency order
    console.log('🧹 Truncating existing entity tables (RESTART IDENTITY CASCADE)...');
    await client.query(`
      TRUNCATE TABLE 
        donations,
        transactions, 
        expenses, 
        fundraiser_income, 
        tasks, 
        fundraisers,
        order_items, 
        orders, 
        product_sizes, 
        products,
        tickets, 
        event_attendees, 
        events, 
        announcements, 
        memberships, 
        users
      RESTART IDENTITY CASCADE;
    `);

    // Helper for chunked batch insertion
    async function batchInsert(tableName, columns, rows, batchSize = 250) {
      if (!rows || rows.length === 0) return;
      const startTime = Date.now();

      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        const valuePlaceholders = [];
        const params = [];
        let paramIndex = 1;

        for (const row of chunk) {
          const rowPlaceholders = [];
          for (const col of columns) {
            rowPlaceholders.push(`$${paramIndex++}`);
            const val = row[col];
            params.push(val === undefined ? null : val);
          }
          valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
        }

        const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')};`;
        await client.query(sql, params);
      }

      const elapsed = Date.now() - startTime;
      console.log(`  ✓ Inserted ${rows.length} records into '${tableName}' (${elapsed}ms)`);
    }

    // 1. users
    console.log('📦 Seeding Entity 1/15: users...');
    await batchInsert(
      'users',
      ['id', 'name', 'email', 'password_hash', 'role', 'created_at'],
      tables.users
    );

    // 2. event_attendees
    console.log('📦 Seeding Entity 2/15: event_attendees...');
    await batchInsert(
      'event_attendees',
      ['id', 'name', 'email', 'mobile', 'created_at'],
      tables.event_attendees
    );

    // 3. memberships
    console.log('📦 Seeding Entity 3/15: memberships...');
    await batchInsert(
      'memberships',
      [
        'id',
        'user_id',
        'member_code',
        'status',
        'dues_status',
        'dues_amount',
        'started_at',
        'expiry_date',
        'cancelled_at',
        'cancellation_reason',
        'payment_timestamp',
        'renewed_from_membership_id',
        'created_at',
        'updated_at',
      ],
      tables.memberships
    );

    // 4. announcements
    console.log('📦 Seeding Entity 4/15: announcements...');
    await batchInsert(
      'announcements',
      [
        'id',
        'title',
        'body',
        'priority',
        'category',
        'status',
        'created_by',
        'published_at',
        'created_at',
      ],
      tables.announcements
    );

    // 5. events
    console.log('📦 Seeding Entity 5/15: events...');
    await batchInsert(
      'events',
      [
        'id',
        'title',
        'description',
        'venue',
        'starts_at',
        'capacity',
        'seats_remaining',
        'member_price',
        'non_member_price',
        'created_by',
        'created_at',
      ],
      tables.events
    );

    // 6. tickets
    console.log('📦 Seeding Entity 6/15: tickets...');
    const formattedTickets = tables.tickets.map((t) => ({
      ...t,
      fallback_code: t.fallback_code || `FB${String(t.id).padStart(6, '0')}`,
    }));
    await batchInsert(
      'tickets',
      [
        'id',
        'ticket_code',
        'fallback_code',
        'event_id',
        'user_id',
        'attendee_id',
        'price',
        'price_type',
        'payment_status',
        'checkout_session_id',
        'checked_in_at',
        'checked_in_by',
        'created_at',
      ],
      formattedTickets
    );

    // 7. products
    console.log('📦 Seeding Entity 7/15: products...');
    await batchInsert(
      'products',
      ['id', 'name', 'description', 'price', 'image_url', 'created_at'],
      tables.products
    );

    // 8. product_sizes
    console.log('📦 Seeding Entity 8/15: product_sizes...');
    await batchInsert(
      'product_sizes',
      ['id', 'product_id', 'size', 'stock'],
      tables.product_sizes
    );

    // 9. orders
    console.log('📦 Seeding Entity 9/15: orders...');
    await batchInsert(
      'orders',
      [
        'id',
        'order_code',
        'user_id',
        'checkout_session_id',
        'subtotal',
        'discount',
        'total',
        'payment_status',
        'created_at',
      ],
      tables.orders
    );

    // 10. order_items
    console.log('📦 Seeding Entity 10/15: order_items...');
    await batchInsert(
      'order_items',
      ['id', 'order_id', 'product_size_id', 'quantity', 'unit_price'],
      tables.order_items
    );

    // 11. fundraisers
    console.log('📦 Seeding Entity 11/15: fundraisers...');
    const formattedFundraisers = tables.fundraisers.map((f) => ({
      id: f.id,
      public_id: f.public_id || `FND-${String(f.id).padStart(4, '0')}`,
      slug: f.slug || `campaign-${f.id}`,
      title: f.title,
      short_description: f.short_description || (f.description ? f.description.slice(0, 150) : 'CampusCore student campaign.'),
      description: f.description,
      goal_amount: f.goal_amount || 10000.00,
      currency: f.currency || 'INR',
      status: f.status || 'active',
      start_at: f.start_at || f.created_at || new Date().toISOString(),
      created_by: f.created_by,
      created_at: f.created_at,
      updated_at: f.updated_at || f.created_at,
    }));
    await batchInsert(
      'fundraisers',
      [
        'id',
        'public_id',
        'slug',
        'title',
        'short_description',
        'description',
        'goal_amount',
        'currency',
        'status',
        'start_at',
        'created_by',
        'created_at',
        'updated_at',
      ],
      formattedFundraisers
    );

    // 12. tasks
    console.log('📦 Seeding Entity 12/15: tasks...');
    await batchInsert(
      'tasks',
      ['id', 'fundraiser_id', 'title', 'assignee_id', 'status', 'created_at'],
      tables.tasks
    );

    // 13. fundraiser_income
    console.log('📦 Seeding Entity 13/15: fundraiser_income...');
    await batchInsert(
      'fundraiser_income',
      ['id', 'fundraiser_id', 'amount', 'note', 'recorded_by', 'created_at'],
      tables.fundraiser_income
    );

    // 14. expenses
    console.log('📦 Seeding Entity 14/15: expenses...');
    await batchInsert(
      'expenses',
      [
        'id',
        'submitted_by',
        'amount',
        'description',
        'receipt_url',
        'status',
        'approved_by',
        'approved_at',
        'reimbursed_by',
        'reimbursed_at',
        'created_at',
      ],
      tables.expenses
    );

    // 15. transactions
    console.log('📦 Seeding Entity 15/15: transactions...');
    await batchInsert(
      'transactions',
      [
        'id',
        'source_type',
        'source_id',
        'user_id',
        'amount',
        'direction',
        'payment_mode',
        'status',
        'created_at',
      ],
      tables.transactions
    );

    // 16. donations (generate 2,000 realistic online contributions across all 1,000 campaigns)
    console.log('📦 Seeding Entity 16: donations (2,000 active contributions with real funds raised)...');
    const donorFirstNames = [
      'Rohan', 'Priya', 'Aarav', 'Sneha', 'Devang', 'Aditi', 'Tanvi', 'Karan', 'Ananya', 'Vikram',
      'Meera', 'Siddharth', 'Kavita', 'Arjun', 'Diya', 'Nikhil', 'Pooja', 'Rahul', 'Isha', 'Harsh'
    ];
    const donorLastNames = [
      'Sharma', 'Patel', 'Mehta', 'Iyer', 'Shah', 'Nair', 'Trivedi', 'Verma', 'Desai', 'Joshi',
      'Bhatt', 'Rao', 'Reddy', 'Kapoor', 'Gupta', 'Malhotra', 'Dave', 'Chauhan', 'Pandya', 'Soni'
    ];
    const sampleMessages = [
      'Proud alumnus supporting our LDCE juniors and campus projects!',
      'Great student initiative, wishing the entire team immense success!',
      'Happy to contribute to student innovation and leadership.',
      'Keep up the inspiring work! Best wishes from batch of 2021.',
      'Excited to see this campaign achieve its goals.',
      'Small contribution to back the talented student community.',
      'All the best for the upcoming competition and deployment!',
      'Proud of the LDCE student chapter and mentors.',
      'Happy to help! Keep pushing boundaries.',
      'Hope this contribution helps reach the target milestone.'
    ];
    const donationAmounts = [300, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 5000];

    const generatedDonations = [];
    for (let i = 1; i <= 2000; i++) {
      const fId = ((i - 1) % 1000) + 1;
      const isSecondRound = i > 1000;
      const firstName = donorFirstNames[(i * 7) % donorFirstNames.length];
      const lastName = donorLastNames[(i * 11) % donorLastNames.length];
      const isAnonymous = (i % 7 === 0);
      const isRefunded = (i % 97 === 0);
      const isPending = (i % 89 === 0);
      const status = isRefunded ? 'refunded' : (isPending ? 'pending' : 'paid');
      const amountVal = donationAmounts[(i + (isSecondRound ? 3 : 0)) % donationAmounts.length];
      const refundAmt = isRefunded ? amountVal : 0;
      const daysAgo = (i % 60) + 1;
      const donationDate = new Date(Date.now() - daysAgo * 86400000).toISOString();

      generatedDonations.push({
        id: i,
        public_id: `DON-${String(i).padStart(6, '0')}`,
        fundraiser_id: fId,
        user_id: ((i % 1000) + 1),
        donor_name: `${firstName} ${lastName}`,
        donor_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        donor_phone: `+9198765${String(10000 + (i % 90000)).slice(0, 5)}`,
        amount: amountVal.toFixed(2),
        currency: 'INR',
        status: status,
        anonymous: isAnonymous,
        message: isAnonymous ? 'Anonymous contribution for student empowerment.' : sampleMessages[i % sampleMessages.length],
        payment_provider: i % 2 === 0 ? 'razorpay' : 'upi',
        payment_reference: `pay_cc_${String(i).padStart(6, '0')}`,
        idempotency_key: `idem_seed_${i}`,
        refund_amount: refundAmt.toFixed(2),
        refund_reason: isRefunded ? 'Accidental duplicate donation refunded upon request' : null,
        paid_at: status === 'pending' ? null : donationDate,
        refunded_at: isRefunded ? donationDate : null,
        created_at: donationDate,
        updated_at: donationDate,
      });
    }

    await batchInsert(
      'donations',
      [
        'id',
        'public_id',
        'fundraiser_id',
        'user_id',
        'donor_name',
        'donor_email',
        'donor_phone',
        'amount',
        'currency',
        'status',
        'anonymous',
        'message',
        'payment_provider',
        'payment_reference',
        'idempotency_key',
        'refund_amount',
        'refund_reason',
        'paid_at',
        'refunded_at',
        'created_at',
        'updated_at',
      ],
      generatedDonations
    );

    // Reset auto-increment sequences so subsequent manual or API inserts use id >= max(id) + 1
    console.log('🔧 Synchronizing PostgreSQL Sequence Counters (setval to MAX(id))...');
    const tableSeqList = [
      'users',
      'event_attendees',
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
      'transactions',
      'donations',
    ];

    for (const t of tableSeqList) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${t}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${t}), 1)
        );
      `);
    }

    await client.query('COMMIT');
    console.log('🎉 TRANSACTION COMMITTED SUCCESSFULLY!');
    console.log('✨ All 15,000 records from campuscore_mega_dataset.json are live in the database.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed, transaction rolled back:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedMegaDataset()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedMegaDataset };
