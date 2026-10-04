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
   * Endpoint: POST /events/:id/tickets
   * @param {number|string} eventId
   * @param {object} [attendeeData] - { name, email, mobile, checkout_session_id }
   */
  async checkoutTicket(eventId, attendeeData = {}) {
    const res = await api.post(`/events/${eventId}/tickets`, attendeeData);
    return res.data;
  },

  /**
   * Process payment for a reserved ticket
   * Endpoint: POST /tickets/:id/pay
   * @param {number|string} ticketId
   * @param {object|string} [paymentData] - { payment_mode, email } or paymentMode string
   */
  async payTicket(ticketId, paymentData = 'online') {
    const body = typeof paymentData === 'string'
      ? { payment_mode: paymentData }
      : {
          payment_mode: paymentData.payment_mode || paymentData.paymentMode || 'online',
          email: paymentData.email,
        };
    const res = await api.post(`/tickets/${ticketId}/pay`, body);
    return res.data;
  },

  /**
   * Complete purchase flow using existing backend endpoints:
   * 1. POST /events/:id/tickets
   * 2. POST /tickets/:id/pay
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
  },

  /**
  /**
   * Check in an attendee via QR scan data / ticket code (legacy alias)
   * Endpoint: POST /checkin/scan
   */
  async checkInTicket(qrDataOrCode) {
    const res = await api.post('/checkin/scan', {
      payload: qrDataOrCode?.trim(),
      qr_data: qrDataOrCode?.trim()
    });
    return res.data || res;
  },

  /**
   * Scan or validate ticket for event admission
   * Accepts signed QR payload or manual fallback ticket code (e.g. TCK-...)
   * Endpoint: POST /checkin/scan
   */
  async scanCheckIn(payload, eventId = null) {
    try {
      const res = await api.post('/checkin/scan', {
        payload: payload?.trim(),
        qr_data: payload?.trim(),
        event_id: eventId ? parseInt(eventId, 10) : undefined,
      });
      return res;
    } catch (err) {
      if (err.data) {
        return err.data; // Return backend payload (e.g. ALREADY_USED, INVALID)
      }
      throw err;
    }
  },

  /**
   * Fetch cryptographic QR code for a paid ticket
   * Endpoint: GET /tickets/:id/qr
   */
  async getTicketQR(ticketId) {
    const res = await api.get(`/tickets/${ticketId}/qr`);
    return res;
  },

  /**
   * Apply as a volunteer for an event
   * Endpoint: POST /events/:id/volunteers/apply
   */
  async applyVolunteer(eventId) {
    const res = await api.post(`/events/${eventId}/volunteers/apply`);
    return res.data;
  },

  /**
   * Fetch all volunteer applications for an event (Admin / Event Manager)
   * Endpoint: GET /events/:id/volunteers
   */
  async getEventVolunteers(eventId) {
    const res = await api.get(`/events/${eventId}/volunteers`);
    return res.data || res;
  },

  /**
   * Alias for getEventVolunteers
   */
  async getVolunteers(eventId) {
    return this.getEventVolunteers(eventId);
  },

  /**
   * Add / assign a volunteer to an event directly (Admin / Event Manager)
   * Endpoint: POST /events/:id/volunteers
   */
  async addVolunteer(eventId, userId) {
    const res = await api.post(`/events/${eventId}/volunteers`, { user_id: userId });
    return res.data || res;
  },


  /**
   * Update volunteer application status (approved, rejected)
   * Endpoint: PATCH /events/:id/volunteers/:applicationId
   */
  async updateVolunteerStatus(eventId, applicationId, status) {
    const res = await api.patch(`/events/${eventId}/volunteers/${applicationId}`, { status });
    return res.data;
  },

  /**
   * Remove volunteer from event
   * Endpoint: POST /events/:id/volunteers/:applicationId/remove
   */
  async removeVolunteer(eventId, applicationId) {
    const res = await api.post(`/events/${eventId}/volunteers/${applicationId}/remove`);
    return res.data;
  },

  /**
   * Fetch volunteer opportunities (events requiring volunteers)
   * Endpoint: GET /volunteer/events
   */
  async getVolunteerOpportunities() {
    const res = await api.get('/volunteer/events');
    return res.data;
  },

  /**
   * Fetch current volunteer's applications
   * Endpoint: GET /volunteer/mine
   */
  async getMyVolunteerApplications() {
    const res = await api.get('/volunteer/mine');
    return res.data;
  },

  /**
   * Update an existing event (Admin / Event Manager)
   * Endpoint: PATCH /events/:id
   */
  async updateEvent(eventId, updateData) {
    const res = await api.patch(`/events/${eventId}`, updateData);
    return res.data;
  },

  /**
  /**
   * Fetch all tickets for admin panel with pagination, search, and filters
   * Endpoint: GET /events/admin/tickets (or /admin/tickets)
   */
  async getAllTicketsAdmin(params = {}) {
    const res = await api.get('/admin/tickets', { params });
    return res;
  },

  /**
   * Fetch complete admin ticket details by ID
   * Endpoint: GET /events/admin/tickets/:id (or /admin/tickets/:id)
   */
  async getTicketDetailsAdmin(ticketId) {
    const res = await api.get(`/admin/tickets/${ticketId}`);
    return res;
  }
};

export default eventsService;

