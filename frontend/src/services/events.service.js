// frontend/src/services/events.service.js
import api from './api.js';

export const eventsService = {
  /**
   * Fetch all upcoming and active events
   */
  async getEvents() {
    const res = await api.get('/events');
    return res.data;
  },

  /**
   * Fetch single event details
   */
  async getEventById(id) {
    const res = await api.get(`/events/${id}`);
    return res.data;
  },

  /**
   * Create a new event (Admin / Event Manager)
   */
  async createEvent(eventData) {
    const res = await api.post('/events', eventData);
    return res.data;
  },

  /**
   * Fetch current user's purchased tickets
   */
  async getMyTickets() {
    const res = await api.get('/events/tickets/mine');
    return res.data;
  },

  /**
   * Reserve / Checkout a ticket for an event
   * @param {number|string} eventId
   * @param {object} [attendeeData] - { name, email, mobile, checkout_session_id }
   */
  async checkoutTicket(eventId, attendeeData = {}) {
    const res = await api.post(`/events/${eventId}/tickets`, attendeeData);
    return res.data;
  },

  /**
   * Process payment for a reserved ticket
   * @param {number|string} ticketId
   * @param {object|string} [paymentData] - { payment_mode, email } or paymentMode string
   */
  async payTicket(ticketId, paymentData = 'online') {
    const body = typeof paymentData === 'string'
      ? { payment_mode: paymentData }
      : { payment_mode: paymentData.payment_mode || paymentData.paymentMode || 'online', email: paymentData.email };
    const res = await api.post(`/tickets/${ticketId}/pay`, body);
    return res.data;
  },

  /**
   * Complete end-to-end purchase flow:
   * 1. Checkout/reserve seat
   * 2. Process payment, generate HMAC signed QR, and trigger email delivery
   *
   * @param {number|string} eventId
   * @param {object|string} [options] - { name, email, mobile, paymentMode } or paymentMode string
   */
  async purchaseTicket(eventId, options = 'online') {
    let name = '';
    let email = '';
    let mobile = '';
    let paymentMode = 'online';

    if (typeof options === 'string') {
      paymentMode = options;
    } else if (options && typeof options === 'object') {
      name = options.name || '';
      email = options.email || '';
      mobile = options.mobile || '';
      paymentMode = options.paymentMode || options.payment_mode || 'online';
    }

    // Step 1: Checkout ticket
    const checkoutPayload = {
      checkout_session_id: `cs_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
    if (name || email || mobile) {
      checkoutPayload.name = name;
      checkoutPayload.email = email;
      checkoutPayload.mobile = mobile;
    }

    const checkoutRes = await this.checkoutTicket(eventId, checkoutPayload);
    const pendingTicket = checkoutRes?.ticket || checkoutRes?.data || checkoutRes;
    const ticketId = pendingTicket?.id;

    if (!ticketId) {
      throw new Error('Seat reservation failed. No ticket ID returned from server.');
    }

    // Step 2: Pay ticket
    const payRes = await this.payTicket(ticketId, {
      payment_mode: paymentMode,
      email: email || undefined,
    });

    const paidTicket = payRes?.ticket || payRes?.data || payRes;
    return paidTicket;
  }
};

export default eventsService;
