const { pool } = require('../db/connection');
const merchandiseService = require('../modules/merchandise/merchandise.service');

async function testMerchandiseModule() {
  console.log('================================================================');
  console.log('MERCHANDISE & SHOP MODULE VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Fetch Users
    console.log('--- 1. Fetching Test Users ---');
    const usersRes = await pool.query(`SELECT id, email, role FROM users;`);
    const users = Object.fromEntries(usersRes.rows.map((u) => [u.email, u]));
    assert(users['maya@odoo-ldce.org'], 'Maya Member exists');
    assert(users['eddie@odoo-ldce.org'], 'Eddie Expired (Non-active member) exists');
    console.log();

    // 2. Fetch Catalog
    console.log('--- 2. Fetching Merchandise Catalog ---');
    const products = await merchandiseService.listProducts();
    assert(Array.isArray(products) && products.length >= 2, 'Products list returned >= 2 products');
    
    const hoodie = products.find((p) => p.name === 'Club Hoodie');
    assert(hoodie !== undefined, 'Club Hoodie exists in catalog');
    const sizeL = hoodie?.sizes?.find((s) => s.size === 'L');
    assert(sizeL && sizeL.stock >= 1, `Club Hoodie Size L initial stock is ${sizeL?.stock}`);
    console.log();

    // 3. Test Active Member Discount (Maya) vs Non-Active Member (Eddie)
    console.log('--- 3. Testing Member Discounts on Order Creation ---');
    const mayaOrder = await merchandiseService.createPendingOrder({
      userId: users['maya@odoo-ldce.org'].id,
      items: [{ product_size_id: sizeL.id, quantity: 1 }],
      checkout_session_id: `sess_maya_${Date.now()}`,
    });

    assert(mayaOrder.payment_status === 'pending', 'Maya order is created with payment_status = pending');
    assert(parseFloat(mayaOrder.subtotal) === 1200.00, 'Subtotal is 1200.00');
    assert(parseFloat(mayaOrder.discount) === 120.00, 'Maya receives 10% member discount (120.00)');
    assert(parseFloat(mayaOrder.total) === 1080.00, 'Maya total is 1080.00');

    // Verify stock is NOT decremented yet for pending order
    const hoodieAfterPending = await merchandiseService.getProduct(hoodie.id);
    const sizeLAfterPending = hoodieAfterPending.sizes.find((s) => s.size === 'L');
    assert(sizeLAfterPending.stock === sizeL.stock, 'Stock is NOT reduced for pending order');

    const nonMemberOrder = await merchandiseService.createPendingOrder({
      userId: users['eddie@odoo-ldce.org'].id,
      items: [{ product_size_id: sizeL.id, quantity: 1 }],
      checkout_session_id: `sess_nonmember_${Date.now()}`,
    });
    assert(parseFloat(nonMemberOrder.discount) === 0.00, 'Eddie (Non-active member) receives 0.00 discount');
    assert(parseFloat(nonMemberOrder.total) === 1200.00, 'Eddie total is full price 1200.00');
    console.log();

    // 4. Test Payment Simulation & Atomic Stock Decrement
    console.log('--- 4. Testing Atomic Payment & Stock Decrement ---');
    const initialStock = sizeL.stock;
    const paidMayaOrder = await merchandiseService.payOrder({
      orderId: mayaOrder.id,
      userId: users['maya@odoo-ldce.org'].id,
      payment_mode: 'online',
    });

    assert(paidMayaOrder.payment_status === 'paid', 'Maya order marked as PAID');

    // Check stock in DB
    const hoodieAfterPay = await merchandiseService.getProduct(hoodie.id);
    const sizeLAfterPay = hoodieAfterPay.sizes.find((s) => s.size === 'L');
    assert(sizeLAfterPay.stock === initialStock - 1, `Size L stock dropped from ${initialStock} to ${sizeLAfterPay.stock}`);

    // Check transaction created
    const txRes = await pool.query(
      `SELECT * FROM transactions WHERE source_type = 'merch' AND source_id = $1;`,
      [mayaOrder.id]
    );
    assert(txRes.rows.length === 1, 'Exactly one transaction row created for paid order');
    assert(parseFloat(txRes.rows[0].amount) === 1080.00, 'Transaction amount matches order total (1080.00)');
    assert(txRes.rows[0].direction === 'in', 'Transaction direction is IN');
    assert(txRes.rows[0].status === 'paid', 'Transaction status is PAID');
    console.log();

    // 5. Test Overselling Protection (Second customer attempts to pay for now out-of-stock Size L)
    console.log('--- 5. Testing Overselling Prevention ---');
    let oversellCaught = false;
    try {
      await merchandiseService.payOrder({
        orderId: nonMemberOrder.id,
        userId: users['eddie@odoo-ldce.org'].id,
        payment_mode: 'card',
      });
    } catch (err) {
      oversellCaught = true;
      assert(err.status === 409, `Oversell rejected with 409 Conflict: "${err.message}"`);
    }
    assert(oversellCaught, 'Second customer was prevented from buying out-of-stock item');

    // Check that nonMemberOrder is still pending and no extra transaction was created
    const nonMemberOrderCheck = await merchandiseService.getOrder(nonMemberOrder.id);
    assert(nonMemberOrderCheck.payment_status === 'pending', 'Second order remains pending upon failed stock check');
    console.log();

    // 6. Test Idempotent Order Creation (Checkout Session)
    console.log('--- 6. Testing Checkout Session Idempotency ---');
    const sessionId = `test_idempotent_${Date.now()}`;
    const firstAttempt = await merchandiseService.createPendingOrder({
      userId: users['maya@odoo-ldce.org'].id,
      items: [{ product_size_id: hoodie.sizes[0].id, quantity: 1 }],
      checkout_session_id: sessionId,
    });
    const secondAttempt = await merchandiseService.createPendingOrder({
      userId: users['maya@odoo-ldce.org'].id,
      items: [{ product_size_id: hoodie.sizes[0].id, quantity: 1 }],
      checkout_session_id: sessionId,
    });
    assert(firstAttempt.id === secondAttempt.id, 'Duplicate checkout session returns same order ID (No duplicate order)');
    console.log();

    console.log('================================================================');
    console.log(`MERCHANDISE TESTS COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');

  } catch (error) {
    console.error('Fatal test error:', error);
  } finally {
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

testMerchandiseModule();
