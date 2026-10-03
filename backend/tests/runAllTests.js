const { execSync } = require('child_process');

console.log('================================================================');
console.log('RUNNING FULL MVP BACKEND INTEGRATION TEST SUITE');
console.log('================================================================\n');

const suites = [
  { name: '1. Database Integrity Verification', cmd: 'node backend/db/verify.js' },
  { name: '2. Authentication Module Tests', cmd: 'node backend/tests/auth.test.js' },
  { name: '3. Membership Module Tests', cmd: 'node backend/tests/membership.test.js' },
  { name: '4. Announcements Module Tests', cmd: 'node backend/tests/announcements.test.js' },
  { name: '5. Events, Tickets & Check-in Tests', cmd: 'node backend/tests/events.test.js' },
  { name: '6. Merchandise & Orders Tests', cmd: 'node backend/scripts/test_merchandise.js' },
  { name: '7. QR & Email Delivery Tests', cmd: 'node backend/tests/qr_email.test.js' },
];

let allPassed = true;

for (const suite of suites) {
  console.log(`>>> Running: ${suite.name} ...`);
  try {
    execSync(suite.cmd, { stdio: 'inherit', env: process.env });
    console.log(`>>> ${suite.name}: SUCCESS\n`);
  } catch (err) {
    console.error(`>>> ${suite.name}: FAILED\n`);
    allPassed = false;
    process.exit(1);
  }
}

console.log('================================================================');
console.log('ALL TEST SUITES PASSED CLEANLY (100% SUCCESS)');
console.log('================================================================');
