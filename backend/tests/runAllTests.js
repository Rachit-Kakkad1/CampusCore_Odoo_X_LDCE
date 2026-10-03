const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('RUNNING FULL MVP BACKEND INTEGRATION TEST SUITE');
console.log('================================================================\n');

const backendDir = path.resolve(__dirname, '..');

const suites = [
  { name: '1. Database Integrity Verification', cmd: 'node db/verify.js' },
  { name: '2. Authentication Module Tests', cmd: 'node tests/auth.test.js' },
  { name: '3. Membership Module Tests', cmd: 'node scripts/test_membership.js' },
  { name: '4. Announcements Module Tests', cmd: 'node scripts/test_announcements.js' },
  { name: '5. Events, Tickets & Check-in Tests', cmd: 'node tests/events.test.js' },
  { name: '6. Merchandise & Orders Tests', cmd: 'node scripts/test_merchandise.js' },
  { name: '7. QR & Email Delivery Tests', cmd: 'node tests/qr_email.test.js' },
  { name: '8. Fallback Codes, Volunteers & Cancellation Tests', cmd: 'node tests/volunteers_and_cancellation.test.js' },
  { name: '9. Security, Sessions & Concurrency Tests', cmd: 'node tests/security_and_concurrency.test.js' },
];

let allPassed = true;

for (const suite of suites) {
  console.log(`>>> Running: ${suite.name} ...`);
  try {
    execSync(suite.cmd, { stdio: 'inherit', env: process.env, cwd: backendDir });
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
