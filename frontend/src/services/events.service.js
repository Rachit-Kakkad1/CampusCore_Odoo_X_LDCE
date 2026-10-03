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
   * Purchase a ticket for an event
   */
  async purchaseTicket(eventId, paymentMode = 'online') {
    const res = await api.post(`/events/${eventId}/tickets`, { payment_mode: paymentMode });
    return res.data;
  }
};

export default eventsService;
