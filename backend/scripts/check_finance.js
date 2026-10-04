const { query } = require('../db/connection');
const financeRepo = require('../modules/finance/finance.repository');
async function check() {
  // Test overview
  const overview = await financeRepo.getOverview();
  console.log('OVERVIEW:', JSON.stringify(overview, null, 2));
  
  // Test transactions
  const txns = await financeRepo.getAllTransactions({ limit: 5 });
  console.log('TRANSACTIONS count:', txns.length, 'sample:', JSON.stringify(txns.slice(0,2)));
  
  // Test expenses
  const expenses = await financeRepo.getAllExpenses({});
  console.log('EXPENSES count:', expenses.length);
  
  // Test owing
  const owing = await financeRepo.getOwingMembers();
  console.log('OWING count:', owing.length, 'sample:', JSON.stringify(owing.slice(0,2)));
  
  process.exit(0);
}
check().catch(e => { console.error(e.message, e.stack); process.exit(1); });
