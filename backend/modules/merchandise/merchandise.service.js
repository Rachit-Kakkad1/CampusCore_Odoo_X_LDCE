const crypto = require('crypto');
const { pool, query } = require('../../db/connection');
const merchandiseRepo = require('./merchandise.repository');
const { isActiveMember } = require('../../shared/membership/isActiveMember');
const { createTransaction } = require('../../shared/transactions/createTransaction');

/**
 * Merchandise Service
 * Orchestrates business logic for product catalog, member discounts,
 * pending orders, and atomic stock decrement on simulated payment.
 */
class MerchandiseService {
  /**
   * List all products with size variants and stocks
   */
  async listProducts() {
    return await merchandiseRepo.getAllProducts();
  }

  /**
   * Get product details by ID
   */
  async getProduct(productId) {
    const product = await merchandiseRepo.getProductById(productId);
    if (!product) {
      const error = new Error(`Product with ID ${productId} not found`);
      error.status = 404;
      throw error;
    }
    return product;
  }

  /**
   * Create new product (Admin action)
   */
  async createProduct({ name, price, image_url, sizes = [] }) {
    if (!name || price === undefined || price === null) {
      const error = new Error('Product name and price are required');
      error.status = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const product = await merchandiseRepo.createProduct({ name, price, image_url }, client);

      const defaultSizes = sizes.length > 0 ? sizes : [
        { size: 'S', stock: 0 },
        { size: 'M', stock: 0 },
        { size: 'L', stock: 0 },
        { size: 'XL', stock: 0 },
      ];

      for (const sizeItem of defaultSizes) {
        await merchandiseRepo.upsertProductSize(product.id, sizeItem.size, sizeItem.stock || 0, client);
      }

      await client.query('COMMIT');
      return await this.getProduct(product.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update stock for specific product size (Admin action)
   */
  async updateStock(productId, size, stock) {
    if (!productId || !size || stock === undefined) {
      const error = new Error('Product ID, size, and stock count are required');
      error.status = 400;
      throw error;
    }
    return await merchandiseRepo.upsertProductSize(productId, size, stock);
  }

  /**
   * Helper to check active membership status with direct DB fallback
   * (Ensures discount works reliably even before Nishit finalizes shared helper)
   */
  async checkIsActiveMember(userId) {
    if (!userId) return false;
    try {
      const isSharedActive = await isActiveMember(userId);
      if (isSharedActive) return true;

      // Direct DB verification: dues_status = 'paid' AND expiry_date >= CURRENT_DATE
      const res = await query(
        `SELECT 1 FROM memberships 
         WHERE user_id = $1 
           AND dues_status = 'paid' 
           AND expiry_date >= CURRENT_DATE
         LIMIT 1;`,
        [userId]
      );
      return res.rows.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Create a pending order (stock is NOT reduced here)
   *
   * @param {Object} params
   * @param {number} params.userId
   * @param {Array<{ product_size_id: number, quantity: number }>} params.items
   * @param {string} [params.checkout_session_id]
   */
  async createPendingOrder({ userId, items, checkout_session_id }) {
    if (!userId) {
      const error = new Error('User authentication required to place an order');
      error.status = 401;
      throw error;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      const error = new Error('Order must contain at least one item');
      error.status = 400;
      throw error;
    }

    // Check duplicate checkout session for idempotency
    if (checkout_session_id) {
      const existing = await merchandiseRepo.getOrderByCheckoutSession(checkout_session_id);
      if (existing) {
        return await merchandiseRepo.getOrderById(existing.id);
      }
    }

    // Fetch and validate product size details for all requested items
    const productSizeIds = items.map((i) => i.product_size_id);
    const sizeDetails = await merchandiseRepo.getProductSizesByIds(productSizeIds);

    if (sizeDetails.length !== productSizeIds.length) {
      const error = new Error('One or more selected product size variants are invalid');
      error.status = 400;
      throw error;
    }

    const sizeMap = new Map(sizeDetails.map((s) => [s.product_size_id, s]));

    // Calculate subtotal
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        const error = new Error('Item quantity must be a positive integer');
        error.status = 400;
        throw error;
      }

      const sizeInfo = sizeMap.get(item.product_size_id);
      const unitPrice = parseFloat(sizeInfo.unit_price);
      const itemTotal = unitPrice * qty;
      subtotal += itemTotal;

      validatedItems.push({
        product_size_id: item.product_size_id,
        quantity: qty,
        unit_price: unitPrice,
      });
    }

    // Determine active membership and calculate discount
    // Standard rule: 10% discount for active members on merchandise orders
    const isMember = await this.checkIsActiveMember(userId);
    const discountRate = isMember ? 0.10 : 0.00;
    const discount = parseFloat((subtotal * discountRate).toFixed(2));
    const total = parseFloat((subtotal - discount).toFixed(2));

    const orderCode = `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const order = await merchandiseRepo.createOrder(
        {
          order_code: orderCode,
          user_id: userId,
          checkout_session_id: checkout_session_id || null,
          subtotal,
          discount,
          total,
          payment_status: 'pending',
        },
        client
      );

      for (const item of validatedItems) {
        await merchandiseRepo.createOrderItem(
          {
            order_id: order.id,
            product_size_id: item.product_size_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          },
          client
        );
      }

      await client.query('COMMIT');
      return await merchandiseRepo.getOrderById(order.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Process Simulated Payment for an Order
   * ATOMIC FLOW:
   * BEGIN -> Lock Order -> Lock Product Sizes -> Verify Stock -> Decrement Stock -> Mark Paid -> Create Transaction -> COMMIT
   *
   * @param {Object} params
   * @param {number} params.orderId
   * @param {number} params.userId
   * @param {string} [params.payment_mode='online']
   */
  async payOrder({ orderId, userId, payment_mode = 'online' }) {
    if (!orderId) {
      const error = new Error('Order ID is required');
      error.status = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock the order row to prevent concurrent double payment
      const order = await merchandiseRepo.lockOrderForPayment(orderId, client);
      if (!order) {
        const error = new Error(`Order #${orderId} not found`);
        error.status = 404;
        throw error;
      }

      // Ensure user authorization
      if (userId && order.user_id !== userId) {
        const error = new Error('Unauthorized access to this order');
        error.status = 403;
        throw error;
      }

      // Check if already paid
      if (order.payment_status === 'paid') {
        await client.query('COMMIT');
        return await merchandiseRepo.getOrderById(orderId);
      }

      // 2. Fetch order items
      const itemsRes = await client.query(
        `SELECT oi.id, oi.product_size_id, oi.quantity, oi.unit_price, ps.size, p.name AS product_name
         FROM order_items oi
         JOIN product_sizes ps ON oi.product_size_id = ps.id
         JOIN products p ON ps.product_id = p.id
         WHERE oi.order_id = $1`,
        [orderId]
      );
      const items = itemsRes.rows;

      if (items.length === 0) {
        const error = new Error('Order contains no items');
        error.status = 400;
        throw error;
      }

      // 3. Lock product_sizes rows for stock verification
      const productSizeIds = items.map((i) => i.product_size_id);
      const lockedSizes = await merchandiseRepo.lockProductSizesForUpdate(productSizeIds, client);
      const stockMap = new Map(lockedSizes.map((s) => [s.id, s]));

      // 4. Verify all stocks are sufficient before making changes
      for (const item of items) {
        const currentSize = stockMap.get(item.product_size_id);
        if (!currentSize || currentSize.stock < item.quantity) {
          const available = currentSize ? currentSize.stock : 0;
          const error = new Error(
            `Insufficient stock for "${item.product_name}" (Size: ${item.size}). Requested: ${item.quantity}, Available: ${available}`
          );
          error.status = 409; // Conflict / Out of Stock
          throw error;
        }
      }

      // 5. Decrement stock atomically for each item
      for (const item of items) {
        const updated = await merchandiseRepo.decrementStock(item.product_size_id, item.quantity, client);
        if (!updated) {
          const error = new Error(`Failed to decrement stock for item ${item.product_size_id}`);
          error.status = 409;
          throw error;
        }
      }

      // 6. Mark order as PAID
      await merchandiseRepo.markOrderPaid(orderId, client);

      // 7. Create Financial Transaction in central ledger (Idempotent via UNIQUE(source_type, source_id))
      const validModes = ['cash', 'online', 'upi', 'card'];
      const sanitizedMode = validModes.includes(payment_mode) ? payment_mode : 'online';

      // Insert directly or call createTransaction
      await client.query(
        `INSERT INTO transactions (source_type, source_id, user_id, amount, direction, payment_mode, status)
         VALUES ('merch', $1, $2, $3, 'in', $4, 'paid')
         ON CONFLICT (source_type, source_id) DO NOTHING;`,
        [order.id, order.user_id, order.total, sanitizedMode]
      );

      // Also invoke shared helper if available
      try {
        await createTransaction(
          {
            source_type: 'merch',
            source_id: order.id,
            user_id: order.user_id,
            amount: order.total,
            direction: 'in',
            payment_mode: sanitizedMode,
            status: 'paid',
          },
          client
        );
      } catch {
        // Fallback already inserted above
      }

      await client.query('COMMIT');
      return await merchandiseRepo.getOrderById(orderId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get orders for the current user
   */
  async getUserOrders(userId) {
    if (!userId) {
      const error = new Error('User ID required');
      error.status = 401;
      throw error;
    }
    return await merchandiseRepo.getOrdersByUserId(userId);
  }

  /**
   * Get all orders across the organization (Admin / Treasurer)
   */
  async getAllOrders() {
    return await merchandiseRepo.getAllOrders();
  }

  /**
   * Get single order details
   */
  async getOrder(orderId, userId = null, role = null) {
    const order = await merchandiseRepo.getOrderById(orderId);
    if (!order) {
      const error = new Error(`Order #${orderId} not found`);
      error.status = 404;
      throw error;
    }

    const isPrivileged = ['admin', 'treasurer'].includes(role);
    if (userId && order.user_id !== userId && !isPrivileged) {
      const error = new Error('Unauthorized access to this order');
      error.status = 403;
      throw error;
    }

    return order;
  }
}

module.exports = new MerchandiseService();
