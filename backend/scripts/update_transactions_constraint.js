const { pool } = require('../config/database');

async function updateConstraint() {
  await pool.query(`
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_type_check;
    ALTER TABLE transactions ADD CONSTRAINT transactions_source_type_check 
      CHECK (source_type IN ('dues', 'ticket', 'merch', 'fundraiser', 'donation', 'donation_refund', 'fundraiser_refund', 'expense'));
  `);
  console.log('Transactions constraint updated successfully');
  process.exit(0);
}

updateConstraint().catch((err) => {
  console.error(err);
  process.exit(1);
});
