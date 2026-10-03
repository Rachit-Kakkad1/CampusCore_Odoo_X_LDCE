const bcrypt = require('bcryptjs');
const { pool } = require('../db/connection');

async function fixPasswords() {
  try {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    console.log(`Generated bcrypt hash for "${password}":`, hash);

    const res = await pool.query(`UPDATE users SET password_hash = $1 RETURNING id, name, email, role;`, [hash]);
    console.log(`Updated ${res.rowCount} users in database:`);
    res.rows.forEach(u => console.log(`  - [${u.role}] ${u.name} <${u.email}>`));

    // Test comparison
    const verifyUser = await pool.query(`SELECT password_hash FROM users LIMIT 1;`);
    const isMatch = await bcrypt.compare(password, verifyUser.rows[0].password_hash);
    console.log(`Verification: bcrypt.compare("${password}") ===`, isMatch);
  } catch (err) {
    console.error('Failed to update passwords:', err);
  } finally {
    await pool.end();
  }
}

fixPasswords();
