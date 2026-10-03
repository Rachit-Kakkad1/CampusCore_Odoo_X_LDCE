const { pool } = require('../../config/database');

/**
 * Event and Ticket Repository
 * Handles all direct parameterized SQL queries for the Events module.
 */
class EventRepository {
  /**
   * Creates a new event record.
   * seats_remaining is initialized to capacity.
   */
  async createEvent({ title, venue, starts_at, capacity, member_price, non_member_price }) {
    const queryText = `
      INSERT INTO events (title, venue, starts_at, capacity, seats_remaining, member_price, non_member_price)
      VALUES ($1, $2, $3, $4, $4, $5, $6)
      RETURNING *;
    `;
    const result = await pool.query(queryText, [
      title,
      venue,
      starts_at,
      capacity,
      member_price,
      non_member_price,
    ]);
    return result.rows[0];
  }

  /**
   * Retrieves all events ordered by starts_at ASC.
   */
  async getAllEvents() {
    const queryText = `
      SELECT id, title, venue, starts_at, capacity, seats_remaining, member_price, non_member_price, created_at
      FROM events
      ORDER BY starts_at ASC;
    `;
    const result = await pool.query(queryText);
    return result.rows;
  }

  /**
   * Retrieves a single event by ID.
   */
  async getEventById(id, client = pool) {
    const queryText = `
      SELECT id, title, venue, starts_at, capacity, seats_remaining, member_price, non_member_price, created_at
      FROM events
      WHERE id = $1;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Selects an event row with row-level lock (FOR UPDATE) within a transaction.
   */
  async getEventByIdForUpdate(id, client) {
    const queryText = `
      SELECT id, title, venue, starts_at, capacity, seats_remaining, member_price, non_member_price
      FROM events
      WHERE id = $1
      FOR UPDATE;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Decrements seats_remaining atomically ensuring it never drops below 0.
   */
  async decrementSeat(id, client) {
    const queryText = `
      UPDATE events
      SET seats_remaining = seats_remaining - 1
      WHERE id = $1 AND seats_remaining > 0
      RETURNING *;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Computes real-time statistics for an event.
   */
  async getEventStats(eventId) {
    const queryText = `
      SELECT
        e.id,
        e.title,
        e.capacity,
        e.seats_remaining,
        COUNT(t.id) FILTER (WHERE t.payment_status = 'paid') AS tickets_sold,
        COUNT(t.id) FILTER (WHERE t.payment_status = 'paid' AND t.checked_in_at IS NOT NULL) AS tickets_checked_in,
        COALESCE(SUM(t.price) FILTER (WHERE t.payment_status = 'paid'), 0.00) AS ticket_revenue
      FROM events e
      LEFT JOIN tickets t ON e.id = t.event_id
      WHERE e.id = $1
      GROUP BY e.id, e.title, e.capacity, e.seats_remaining;
    `;
    const result = await pool.query(queryText, [eventId]);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      capacity: parseInt(row.capacity, 10),
      seats_remaining: parseInt(row.seats_remaining, 10),
      tickets_sold: parseInt(row.tickets_sold, 10),
      tickets_checked_in: parseInt(row.tickets_checked_in, 10),
      ticket_revenue: parseFloat(row.ticket_revenue),
    };
  }

  /**
   * Creates a ticket record (defaults to payment_status = 'pending').
   */
  async createTicket({
    ticket_code,
    event_id,
    user_id,
    price,
    price_type,
    payment_status = 'pending',
    checkout_session_id = null,
  }, client = pool) {
    const queryText = `
      INSERT INTO tickets (ticket_code, event_id, user_id, price, price_type, payment_status, checkout_session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const result = await client.query(queryText, [
      ticket_code,
      event_id,
      user_id,
      price,
      price_type,
      payment_status,
      checkout_session_id,
    ]);
    return result.rows[0];
  }

  /**
   * Retrieves a ticket by its ID.
   */
  async getTicketById(id, client = pool) {
    const queryText = `
      SELECT t.*, e.title as event_title, e.venue as event_venue, e.starts_at as event_starts_at
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      WHERE t.id = $1;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Selects a ticket with FOR UPDATE row lock within an active transaction.
   */
  async getTicketByIdForUpdate(id, client) {
    const queryText = `
      SELECT * FROM tickets
      WHERE id = $1
      FOR UPDATE;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Retrieves a ticket by ticket_code.
   */
  async getTicketByCode(ticketCode, client = pool) {
    const queryText = `
      SELECT t.*,
             u.name as user_name, u.email as user_email,
             e.title as event_title, e.venue as event_venue, e.starts_at as event_starts_at
      FROM tickets t
      JOIN users u ON t.user_id = u.id
      JOIN events e ON t.event_id = e.id
      WHERE t.ticket_code = $1;
    `;
    const result = await client.query(queryText, [ticketCode]);
    return result.rows[0] || null;
  }

  /**
   * Retrieves all tickets purchased by a specific user.
   */
  async getTicketsByUserId(userId) {
    const queryText = `
      SELECT t.id, t.ticket_code, t.event_id, t.price, t.price_type, t.payment_status,
             t.checked_in_at, t.created_at,
             e.title as event_title, e.venue as event_venue, e.starts_at as event_starts_at
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC;
    `;
    const result = await pool.query(queryText, [userId]);
    return result.rows;
  }

  /**
   * Updates a ticket's status to paid.
   */
  async markTicketPaid(ticketId, client) {
    const queryText = `
      UPDATE tickets
      SET payment_status = 'paid'
      WHERE id = $1
      RETURNING *;
    `;
    const result = await client.query(queryText, [ticketId]);
    return result.rows[0];
  }

  /**
   * Atomically marks a ticket as checked in if not already checked in.
   * Returns null if ticket was already checked in.
   */
  async atomicCheckIn(ticketId, checkedInBy, client = pool) {
    const queryText = `
      UPDATE tickets
      SET checked_in_at = NOW(), checked_in_by = $1
      WHERE id = $2 AND checked_in_at IS NULL
      RETURNING *;
    `;
    const result = await client.query(queryText, [checkedInBy, ticketId]);
    return result.rows[0] || null;
  }
}

module.exports = new EventRepository();
