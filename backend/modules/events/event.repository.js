// backend/modules/events/event.repository.js
const { pool, query } = require('../../config/database');

/**
 * Event and Ticket Repository
 * Handles all direct parameterized SQL queries for the Events module.
 */
class EventRepository {
  /**
   * Creates a new event record.
   */
  async createEvent(data, client = null) {
    const {
      title,
      description = null,
      venue,
      starts_at,
      capacity,
      seats_remaining,
      member_price,
      non_member_price,
      created_by = null,
    } = data;

    const queryText = `
      INSERT INTO events (title, description, venue, starts_at, capacity, seats_remaining, member_price, non_member_price, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *;
    `;
    const params = [
      title,
      description,
      venue,
      starts_at,
      capacity,
      seats_remaining !== undefined ? seats_remaining : capacity,
      member_price,
      non_member_price,
      created_by,
    ];
    const res = client ? await client.query(queryText, params) : await pool.query(queryText, params);
    return res.rows[0];
  }

  /**
   * Retrieves all events ordered by starts_at ASC.
   */
  async getAllEvents() {
    const queryText = `
      SELECT id, title, description, venue, starts_at, capacity, seats_remaining, member_price, non_member_price, created_by, created_at
      FROM events
      ORDER BY starts_at ASC;
    `;
    const result = await pool.query(queryText);
    return result.rows;
  }

  async findAll() {
    return this.getAllEvents();
  }

  /**
   * Retrieves a single event by ID.
   */
  async getEventById(id, client = pool) {
    const queryText = `
      SELECT id, title, description, venue, starts_at, capacity, seats_remaining, member_price, non_member_price, created_by, created_at
      FROM events
      WHERE id = $1;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  async findById(id, client = null) {
    return this.getEventById(id, client || pool);
  }

  /**
   * Selects an event row with row-level lock (FOR UPDATE) within a transaction.
   */
  async getEventByIdForUpdate(id, client) {
    const queryText = `
      SELECT id, title, description, venue, starts_at, capacity, seats_remaining, member_price, non_member_price
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

  async decrementSeats(eventId, client = null) {
    return this.decrementSeat(eventId, client || pool);
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
   * Creates an event attendee record.
   */
  async createAttendee({ name, email, mobile }, client = pool) {
    const queryText = `
      INSERT INTO event_attendees (name, email, mobile)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await client.query(queryText, [name, email, mobile]);
    return result.rows[0];
  }

  /**
   * Retrieves an event attendee by email.
   */
  async getAttendeeByEmail(email, client = pool) {
    const queryText = `
      SELECT * FROM event_attendees
      WHERE LOWER(email) = LOWER($1)
      ORDER BY id DESC
      LIMIT 1;
    `;
    const result = await client.query(queryText, [email]);
    return result.rows[0] || null;
  }

  /**
   * Creates a ticket record.
   */
  async createTicket(data, client = pool) {
    const {
      ticket_code,
      event_id,
      user_id = null,
      attendee_id = null,
      price,
      price_type,
      payment_status = 'paid',
      checkout_session_id = null,
    } = data;

    const queryText = `
      INSERT INTO tickets (ticket_code, event_id, user_id, attendee_id, price, price_type, payment_status, checkout_session_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;
    const result = await client.query(queryText, [
      ticket_code,
      event_id,
      user_id,
      attendee_id,
      price,
      price_type,
      payment_status,
      checkout_session_id,
    ]);
    return result.rows[0];
  }

  /**
   * Retrieves a ticket by its ID with user/attendee and event details.
   */
  async getTicketById(id, client = pool) {
    const queryText = `
      SELECT t.*,
             COALESCE(u.name, a.name) as user_name,
             COALESCE(u.email, a.email) as user_email,
             a.mobile as attendee_mobile,
             e.title as event_title, e.venue as event_venue, e.starts_at as event_starts_at
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN event_attendees a ON t.attendee_id = a.id
      JOIN events e ON t.event_id = e.id
      WHERE t.id = $1;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  async findTicketById(id, client = null) {
    return this.getTicketById(id, client || pool);
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
   * Retrieves a ticket by ticket_code supporting both registered user and attendee tickets.
   */
  async getTicketByCode(ticketCode, client = pool) {
    const queryText = `
      SELECT t.*,
             COALESCE(u.name, a.name) as user_name,
             COALESCE(u.email, a.email) as user_email,
             a.mobile as attendee_mobile,
             e.title as event_title, e.venue as event_venue, e.starts_at as event_starts_at
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN event_attendees a ON t.attendee_id = a.id
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

  async findTicketsByUserId(userId) {
    return this.getTicketsByUserId(userId);
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
