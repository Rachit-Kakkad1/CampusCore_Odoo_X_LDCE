const merchandiseService = require('./merchandise.service');
const { getCurrentUser } = require('../../shared/auth/getCurrentUser');

/**
 * Merchandise Controller
 * Handles HTTP requests, input validation, and status code responses.
 */
class MerchandiseController {
  /**
   * GET /api/merchandise/products (or /api/products)
   */
  async getProducts(req, res, next) {
    try {
      const products = await merchandiseService.listProducts();
      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/merchandise/products/:id (or /api/products/:id)
   */
  async getProductById(req, res, next) {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({
          error: { message: 'Invalid product ID parameter', status: 400 },
        });
      }

      const product = await merchandiseService.getProduct(productId);
      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/merchandise/products (Admin)
   */
  async createProduct(req, res, next) {
    try {
      const { name, price, image_url, sizes } = req.body;
      if (!name || price === undefined) {
        return res.status(400).json({
          error: { message: 'Product name and price are required', status: 400 },
        });
      }

      const product = await merchandiseService.createProduct({
        name,
        price: parseFloat(price),
        image_url,
        sizes,
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/merchandise/products/:id/stock (Admin)
   */
  async updateStock(req, res, next) {
    try {
      const productId = parseInt(req.params.id, 10);
      const { size, stock } = req.body;

      if (isNaN(productId) || !size || stock === undefined) {
        return res.status(400).json({
          error: { message: 'Product ID, size, and stock are required', status: 400 },
        });
      }

      const updated = await merchandiseService.updateStock(productId, size, parseInt(stock, 10));
      res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/merchandise/products/:id (Admin)
   */
  async updateProduct(req, res, next) {
    try {
      const productId = parseInt(req.params.id, 10);
      if (isNaN(productId)) {
        return res.status(400).json({
          error: { message: 'Invalid product ID parameter', status: 400 },
        });
      }
      const { name, price, image_url, description } = req.body;
      const updated = await merchandiseService.updateProduct(productId, {
        name,
        price: price !== undefined ? parseFloat(price) : undefined,
        image_url,
        description,
      });
      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }


  /**
   * POST /api/merchandise/orders (or /api/orders)
   * Creates pending order without decrementing stock
   */
  async createOrder(req, res, next) {
    try {
      const user = getCurrentUser(req);
      const userId = user?.id || req.body.user_id;

      if (!userId) {
        return res.status(401).json({
          error: { message: 'Authentication required to create an order', status: 401 },
        });
      }

      const { items, checkout_session_id } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: { message: 'Items array cannot be empty', status: 400 },
        });
      }

      const order = await merchandiseService.createPendingOrder({
        userId: parseInt(userId, 10),
        items,
        checkout_session_id,
      });

      res.status(201).json({
        success: true,
        message: 'Pending order created successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/merchandise/orders/:id/pay (or /api/orders/:id/pay)
   * Atomic payment and stock decrement
   */
  async payOrder(req, res, next) {
    try {
      const orderId = parseInt(req.params.id, 10);
      if (isNaN(orderId)) {
        return res.status(400).json({
          error: { message: 'Invalid order ID parameter', status: 400 },
        });
      }

      const user = getCurrentUser(req);
      const userId = user?.id || req.body.user_id;
      const { payment_mode = 'online' } = req.body;

      const order = await merchandiseService.payOrder({
        orderId,
        userId: userId ? parseInt(userId, 10) : null,
        payment_mode,
      });

      res.status(200).json({
        success: true,
        message: 'Order paid successfully and stock updated',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/merchandise/orders/mine (or /api/orders/mine)
   */
  async getMyOrders(req, res, next) {
    try {
      const user = getCurrentUser(req);
      const userId = user?.id || req.query.user_id;

      if (!userId) {
        return res.status(401).json({
          error: { message: 'Authentication required to view orders', status: 401 },
        });
      }

      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      if (hasPagination) {
        const { page, pageSize, offset } = parsePaginationParams(req.query, {
          defaultPageSize: 10,
          maxPageSize: 100,
        });

        const result = await merchandiseService.getUserOrders(parseInt(userId, 10), {
          page,
          pageSize,
          limit: pageSize,
          offset,
        });

        const rows = result.rows || [];
        const totalItems = result.totalItems || 0;
        const responsePayload = buildPaginationResponse(rows, totalItems, page, pageSize);

        return res.status(200).json({
          ...responsePayload,
          orders: rows,
        });
      }

      const orders = await merchandiseService.getUserOrders(parseInt(userId, 10));
      const list = Array.isArray(orders) ? orders : (orders.rows || []);
      res.status(200).json({
        success: true,
        count: list.length,
        data: list,
        orders: list,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/merchandise/orders (Admin / Treasurer)
   */
  async getAllOrders(req, res, next) {
    try {
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;
      const { status, search } = req.query;

      if (hasPagination) {
        const { page, pageSize, offset } = parsePaginationParams(req.query, {
          defaultPageSize: 20,
          maxPageSize: 100,
        });

        const result = await merchandiseService.getAllOrders({
          page,
          pageSize,
          limit: pageSize,
          offset,
          status,
          search,
        });

        const rows = result.rows || [];
        const totalItems = result.totalItems || 0;
        const responsePayload = buildPaginationResponse(rows, totalItems, page, pageSize);

        return res.status(200).json({
          ...responsePayload,
          orders: rows,
        });
      }

      const orders = await merchandiseService.getAllOrders({ status, search });
      const list = Array.isArray(orders) ? orders : (orders.rows || []);
      res.status(200).json({
        success: true,
        count: list.length,
        data: list,
        orders: list,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/merchandise/orders/:id
   */
  async getOrderById(req, res, next) {
    try {
      const orderId = parseInt(req.params.id, 10);
      if (isNaN(orderId)) {
        return res.status(400).json({
          error: { message: 'Invalid order ID parameter', status: 400 },
        });
      }

      const user = getCurrentUser(req);
      const order = await merchandiseService.getOrder(orderId, user?.id, user?.role);

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MerchandiseController();
