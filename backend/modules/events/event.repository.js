// backend/modules/events/event.repository.js
const { pool, query } = require('../../config/database');
const { generateUniqueFallbackCode } = require('../../shared/qr/generateFallbackCode');

/**
 * Event and Ticket Repository
 * Handles all direct parameterized SQL queries for the Events module.
 */
class EventRepository {
  /**
   * Creates a new event record with optional volunteer requirements and ends_at.
   */
  async createEvent(data, client = null) {
    const {
      title,
      description = null,
      venue,
      starts_at,
      ends_at = null,
      capacity,
      seats_remaining,
      member_price,
      non_member_price,
      volunteers_enabled = false,
      volunteers_required = 0,
      event_manager_id = null,
      created_by = null,
    } = data;

    const resolvedEndsAt = ends_at || new Date(new Date(starts_at).getTime() + 3 * 60 * 60 * 1000).toISOString();

    const queryText = `
      INSERT INTO events (title, description, venue, starts_at, ends_at, capacity, seats_remaining, member_price, non_member_price, volunteers_enabled, volunteers_required, event_manager_id, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *;
    `;
    const params = [
      title,
      description,
      venue,
      starts_at,
      resolvedEndsAt,
      capacity,
      seats_remaining !== undefined ? seats_remaining : capacity,
      member_price,
      non_member_price,
      Boolean(volunteers_enabled),
      parseInt(volunteers_required || 0, 10),
      event_manager_id || null,
      created_by,
    ];
    const res = client ? await client.query(queryText, params) : await pool.query(queryText, params);
    return res.rows[0];
  }

