const eventsService = require('./events.service');
const ticketService = require('./ticket.service');
const checkinService = require('./checkin.service');
const getCurrentUser = require('../../shared/auth/getCurrentUser');

/**
 * Events Controller
 * Coordinates HTTP requests, inputs validation, and delegates to service layer.
 */
class EventsController {
  async createEvent(req, res) {
    try {
      const createdBy = req.user?.id || req.user?.userId || req.body.created_by || 1;
      const event = await eventsService.createEvent({
        ...req.body,
        created_by: createdBy,
      });
      return res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event,
        data: event,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAllEvents(req, res) {
    try {
      const { status, search, event_manager_id, manager_id } = req.query;
      const resolvedManagerId = event_manager_id || manager_id || null;
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');

      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      if (hasPagination) {
        const { page, pageSize, offset, sort, sortDirection } = parsePaginationParams(req.query, {
          defaultPageSize: 20,
          maxPageSize: 100,
          allowedSortFields: ['starts_at', 'created_at', 'id', 'title', 'capacity'],
          defaultSort: 'starts_at',
          defaultSortDirection: 'ASC',
        });

        const result = await eventsService.getAllEvents({
          status,
          search,
          event_manager_id: resolvedManagerId,
          page,
          pageSize,
          limit: pageSize,
          offset,
          sort,
          sortDirection,
        });

        const rows = result.rows || [];
        const totalItems = result.totalItems || 0;
        const responsePayload = buildPaginationResponse(rows, totalItems, page, pageSize);

        return res.status(200).json({
          ...responsePayload,
          events: rows,
        });
      }

      // Backward-compatible unpaginated query
      const events = await eventsService.getAllEvents({ status, search, event_manager_id: resolvedManagerId });
      const list = Array.isArray(events) ? events : (events.rows || []);
      return res.status(200).json({
        success: true,
        count: list.length,
        events: list,
        data: list,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  }

  async getEventById(req, res) {
    try {
      const event = await eventsService.getEventById(req.params.id);
      return res.status(200).json({
        success: true,
        event,
        data: event,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getEventStats(req, res) {
    try {
      const stats = await eventsService.getEventStats(req.params.id);
      return res.status(200).json({
        success: true,
        stats,
        data: stats,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async checkoutTicket(req, res) {
    try {
      const eventId = req.params.id;
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;
      const { checkout_session_id, attendee, name, email, mobile } = req.body;

      let attendeeData = attendee || null;
      if (!attendeeData && (name || email || mobile)) {
        attendeeData = { name, email, mobile };
      }

      if (!userId && !attendeeData) {
        return res.status(400).json({
          error: 'MISSING_ATTENDEE_INFO',
          message: 'Guest checkout requires attendee details (name, email, mobile), or login',
        });
      }

      const ticket = await ticketService.checkoutTicket(eventId, userId, checkout_session_id, attendeeData);
      return res.status(201).json({
        success: true,
        ticket,
        data: ticket,
        ...ticket,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async purchaseTicket(req, res) {
    try {
      const eventId = req.params.id || req.body.event_id;
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : req.body.user_id;
      const { payment_mode = 'online' } = req.body || {};

      const ticket = await eventsService.purchaseTicket(eventId, userId, { payment_mode });
      return res.status(201).json({
        success: true,
        message: 'Ticket purchased successfully',
        ticket,
        data: ticket,
        ...ticket,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async payTicket(req, res) {
    try {
      const ticketId = req.params.id;
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;
      const { payment_mode, email } = req.body || {};

      const ticket = await ticketService.payTicket(ticketId, userId, payment_mode || 'online', email);
      return res.status(200).json({
        success: true,
        message: 'Payment successful',
        ticket,
        data: ticket,
        ...ticket,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getMyTickets(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : req.headers['x-user-id'];
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      const tickets = await eventsService.getUserTickets(userId);
      const list = Array.isArray(tickets) ? tickets : (tickets.rows || []);

      if (hasPagination) {
        const { page, pageSize, offset } = parsePaginationParams(req.query, {
          defaultPageSize: 10,
          maxPageSize: 100,
        });

        const pagedData = list.slice(offset, offset + pageSize);
        const responsePayload = buildPaginationResponse(pagedData, list.length, page, pageSize);
        return res.status(200).json({
          ...responsePayload,
          tickets: pagedData,
        });
      }

      return res.status(200).json({
        success: true,
        count: list.length,
        tickets: list,
        data: list,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  }

  async getTicketQR(req, res) {
    try {
      const ticketId = req.params.id;
      const userId = req.user ? (req.user.id || req.user.userId) : null;

      const qrResult = await ticketService.getTicketQR(ticketId, userId);
      return res.status(200).json(qrResult);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async scanCheckIn(req, res) {
    try {
      const payload = req.body.payload || req.body.code || req.body.ticket_code || req.body.qr_data || req.body.qrData;
      if (!payload) {
        return res.status(400).json({ error: 'MISSING_PAYLOAD', message: 'Payload or ticket code is required for check-in' });
      }

      const checkedInBy = req.user ? (req.user.id || req.user.userId) : null;
      const expectedEventId = req.body.event_id || req.params.id || null;
      const result = await checkinService.processScan(payload, checkedInBy, expectedEventId);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async updateEvent(req, res) {
    try {
      const event = await eventsService.updateEvent(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        event,
        data: event,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async cancelEvent(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const actor = req.user || getCurrentUser(req);
      const actorId = actor ? (actor.id || actor.userId) : null;
      const result = await eventsService.cancelEvent(id, actorId, reason, req);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async applyAsVolunteer(req, res) {
    try {
      const eventId = req.params.id;
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;

      if (!userId) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required to apply as a volunteer' });
      }

      const result = await eventsService.applyAsVolunteer(eventId, userId);
      return res.status(201).json({
        success: true,
        message: 'Volunteer application submitted successfully',
        data: result,
        ...result,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getEventVolunteers(req, res) {
    try {
      const eventId = req.params.id;
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      const volunteers = await eventsService.getEventVolunteers(eventId);
      const list = Array.isArray(volunteers) ? volunteers : (volunteers.rows || []);

      if (hasPagination) {
        const { page, pageSize, offset } = parsePaginationParams(req.query, {
          defaultPageSize: 15,
          maxPageSize: 100,
        });

        const pagedData = list.slice(offset, offset + pageSize);
        const responsePayload = buildPaginationResponse(pagedData, list.length, page, pageSize);
        return res.status(200).json({
          ...responsePayload,
          volunteers: pagedData,
        });
      }

      return res.status(200).json({
        success: true,
        count: list.length,
        volunteers: list,
        data: list,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  }

  async updateVolunteerStatus(req, res) {
    try {
      const applicationId = req.params.applicationId || req.params.appId;
      const { status } = req.body;
      const actor = req.user || getCurrentUser(req);
      const actorId = actor ? (actor.id || actor.userId) : null;

      const updated = await eventsService.updateVolunteerStatus(applicationId, status, actorId);
      return res.status(200).json({
        success: true,
        message: `Volunteer application marked as ${status}`,
        application: updated,
        data: updated,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async removeVolunteer(req, res) {
    try {
      const applicationId = req.params.applicationId || req.params.appId;
      const actor = req.user || getCurrentUser(req);
      const actorId = actor ? (actor.id || actor.userId) : null;

      const updated = await eventsService.updateVolunteerStatus(applicationId, 'removed', actorId);
      return res.status(200).json({
        success: true,
        message: 'Volunteer removed from event',
        application: updated,
        data: updated,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async addVolunteer(req, res) {
    try {
      const eventId = req.params.id;
      const { user_id, userId } = req.body || {};
      const targetUserId = user_id || userId;
      const actor = req.user || getCurrentUser(req);
      const actorId = actor ? (actor.id || actor.userId) : null;

      if (!targetUserId) {
        return res.status(400).json({ error: 'MISSING_USER_ID', message: 'User ID is required to add volunteer' });
      }

      const result = await eventsService.addVolunteer(eventId, targetUserId, actorId);
      return res.status(201).json({
        success: true,
        message: 'Volunteer added to event successfully',
        volunteer: result,
        data: result,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getMyVolunteerApplications(req, res) {
    try {
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;

      if (!userId) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');
      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      const applications = await eventsService.getUserVolunteerApplications(userId);
      const list = Array.isArray(applications) ? applications : (applications.rows || []);

      if (hasPagination) {
        const { page, pageSize, offset } = parsePaginationParams(req.query, {
          defaultPageSize: 10,
          maxPageSize: 100,
        });

        const pagedData = list.slice(offset, offset + pageSize);
        const responsePayload = buildPaginationResponse(pagedData, list.length, page, pageSize);
        return res.status(200).json({
          ...responsePayload,
          applications: pagedData,
        });
      }

      return res.status(200).json({
        success: true,
        count: list.length,
        applications: list,
        data: list,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  }

  async getVolunteerOpportunities(req, res) {
    try {
      const user = req.user || getCurrentUser(req);
      const userId = user ? (user.id || user.userId) : null;

      const opportunities = await eventsService.getVolunteerOpportunities(userId);
      return res.status(200).json({
        success: true,
        count: opportunities.length,
        events: opportunities,
        data: opportunities,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  /**
   * Admin / Event Manager: List all tickets with rich filtering, search, sorting and database pagination.
   */
  async getAllTicketsAdmin(req, res) {
    try {
      const { search, buyer_type, payment_status, check_in_status, event_id, from_date, to_date } = req.query;
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');

      // Scope to event manager's events if role is event_manager
      let managerId = null;
      if (req.user && req.user.role === 'event_manager') {
        managerId = req.user.id || req.user.userId;
      }

      const { page, pageSize, offset, sort, sortDirection } = parsePaginationParams(req.query, {
        defaultPageSize: 20,
        maxPageSize: 100,
        allowedSortFields: ['created_at', 'price', 'event_date', 'event_starts_at', 'buyer_name', 'checked_in_at', 'id'],
        defaultSort: 'created_at',
        defaultSortDirection: 'DESC',
      });

      const result = await eventsService.getAllTicketsAdmin({
        search,
        buyer_type,
        payment_status,
        check_in_status,
        event_id,
        from_date,
        to_date,
        manager_id: managerId,
        page,
        pageSize,
        limit: pageSize,
        offset,
        sort,
        sortDirection,
      });

      const rows = result.rows || [];
      const totalItems = result.totalItems || 0;
      const responsePayload = buildPaginationResponse(rows, totalItems, page, pageSize);

      return res.status(200).json({
        ...responsePayload,
        total: totalItems,
        totalItems,
        tickets: rows,
        items: rows,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  }

  /**
   * Admin / Event Manager: Detailed single ticket inspection with audit history.
   */
  async getTicketDetailsAdmin(req, res) {
    try {
      const { id } = req.params;
      let managerId = null;
      if (req.user && req.user.role === 'event_manager') {
        managerId = req.user.id || req.user.userId;
      }

      const ticket = await eventsService.getTicketDetailsAdmin(id, managerId);

      // Audit log the view by admin
      const auditService = require('../../shared/audit/audit.service');
      await auditService.recordLog({
        actorId: req.user?.id || req.user?.userId,
        action: 'TICKET_VIEWED_BY_ADMIN',
        entityType: 'ticket',
        entityId: ticket.id,
        metadata: { ticket_code: ticket.ticket_code, event_id: ticket.event_id },
        req,
      });

      return res.status(200).json({
        success: true,
        ticket,
        data: ticket,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  }
}

module.exports = new EventsController();
