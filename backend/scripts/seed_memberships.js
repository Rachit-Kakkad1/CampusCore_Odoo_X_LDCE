// backend/scripts/seed_memberships.js
const { pool, query } = require('../db/connection');

async function seedMemberships() {
  console.log('🌱 Seeding approved membership states...');

  // Delete existing demo memberships to allow clean deterministic seeding
  await query('DELETE FROM transactions WHERE source_type = \'dues\';');
  await query('DELETE FROM memberships;');

  const sql = `
    -- 1. Maya Member (user_id = 5): ACTIVE (paid, future expiry)
    INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
    SELECT 1, id, 'SKY-MEM-005-MAYA', 'active', 'paid', 500.00,
      NOW() - INTERVAL '3 months',
      NOW() + INTERVAL '9 months',
      NOW() - INTERVAL '3 months',
      NOW() - INTERVAL '3 months',
      NOW() - INTERVAL '3 months'
    FROM users WHERE email = 'maya@odoo-ldce.org';

    -- 2. Eddie Expired (user_id = 6): RENEWAL CHAIN (Part 1: Historical Expired)
    INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
    SELECT 2, id, 'SKY-MEM-006-EDDIE-2025', 'expired', 'paid', 500.00,
      NOW() - INTERVAL '14 months',
      NOW() - INTERVAL '2 months',
      NOW() - INTERVAL '14 months',
      NOW() - INTERVAL '14 months',
      NOW() - INTERVAL '2 months'
    FROM users WHERE email = 'eddie@odoo-ldce.org';

    -- 3. Eddie Expired (user_id = 6): RENEWAL CHAIN (Part 2: Active Renewal referencing ID 2)
    INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, renewed_from_membership_id, created_at, updated_at)
    SELECT 3, id, 'SKY-MEM-006-EDDIE-2026', 'active', 'paid', 500.00,
      NOW() - INTERVAL '2 months',
      NOW() + INTERVAL '10 months',
      NOW() - INTERVAL '2 months',
      2,
      NOW() - INTERVAL '2 months',
      NOW() - INTERVAL '2 months'
    FROM users WHERE email = 'eddie@odoo-ldce.org';

    -- 4. Pia Pending (user_id = 8): PENDING (unpaid, dues pending)
    INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
    SELECT 4, id, 'SKY-MEM-008-PIA', 'pending', 'pending', 500.00,
      NULL, NULL, NULL,
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days'
    FROM users WHERE email = 'pia@odoo-ldce.org';

    -- 5. Vik Volunteer (user_id = 4): EXPIRED (past expiry, dues were paid)
    INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
    SELECT 5, id, 'SKY-MEM-004-VIK', 'expired', 'paid', 500.00,
      NOW() - INTERVAL '13 months',
      NOW() - INTERVAL '1 month',
      NOW() - INTERVAL '13 months',
      NOW() - INTERVAL '13 months',
      NOW() - INTERVAL '1 month'
    FROM users WHERE email = 'vik@odoo-ldce.org';

    -- 6. Greg Guest (user_id = 7): CANCELLED (was active, cancelled with reason)
    INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, cancelled_at, cancellation_reason, payment_timestamp, created_at, updated_at)
    SELECT 6, id, 'SKY-MEM-007-GREG', 'cancelled', 'paid', 500.00,
      NOW() - INTERVAL '4 months',
      NOW() + INTERVAL '8 months',
      NOW() - INTERVAL '10 days',
      'Member requested cancellation due to transfer to another campus',
      NOW() - INTERVAL '4 months',
      NOW() - INTERVAL '4 months',
      NOW() - INTERVAL '10 days'
    FROM users WHERE email = 'greg@odoo-ldce.org';

    -- 7. Tara Treasurer (user_id = 2): EXPIRING SOON (Active, expires in 5 days)
    INSERT INTO memberships (id, user_id, member_code, status, dues_status, dues_amount, started_at, expiry_date, payment_timestamp, created_at, updated_at)
    SELECT 7, id, 'SKY-MEM-002-TARA', 'active', 'paid', 500.00,
      NOW() - INTERVAL '360 days',
      NOW() + INTERVAL '5 days',
      NOW() - INTERVAL '360 days',
      NOW() - INTERVAL '360 days',
      NOW() - INTERVAL '360 days'
    FROM users WHERE email = 'tara@odoo-ldce.org';

    SELECT setval('memberships_id_seq', (SELECT COALESCE(MAX(id), 1) FROM memberships));

    -- Seed corresponding dues transactions in financial ledger
    INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status)
    SELECT 'dues', m.id, m.user_id, m.dues_amount, 'in', 'online', 'paid'
    FROM memberships m
    WHERE m.dues_status = 'paid'
    ON CONFLICT (source_type, source_id) DO NOTHING;
  `;

  await query(sql);
  console.log('✅ Demo memberships seeded successfully.');
}

if (require.main === module) {
  seedMemberships()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Fatal seed error:', err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { seedMemberships };