  /**
   * Retrieves events with optional server-side pagination, status filtering, search, and deterministic ordering.
   */
  async getAllEvents(filter = {}) {
    const {
      status = null,
      search = null,
      event_manager_id = null,
      page = null,
      pageSize = null,
      limit = null,
      offset = 0,
      sort = 'starts_at',
      sortDirection = 'ASC',
    } = filter;

    const where = [];
    const params = [];

    // Filter by computed/actual status
    if (status && status !== 'all' && status !== 'ALL') {
      const s = status.toLowerCase();
      if (s === 'cancelled') {
        where.push(`e.status = 'cancelled'`);
      } else if (s === 'upcoming') {
        where.push(`e.status != 'cancelled' AND NOW() < e.starts_at`);
      } else if (s === 'live') {
        where.push(`e.status != 'cancelled' AND NOW() >= e.starts_at AND NOW() <= COALESCE(e.ends_at, e.starts_at + INTERVAL '3 hours')`);
      } else if (s === 'past') {
        where.push(`e.status != 'cancelled' AND NOW() > COALESCE(e.ends_at, e.starts_at + INTERVAL '3 hours')`);
      }
    }

    if (event_manager_id) {
      params.push(parseInt(event_manager_id, 10));
      where.push(`e.event_manager_id = $${params.length}`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const idx = params.length;
      where.push(`(e.title ILIKE $${idx} OR e.venue ILIKE $${idx} OR e.description ILIKE $${idx})`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const effectiveLimit = pageSize || limit;
    const isPaginated = effectiveLimit !== null && effectiveLimit !== undefined;

    let totalItems = 0;
    if (isPaginated) {
      const countSql = `SELECT COUNT(*)::int AS total FROM events e ${whereClause};`;
      const countRes = await pool.query(countSql, params);
      totalItems = countRes.rows[0] ? parseInt(countRes.rows[0].total, 10) : 0;
    }

    const safeSortCol = ['starts_at', 'created_at', 'id', 'title', 'capacity'].includes(sort)
      ? `e.${sort}`
      : 'e.starts_at';
    const safeDir = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let queryText = `
      SELECT e.id, e.title, e.description, e.venue, e.starts_at, e.ends_at, e.capacity, e.seats_remaining,
             e.member_price, e.non_member_price, e.volunteers_enabled, e.volunteers_required,
             e.status, e.cancelled_at, e.cancelled_by, e.cancellation_reason,
             e.event_manager_id, u_em.name AS event_manager_name, u_em.email AS event_manager_email,
             e.created_by, e.created_at,
             CASE
               WHEN e.status = 'cancelled' THEN 'cancelled'
               WHEN NOW() < e.starts_at THEN 'upcoming'
               WHEN NOW() >= e.starts_at AND NOW() <= COALESCE(e.ends_at, e.starts_at + INTERVAL '3 hours') THEN 'live'
               ELSE 'past'
             END AS computed_status,
             (SELECT COUNT(*)::int FROM event_volunteers ev WHERE ev.event_id = e.id AND ev.status IN ('pending', 'approved')) AS volunteers_applied,
             GREATEST(0, e.volunteers_required - (SELECT COUNT(*)::int FROM event_volunteers ev WHERE ev.event_id = e.id AND ev.status IN ('pending', 'approved'))) AS volunteers_remaining
      FROM events e
      LEFT JOIN users u_em ON e.event_manager_id = u_em.id
      ${whereClause}
      ORDER BY ${safeSortCol} ${safeDir}, e.id ${safeDir}
    `;

    const dataParams = [...params];
    if (isPaginated) {
      dataParams.push(effectiveLimit, offset);
      queryText += ` LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`;
    }

    const result = await pool.query(queryText, dataParams);
    const rows = result.rows;

    if (isPaginated) {
      return {
        rows,
        totalItems,
      };
    }

    return rows;
  }

  async findAll(filter = {}) {
    return this.getAllEvents(filter);
  }

  /**
   * Retrieves a single event by ID with computed_status and volunteer metrics.
   */
  async getEventById(id, client = pool) {
    const queryText = `
      SELECT e.id, e.title, e.description, e.venue, e.starts_at, e.ends_at, e.capacity, e.seats_remaining,
             e.member_price, e.non_member_price, e.volunteers_enabled, e.volunteers_required,
             e.status, e.cancelled_at, e.cancelled_by, e.cancellation_reason,
             e.event_manager_id, u_em.name AS event_manager_name, u_em.email AS event_manager_email,
             e.created_by, e.created_at,
             CASE
               WHEN e.status = 'cancelled' THEN 'cancelled'
               WHEN NOW() < e.starts_at THEN 'upcoming'
               WHEN NOW() >= e.starts_at AND NOW() <= COALESCE(e.ends_at, e.starts_at + INTERVAL '3 hours') THEN 'live'
               ELSE 'past'
             END AS computed_status,
             (SELECT COUNT(*)::int FROM event_volunteers ev WHERE ev.event_id = e.id AND ev.status IN ('pending', 'approved')) AS volunteers_applied,
             GREATEST(0, e.volunteers_required - (SELECT COUNT(*)::int FROM event_volunteers ev WHERE ev.event_id = e.id AND ev.status IN ('pending', 'approved'))) AS volunteers_remaining
      FROM events e
      LEFT JOIN users u_em ON e.event_manager_id = u_em.id
      WHERE e.id = $1;
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
      SELECT id, title, description, venue, starts_at, ends_at, capacity, seats_remaining,
             member_price, non_member_price, volunteers_enabled, volunteers_required,
             event_manager_id, status, cancelled_at, cancelled_by, cancellation_reason
      FROM events
      WHERE id = $1
      FOR UPDATE;
    `;
    const result = await client.query(queryText, [id]);
    return result.rows[0] || null;
  }

  /**
   * Updates an existing event record.
   */
  async updateEvent(id, data, client = pool) {
    const fields = [];
    const values = [];
    let idx = 1;

    const allowed = [
      'title', 'description', 'venue', 'starts_at', 'ends_at',
      'capacity', 'seats_remaining', 'member_price', 'non_member_price',
      'volunteers_enabled', 'volunteers_required', 'event_manager_id'
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(data[key]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return await this.getEventById(id, client);
    }

    values.push(id);
    const queryText = `
      UPDATE events
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await client.query(queryText, values);
    return res.rows[0] || null;
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
  /**
   * Creates a ticket record with guaranteed unique human-readable fallback code.
   */
  async createTicket(data, client = pool) {
    let {
      ticket_code,
      fallback_code = null,
      event_id,
      user_id = null,
      attendee_id = null,
      price,
      price_type,
      payment_status = 'paid',
      checkout_session_id = null,
    } = data;

    if (!fallback_code) {
      fallback_code = await generateUniqueFallbackCode(client);
    }

    const queryText = `
      INSERT INTO tickets (ticket_code, fallback_code, event_id, user_id, attendee_id, price, price_type, payment_status, checkout_session_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *;
    `;
    const result = await client.query(queryText, [
      ticket_code,
      fallback_code,
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
   * Retrieves a ticket by ticket_code OR short fallback_code (case-insensitive).
   * Supports both registered user and attendee tickets.
   */
  async getTicketByCode(ticketCode, client = pool) {
    if (!ticketCode) return null;
    const cleanCode = ticketCode.trim();
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
      WHERE t.ticket_code = $1 OR UPPER(t.fallback_code) = UPPER($1);
    `;
    const result = await client.query(queryText, [cleanCode]);
    return result.rows[0] || null;
  }

  /**
   * Retrieves all tickets purchased by a specific user.
   */
  async getTicketsByUserId(userId) {
    const queryText = `
      SELECT t.id, t.ticket_code, t.fallback_code, t.event_id, t.price, t.price_type, t.payment_status,
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

  // =========================================================================
  // VOLUNTEER APPLICATION METHODS
  // =========================================================================

  /**
   * Applies a volunteer for an event.
   */
  async applyAsVolunteer({ event_id, user_id }, client = pool) {
    const queryText = `
      INSERT INTO event_volunteers (event_id, user_id, status, applied_at, created_at, updated_at)
      VALUES ($1, $2, 'pending', NOW(), NOW(), NOW())
      RETURNING *;
    `;
    const res = await client.query(queryText, [event_id, user_id]);
    return res.rows[0];
  }

  /**
   * Counts active volunteer applications (pending or approved).
   */
  async getActiveVolunteerCount(eventId, client = pool) {
    const queryText = `
      SELECT COUNT(*)::int as count
      FROM event_volunteers
      WHERE event_id = $1 AND status IN ('pending', 'approved');
    `;
    const res = await client.query(queryText, [eventId]);
    return res.rows[0] ? parseInt(res.rows[0].count, 10) : 0;
  }

  /**
   * Checks if user already applied for this event.
   */
  async getVolunteerApplicationByUserAndEvent(eventId, userId, client = pool) {
    const queryText = `
      SELECT * FROM event_volunteers
      WHERE event_id = $1 AND user_id = $2;
    `;
    const res = await client.query(queryText, [eventId, userId]);
    return res.rows[0] || null;
  }

  /**
   * Retrieves all volunteer applications for an event with user details and real task metrics.
   */
  async getVolunteerApplications(eventId, client = pool) {
    const queryText = `
      SELECT ev.*,
             u.name as user_name, u.email as user_email, u.role as user_role, u.phone as user_phone,
             app_u.name as approved_by_name,
             rem_u.name as removed_by_name,
             (SELECT COUNT(*)::int FROM tasks t WHERE t.event_id = ev.event_id AND t.assignee_id = ev.user_id) AS task_count,
             (SELECT COUNT(*)::int FROM tasks t WHERE t.event_id = ev.event_id AND t.assignee_id = ev.user_id AND UPPER(t.status) = 'COMPLETED') AS completed_tasks,
             (SELECT COUNT(*)::int FROM tasks t WHERE t.event_id = ev.event_id AND t.assignee_id = ev.user_id AND UPPER(t.status) IN ('TODO', 'PENDING', 'IN_PROGRESS')) AS pending_tasks
      FROM event_volunteers ev
      JOIN users u ON ev.user_id = u.id
      LEFT JOIN users app_u ON ev.approved_by = app_u.id
      LEFT JOIN users rem_u ON ev.removed_by = rem_u.id
      WHERE ev.event_id = $1
      ORDER BY ev.applied_at ASC;
    `;
    const res = await client.query(queryText, [eventId]);
    return res.rows;
  }

  /**
   * Retrieves a single volunteer application by ID.
   */
  async getVolunteerApplicationById(applicationId, client = pool) {
    const queryText = `
      SELECT ev.*,
             u.name as user_name, u.email as user_email,
             e.title as event_title, e.volunteers_required, e.volunteers_enabled
      FROM event_volunteers ev
      JOIN users u ON ev.user_id = u.id
      JOIN events e ON ev.event_id = e.id
      WHERE ev.id = $1;
    `;
    const res = await client.query(queryText, [applicationId]);
    return res.rows[0] || null;
  }

  /**
   * Updates volunteer application status (approved, rejected, removed) with audit fields.
   */
  async updateVolunteerApplicationStatus(applicationId, { status, approved_by = null, removed_by = null }, client = pool) {
    const queryText = `
      UPDATE event_volunteers
      SET status = $2::varchar,
          approved_at = CASE WHEN $2::varchar = 'approved' THEN NOW() ELSE approved_at END,
          approved_by = CASE WHEN $2::varchar = 'approved' THEN $3::int ELSE approved_by END,
          removed_at = CASE WHEN $2::varchar = 'removed' THEN NOW() ELSE removed_at END,
          removed_by = CASE WHEN $2::varchar = 'removed' THEN $4::int ELSE removed_by END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;
    const res = await client.query(queryText, [applicationId, status, approved_by, removed_by]);
    return res.rows[0] || null;
  }

  /**
   * Retrieves all event applications submitted by a user.
   */
  async getUserVolunteerApplications(userId, client = pool) {
    const queryText = `
      SELECT ev.*,
             e.title as event_title, e.venue as event_venue, e.starts_at as event_starts_at,
             e.ends_at as event_ends_at, e.volunteers_required,
             (SELECT COUNT(*)::int FROM event_volunteers ev2 WHERE ev2.event_id = e.id AND ev2.status IN ('pending', 'approved')) as volunteers_applied,
             GREATEST(0, e.volunteers_required - (SELECT COUNT(*)::int FROM event_volunteers ev2 WHERE ev2.event_id = e.id AND ev2.status IN ('pending', 'approved'))) as volunteers_remaining
      FROM event_volunteers ev
      JOIN events e ON ev.event_id = e.id
      WHERE ev.user_id = $1
      ORDER BY ev.applied_at DESC;
    `;
    const res = await client.query(queryText, [userId]);
    return res.rows;
  }

  /**
   * Directly adds/assigns a volunteer to an event (Admin / Event Manager).
   */
  async addVolunteer({ event_id, user_id, status = 'approved', approved_by = null }, client = pool) {
    const queryText = `
      INSERT INTO event_volunteers (event_id, user_id, status, applied_at, approved_at, approved_by, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW(), $4, NOW(), NOW())
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET status = EXCLUDED.status,
                    approved_at = NOW(),
                    approved_by = EXCLUDED.approved_by,
                    updated_at = NOW()
      RETURNING *;
    `;
    const res = await client.query(queryText, [event_id, user_id, status, approved_by]);
    return res.rows[0];
  }

  /**
   * Admin / Event Manager: Retrieves paginated tickets across the platform with rich joins.
   */
  async getAllTicketsAdmin({
    search,
    buyer_type,
    payment_status,
    check_in_status,
    event_id,
    from_date,
    to_date,
    manager_id = null,
    page = 1,
    pageSize = 20,
    limit,
    offset = 0,
    sort = 'created_at',
    sortDirection = 'DESC',
  } = {}, client = pool) {
    const conditions = [];
    const params = [];

    // Filter by Event Manager scope if restricted
    if (manager_id) {
      params.push(parseInt(manager_id, 10));
      conditions.push(`(e.event_manager_id = $${params.length} OR e.created_by = $${params.length})`);
    }

    // Filter by specific Event ID
    if (event_id) {
      params.push(parseInt(event_id, 10));
      conditions.push(`t.event_id = $${params.length}`);
    }

    // Filter by Buyer Type (member vs guest)
    if (buyer_type) {
      const bType = String(buyer_type).toUpperCase();
      if (bType === 'MEMBER') {
        conditions.push(`t.user_id IS NOT NULL`);
      } else if (bType === 'GUEST' || bType === 'NON_MEMBER') {
        conditions.push(`t.attendee_id IS NOT NULL`);
      }
    }

    // Filter by Payment Status
    if (payment_status && payment_status !== 'ALL') {
      params.push(payment_status.toLowerCase());
      conditions.push(`LOWER(t.payment_status) = $${params.length}`);
    }

    // Filter by Check-In Status
    if (check_in_status && check_in_status !== 'ALL') {
      const cStatus = String(check_in_status).toUpperCase();
      if (cStatus === 'CHECKED_IN') {
        conditions.push(`t.checked_in_at IS NOT NULL`);
      } else if (cStatus === 'NOT_CHECKED_IN') {
        conditions.push(`t.checked_in_at IS NULL`);
      }
    }

    // Date Range Filters
    if (from_date) {
      params.push(new Date(from_date).toISOString());
      conditions.push(`t.created_at >= $${params.length}`);
    }
    if (to_date) {
      params.push(new Date(to_date).toISOString());
      conditions.push(`t.created_at <= $${params.length}`);
    }

    // Search query parameterized across safe fields
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      const isNum = !isNaN(parseInt(search.trim(), 10));
      params.push(term);
      const searchParamIdx = params.length;

      let searchClause = `(
        u.name ILIKE $${searchParamIdx} OR
        a.name ILIKE $${searchParamIdx} OR
        u.email ILIKE $${searchParamIdx} OR
        a.email ILIKE $${searchParamIdx} OR
        u.phone ILIKE $${searchParamIdx} OR
        a.mobile ILIKE $${searchParamIdx} OR
        t.ticket_code ILIKE $${searchParamIdx} OR
        t.fallback_code ILIKE $${searchParamIdx} OR
        t.checkout_session_id ILIKE $${searchParamIdx} OR
        e.title ILIKE $${searchParamIdx}
      `;
      if (isNum) {
        params.push(parseInt(search.trim(), 10));
        searchClause += ` OR t.id = $${params.length}`;
      }
      searchClause += `)`;
      conditions.push(searchClause);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total Count Query
    const countSql = `
      SELECT COUNT(DISTINCT t.id)::int as total
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN event_attendees a ON t.attendee_id = a.id
      LEFT JOIN transactions tx ON tx.source_type = 'ticket' AND tx.source_id = t.id
      ${whereClause};
    `;
    const countRes = await client.query(countSql, params);
    const totalItems = countRes.rows[0]?.total || 0;

    // Safe Sort Mapping
    const sortFieldMap = {
      created_at: 't.created_at',
      price: 't.price',
      event_date: 'e.starts_at',
      event_starts_at: 'e.starts_at',
      buyer_name: 'COALESCE(u.name, a.name)',
      checked_in_at: 't.checked_in_at',
      id: 't.id',
    };
    const sortColumn = sortFieldMap[sort] || 't.created_at';
    const direction = (sortDirection || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Pagination Limit / Offset
    const take = limit || pageSize || 20;
    const skip = offset || (page - 1) * take;

    const dataParams = [...params, take, skip];
    const dataSql = `
      SELECT 
        t.id,
        t.ticket_code,
        t.fallback_code,
        t.event_id,
        t.user_id,
        t.attendee_id,
        t.price,
        t.price_type,
        t.payment_status,
        t.checkout_session_id,
        t.checked_in_at,
        t.created_at,
        e.title AS event_title,
        e.venue AS event_venue,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.status AS event_status,
        e.event_manager_id,
        COALESCE(u.name, a.name) AS buyer_name,
        COALESCE(u.email, a.email) AS buyer_email,
        COALESCE(u.phone, a.mobile) AS buyer_phone,
        CASE WHEN t.user_id IS NOT NULL THEN 'MEMBER' ELSE 'GUEST' END AS buyer_type,
        m.member_code,
        m.status AS membership_status,
        tx.id AS transaction_id,
        COALESCE(t.checkout_session_id, CONCAT('TXN-', tx.id)) AS payment_reference,
        tx.payment_mode,
        ci_u.name AS checked_in_by_name
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN memberships m ON u.id = m.user_id
      LEFT JOIN event_attendees a ON t.attendee_id = a.id
      LEFT JOIN transactions tx ON tx.source_type = 'ticket' AND tx.source_id = t.id
      LEFT JOIN users ci_u ON t.checked_in_by = ci_u.id
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}, t.id DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
    `;

    const dataRes = await client.query(dataSql, dataParams);
    return {
      rows: dataRes.rows,
      totalItems,
    };
  }

  /**
   * Retrieves single ticket detailed view for admin with audit trail.
   */
  async getTicketDetailsAdmin(ticketId, managerId = null, client = pool) {
    const params = [parseInt(ticketId, 10)];
    let mgrClause = '';
    if (managerId) {
      params.push(parseInt(managerId, 10));
      mgrClause = `AND (e.event_manager_id = $2 OR e.created_by = $2)`;
    }

    const queryText = `
      SELECT 
        t.id,
        t.ticket_code,
        t.fallback_code,
        t.event_id,
        t.user_id,
        t.attendee_id,
        t.price,
        t.price_type,
        t.payment_status,
        t.checkout_session_id,
        t.checked_in_at,
        t.created_at,
        e.title AS event_title,
        e.description AS event_description,
        e.venue AS event_venue,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.status AS event_status,
        e.event_manager_id,
        COALESCE(u.name, a.name) AS buyer_name,
        COALESCE(u.email, a.email) AS buyer_email,
        COALESCE(u.phone, a.mobile) AS buyer_phone,
        CASE WHEN t.user_id IS NOT NULL THEN 'MEMBER' ELSE 'GUEST' END AS buyer_type,
        m.member_code,
        m.status AS membership_status,
        tx.id AS transaction_id,
        COALESCE(t.checkout_session_id, CONCAT('TXN-', tx.id)) AS payment_reference,
        tx.payment_mode,
        tx.created_at AS payment_time,
        ci_u.name AS checked_in_by_name
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN memberships m ON u.id = m.user_id
      LEFT JOIN event_attendees a ON t.attendee_id = a.id
      LEFT JOIN transactions tx ON tx.source_type = 'ticket' AND tx.source_id = t.id
      LEFT JOIN users ci_u ON t.checked_in_by = ci_u.id
      WHERE t.id = $1 ${mgrClause};
    `;
    const res = await client.query(queryText, params);
    const ticket = res.rows[0];
    if (!ticket) return null;

    // Fetch related audit trail
    const auditRes = await client.query(`
      SELECT id, action, entity_type, entity_id, metadata, created_at
      FROM audit_logs
      WHERE (entity_type = 'ticket' AND entity_id = $1)
         OR (metadata->>'ticket_id' = $1::text)
      ORDER BY created_at DESC
      LIMIT 10;
    `, [ticket.id]);

    return {
      ...ticket,
      audit_logs: auditRes.rows,
    };
  }
}

module.exports = new EventRepository();
