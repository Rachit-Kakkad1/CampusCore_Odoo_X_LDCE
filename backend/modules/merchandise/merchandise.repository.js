const { pool, query } = require('../../db/connection');

/**
 * Merchandise Repository
 * Handles all direct database operations for products, sizes, orders, and order items.
 */
class MerchandiseRepository {
  /**
   * Get all products with their size variants and stock counts
   */
  async getAllProducts() {
    const text = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.image_url,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ps.id,
              'size', ps.size,
              'stock', ps.stock
            ) ORDER BY 
              CASE ps.size
                WHEN 'XS' THEN 1
                WHEN 'S' THEN 2
                WHEN 'M' THEN 3
                WHEN 'L' THEN 4
                WHEN 'XL' THEN 5
                WHEN 'XXL' THEN 6
                ELSE 7
              END
          ) FILTER (WHERE ps.id IS NOT NULL),
          '[]'::json
        ) AS sizes
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      GROUP BY p.id
      ORDER BY p.id ASC;
    `;
    const result = await query(text);
    return result.rows;
  }

  /**
   * Update a product's details (name, price, image_url, description)
   */
  async updateProduct(productId, { name, price, image_url, description }) {
    const text = `
      UPDATE products
      SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        image_url = COALESCE($3, image_url),
        description = COALESCE($4, description)
      WHERE id = $5
      RETURNING id, name, price, image_url, description, created_at;
    `;
    const result = await query(text, [
      name || null,
      price !== undefined ? parseFloat(price) : null,
      image_url || null,
      description || null,
      productId,
    ]);
    if (result.rows.length === 0) throw new Error('Product not found');
    return result.rows[0];
  }


  async getProductById(productId) {
    const text = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.image_url,
        p.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ps.id,
              'size', ps.size,
              'stock', ps.stock
            ) ORDER BY 
              CASE ps.size
                WHEN 'XS' THEN 1
                WHEN 'S' THEN 2
                WHEN 'M' THEN 3
                WHEN 'L' THEN 4
                WHEN 'XL' THEN 5
                WHEN 'XXL' THEN 6
                ELSE 7
              END
          ) FILTER (WHERE ps.id IS NOT NULL),
          '[]'::json
        ) AS sizes
      FROM products p
      LEFT JOIN product_sizes ps ON p.id = ps.product_id
      WHERE p.id = $1
      GROUP BY p.id;
    `;
    const result = await query(text, [productId]);
    return result.rows[0] || null;
  }

  /**
   * Create a new product (Admin)
   */
  async createProduct({ name, price, image_url }, client = null) {
    const db = client || { query };
    const text = `
      INSERT INTO products (name, price, image_url)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await db.query(text, [name, price, image_url || null]);
    return result.rows[0];
  }

  /**
   * Add or update size for a product
   */
  async upsertProductSize(productId, size, stock, client = null) {
    const db = client || { query };
    const text = `
      INSERT INTO product_sizes (product_id, size, stock)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, size)
      DO UPDATE SET stock = EXCLUDED.stock
      RETURNING *;
    `;
    const result = await db.query(text, [productId, size, stock]);
    return result.rows[0];
  }

  /**
   * Get size info by product_size_id
   */
  async getProductSizeById(productSizeId, client = null) {
    const db = client || { query };
    const text = `
      SELECT 
        ps.id AS product_size_id,
        ps.product_id,
        ps.size,
        ps.stock,
        p.name AS product_name,
        p.price AS unit_price,
        p.image_url
      FROM product_sizes ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.id = $1;
    `;
    const result = await db.query(text, [productSizeId]);
    return result.rows[0] || null;
  }

  /**
   * Get multiple product size records by IDs
   */
  async getProductSizesByIds(productSizeIds, client = null) {
    const db = client || { query };
    const text = `
      SELECT 
        ps.id AS product_size_id,
        ps.product_id,
        ps.size,
        ps.stock,
        p.name AS product_name,
        p.price AS unit_price,
        p.image_url
      FROM product_sizes ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.id = ANY($1::int[]);
    `;
    const result = await db.query(text, [productSizeIds]);
    return result.rows;
  }

  /**
   * Create an order record (Pending payment, stock not decremented)
   */
  async createOrder({ order_code, user_id, checkout_session_id, subtotal, discount, total, payment_status = 'pending' }, client = null) {
    const db = client || { query };
    const text = `
      INSERT INTO orders (order_code, user_id, checkout_session_id, subtotal, discount, total, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await db.query(text, [
      order_code,
      user_id,
      checkout_session_id || null,
      subtotal,
      discount,
      total,
      payment_status,
    ]);
    return result.rows[0];
  }

  /**
   * Create order items
   */
  async createOrderItem({ order_id, product_size_id, quantity, unit_price }, client = null) {
    const db = client || { query };
    const text = `
      INSERT INTO order_items (order_id, product_size_id, quantity, unit_price)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await db.query(text, [order_id, product_size_id, quantity, unit_price]);
    return result.rows[0];
  }

  /**
   * Find order by checkout_session_id (idempotency protection)
   */
  async getOrderByCheckoutSession(checkoutSessionId) {
    if (!checkoutSessionId) return null;
    const text = `
      SELECT * FROM orders WHERE checkout_session_id = $1;
    `;
    const result = await query(text, [checkoutSessionId]);
    return result.rows[0] || null;
  }

  /**
   * Get order by ID with items and user details
   */
  async getOrderById(orderId, client = null) {
    const db = client || { query };
    const text = `
      SELECT 
        o.id,
        o.order_code,
        o.user_id,
        o.checkout_session_id,
        o.subtotal,
        o.discount,
        o.total,
        o.payment_status,
        o.created_at,
        u.name AS user_name,
        u.email AS user_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_size_id', oi.product_size_id,
              'product_id', ps.product_id,
              'product_name', p.name,
              'size', ps.size,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'image_url', p.image_url
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN product_sizes ps ON oi.product_size_id = ps.id
      LEFT JOIN products p ON ps.product_id = p.id
      WHERE o.id = $1
      GROUP BY o.id, u.id;
    `;
    const result = await db.query(text, [orderId]);
    return result.rows[0] || null;
  }

  /**
   * Get orders for a specific user (backwards-compatible alias)
   */
  async getOrdersByUserId(userId, options = {}) {
    return this.getUserOrders(userId, options);
  }

  async getUserOrders(userId, { page = null, pageSize = null, limit = null, offset = 0 } = {}) {
    const isPaginated = page !== null || pageSize !== null || limit !== null;
    const effectiveLimit = pageSize || limit;

    let totalItems = 0;
    if (isPaginated) {
      const countRes = await query('SELECT COUNT(*)::int AS total FROM orders WHERE user_id = $1', [userId]);
      totalItems = countRes.rows[0] ? parseInt(countRes.rows[0].total, 10) : 0;
    }

    let text = `
      SELECT 
        o.id,
        o.order_code,
        o.user_id,
        o.checkout_session_id,
        o.subtotal,
        o.discount,
        o.total,
        o.payment_status,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_size_id', oi.product_size_id,
              'product_id', ps.product_id,
              'product_name', p.name,
              'size', ps.size,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'image_url', p.image_url
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN product_sizes ps ON oi.product_size_id = ps.id
      LEFT JOIN products p ON ps.product_id = p.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC, o.id DESC
    `;

    const params = [userId];
    if (isPaginated && effectiveLimit !== null) {
      params.push(effectiveLimit, offset);
      text += ` LIMIT $2 OFFSET $3`;
    }

    const result = await query(text, params);
    const rows = result.rows;

    if (isPaginated) {
      return {
        rows,
        totalItems,
      };
    }
    return rows;
  }

  /**
   * Get all orders (Admin / Treasurer) with optional pagination
   */
  async getAllOrders({ page = null, pageSize = null, limit = null, offset = 0, search = null, status = null } = {}) {
    const isPaginated = page !== null || pageSize !== null || limit !== null;
    const effectiveLimit = pageSize || limit;

    const where = [];
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      where.push(`o.payment_status = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      where.push(`(o.order_code ILIKE $${idx} OR u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    let totalItems = 0;
    if (isPaginated) {
      const countSql = `
        SELECT COUNT(*)::int AS total
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ${whereClause};
      `;
      const countRes = await query(countSql, params);
      totalItems = countRes.rows[0] ? parseInt(countRes.rows[0].total, 10) : 0;
    }

    let text = `
      SELECT 
        o.id,
        o.order_code,
        o.user_id,
        o.checkout_session_id,
        o.subtotal,
        o.discount,
        o.total,
        o.payment_status,
        o.created_at,
        u.name AS user_name,
        u.email AS user_email,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_size_id', oi.product_size_id,
              'product_id', ps.product_id,
              'product_name', p.name,
              'size', ps.size,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'image_url', p.image_url
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) AS items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN product_sizes ps ON oi.product_size_id = ps.id
      LEFT JOIN products p ON ps.product_id = p.id
      ${whereClause}
      GROUP BY o.id, u.id
      ORDER BY o.created_at DESC, o.id DESC
    `;

    const dataParams = [...params];
    if (isPaginated && effectiveLimit !== null) {
      dataParams.push(effectiveLimit, offset);
      text += ` LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    }

    const result = await query(text, dataParams);
    const rows = result.rows;

    if (isPaginated) {
      return {
        rows,
        totalItems,
      };
    }
    return rows;
  }

  /**
   * Lock order and items for payment processing
   */
  async lockOrderForPayment(orderId, client) {
    const text = `
      SELECT * FROM orders WHERE id = $1 FOR UPDATE;
    `;
    const result = await client.query(text, [orderId]);
    return result.rows[0] || null;
  }

  /**
   * Lock product sizes rows for stock verification and decrement
   */
  async lockProductSizesForUpdate(productSizeIds, client) {
    const text = `
      SELECT ps.id, ps.product_id, ps.size, ps.stock, p.name AS product_name
      FROM product_sizes ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.id = ANY($1::int[])
      FOR UPDATE;
    `;
    const result = await client.query(text, [productSizeIds]);
    return result.rows;
  }

  /**
   * Decrement stock atomically
   */
  async decrementStock(productSizeId, quantity, client) {
    const text = `
      UPDATE product_sizes
      SET stock = stock - $1
      WHERE id = $2 AND stock >= $1
      RETURNING *;
    `;
    const result = await client.query(text, [quantity, productSizeId]);
    return result.rows[0] || null;
  }

  /**
   * Mark order as paid
   */
  async markOrderPaid(orderId, client) {
    const text = `
      UPDATE orders
      SET payment_status = 'paid'
      WHERE id = $1
      RETURNING *;
    `;
    const result = await client.query(text, [orderId]);
    return result.rows[0] || null;
  }
}

module.exports = new MerchandiseRepository();
