const express = require('express');
const router = express.Router();
const merchandiseController = require('./merchandise.controller');
const { requireAuth } = require('../../shared/auth/requireAuth');
const { requireRole } = require('../../shared/auth/requireRole');

// -----------------------------------------------------------------------------
// Products Endpoints
// Works with /api/merchandise/products... OR direct /api/products...
// -----------------------------------------------------------------------------
router.get('/products', merchandiseController.getProducts.bind(merchandiseController));
router.get('/products/:id', merchandiseController.getProductById.bind(merchandiseController));

router.post(
  '/products',
  requireAuth,
  requireRole('admin'),
  merchandiseController.createProduct.bind(merchandiseController)
);
router.put(
  '/products/:id/stock',
  requireAuth,
  requireRole('admin'),
  merchandiseController.updateStock.bind(merchandiseController)
);
router.put(
  '/products/:id',
  requireAuth,
  requireRole('admin'),
  merchandiseController.updateProduct.bind(merchandiseController)
);

// -----------------------------------------------------------------------------
// Orders Endpoints
// Works with /api/merchandise/orders... OR direct /api/orders...
// -----------------------------------------------------------------------------
router.post('/orders', requireAuth, merchandiseController.createOrder.bind(merchandiseController));
router.post('/orders/checkout', requireAuth, merchandiseController.createOrder.bind(merchandiseController));
router.post('/orders/:id/pay', requireAuth, merchandiseController.payOrder.bind(merchandiseController));
router.get('/orders/mine', requireAuth, merchandiseController.getMyOrders.bind(merchandiseController));
router.get(
  '/orders',
  requireAuth,
  requireRole('admin', 'treasurer'),
  merchandiseController.getAllOrders.bind(merchandiseController)
);
router.get('/orders/:id', requireAuth, merchandiseController.getOrderById.bind(merchandiseController));

// -----------------------------------------------------------------------------
// Direct Mount Fallbacks (if mounted directly at /api/products or /api/orders)
// -----------------------------------------------------------------------------
router.get('/', merchandiseController.getProducts.bind(merchandiseController));

module.exports = router;
