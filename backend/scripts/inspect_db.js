const { pool } = require('../db/connection');

async function run() {
  const tables = [
    'users',
    'memberships',
    'events',
    'tickets',
    'event_attendees',
    'products',
    'product_sizes',
    'orders',
    'order_items',
    'fundraisers',
    'tasks',
    'fundraiser_income',
    'expenses',
    'transactions',
    'announcements',
  ];

  for (const t of tables) {
    const res = await pool.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position;',
      [t]
    );
    console.log(t, ':', res.rows.map((r) => `${r.column_name} (${r.data_type})`).join(', '));
  }
  await pool.end();
}

run().catch(console.error);
