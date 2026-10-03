const eventRepository = require('./event.repository');

/**
 * Events Service
 * Business logic for Event management.
 */
class EventsService {
  /**
   * Creates a new event.
   */
  async createEvent(eventData) {
    const { title, venue, starts_at, capacity, member_price, non_member_price } = eventData;

    if (!title || !venue || !starts_at || capacity === undefined || member_price === undefined || non_member_price === undefined) {
      const err = new Error('All event fields (title, venue, starts_at, capacity, member_price, non_member_price) are required');
      err.code = 'INVALID_EVENT_DATA';
      err.status = 400;
      throw err;
    }

    const parsedCapacity = parseInt(capacity, 10);
    const parsedMemberPrice = parseFloat(member_price);
    const parsedNonMemberPrice = parseFloat(non_member_price);

    if (isNaN(parsedCapacity) || parsedCapacity < 0) {
      const err = new Error('Capacity must be a non-negative integer');
      err.code = 'INVALID_CAPACITY';
      err.status = 400;
      throw err;
    }

    if (isNaN(parsedMemberPrice) || parsedMemberPrice < 0 || isNaN(parsedNonMemberPrice) || parsedNonMemberPrice < 0) {
      const err = new Error('Prices must be non-negative numbers');
      err.code = 'INVALID_PRICE';
      err.status = 400;
      throw err;
    }

    return await eventRepository.createEvent({
      title,
      venue,
      starts_at,
      capacity: parsedCapacity,
      member_price: parsedMemberPrice,
      non_member_price: parsedNonMemberPrice,
    });
  }

  /**
   * Retrieves all events.
   */
  async getAllEvents() {
    return await eventRepository.getAllEvents();
  }

  /**
   * Retrieves single event by ID.
   */
  async getEventById(id) {
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return event;
  }

  /**
   * Retrieves real-time statistics for an event.
   */
  async getEventStats(id) {
    const eventId = parseInt(id, 10);
    if (isNaN(eventId)) {
      const err = new Error('Invalid event ID');
      err.code = 'INVALID_ID';
      err.status = 400;
      throw err;
    }

    const stats = await eventRepository.getEventStats(eventId);
    if (!stats) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return stats;
  }
}

module.exports = new EventsService();
