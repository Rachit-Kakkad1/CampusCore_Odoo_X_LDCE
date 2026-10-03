// frontend/src/services/merchandise.service.js
import api from './api.js';

export const merchandiseService = {
  /**
   * Fetch all products with their size variants and stock counts
   */
  async getProducts() {
    const res = await api.get('/merchandise/products');
    return res.data || res;
  },

  /**
   * Fetch single product details by ID
   */
  async getProductById(productId) {
    const res = await api.get(`/merchandise/products/${productId}`);
    return res.data || res;
  },

  /**
   * Create a pending order (stock is NOT decremented yet)
   */
  async createOrder({ items, checkoutSessionId }) {
    const res = await api.post('/merchandise/orders', {
      items,
      checkout_session_id: checkoutSessionId,
    });
    return res.data || res;
  },

  /**
   * Simulate payment and atomically decrement stock
   */
  async payOrder(orderId, paymentMode = 'online') {
    const res = await api.post(`/merchandise/orders/${orderId}/pay`, {
      payment_mode: paymentMode,
    });
    return res.data || res;
  },

  /**
   * Fetch order history for the currently authenticated user
   */
  async getMyOrders() {
    const res = await api.get('/merchandise/orders/mine');
    return res.data || res;
  },

  /**
   * Fetch all organization orders (Admin / Treasurer)
   */
  async getAllOrders() {
    const res = await api.get('/merchandise/orders');
    return res.data || res;
  },

  /**
   * Create a new product (Admin)
   */
  async createProduct(productData) {
    const res = await api.post('/merchandise/products', productData);
    return res.data || res;
  },

  /**
   * Update stock count for a size variant (Admin)
   */
  async updateStock(productId, size, stock) {
    const res = await api.put(`/merchandise/products/${productId}/stock`, { size, stock });
    return res.data || res;
  },
};

export default merchandiseService;
