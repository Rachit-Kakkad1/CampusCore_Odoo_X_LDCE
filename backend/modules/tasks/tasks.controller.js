// backend/modules/tasks/tasks.controller.js
const tasksService = require('./tasks.service');
const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');

const tasksController = {
  /**
   * Get all tasks with pagination, search, and filters
   */
  async getAllTasks(req, res) {
    try {
      const { search, priority, status, event_id, fundraiser_id, assignee_id, volunteer_id } = req.query;

      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      if (hasPagination) {
        const { page, pageSize, offset, sort, sortDirection } = parsePaginationParams(req.query, {
          defaultPageSize: 20,
          maxPageSize: 100,
          allowedSortFields: ['id', 'created_at', 'due_date', 'priority', 'status', 'title'],
          defaultSort: 'id',
          defaultSortDirection: 'ASC',
        });

        const result = await tasksService.getAllTasks({
          search,
          priority,
          status,
          event_id: event_id ? parseInt(event_id, 10) : undefined,
          fundraiser_id: fundraiser_id ? parseInt(fundraiser_id, 10) : undefined,
          assignee_id: (assignee_id || volunteer_id) ? parseInt(assignee_id || volunteer_id, 10) : undefined,
          page,
          pageSize,
          limit: pageSize,
          offset,
          sort,
          sortDirection,
        }, req.user);

        const rows = result.rows || [];
        const totalItems = result.totalItems || 0;
        const responsePayload = buildPaginationResponse(rows, totalItems, page, pageSize);

        return res.status(200).json({
          ...responsePayload,
          tasks: rows,
          items: rows,
        });
      }

      // Backward compatible unpaginated response
      const tasks = await tasksService.getAllTasks({
        search,
        priority,
        status,
        event_id: event_id ? parseInt(event_id, 10) : undefined,
        fundraiser_id: fundraiser_id ? parseInt(fundraiser_id, 10) : undefined,
        assignee_id: (assignee_id || volunteer_id) ? parseInt(assignee_id || volunteer_id, 10) : undefined,
      }, req.user);

      const list = Array.isArray(tasks) ? tasks : (tasks.rows || []);
      return res.status(200).json(list);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  },

  /**
   * Get tasks assigned exclusively to logged-in user / volunteer
   */
  async getMyTasks(req, res) {
    try {
      const userId = req.user.id || req.user.userId;
      const { search, priority, status } = req.query;

      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      if (hasPagination) {
        const { page, pageSize, offset, sort, sortDirection } = parsePaginationParams(req.query, {
          defaultPageSize: 20,
          maxPageSize: 100,
          allowedSortFields: ['id', 'created_at', 'due_date', 'priority', 'status', 'title'],
          defaultSort: 'due_date',
          defaultSortDirection: 'ASC',
        });

        const result = await tasksService.getMyTasks(userId, {
          search,
          priority,
          status,
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
          tasks: rows,
          items: rows,
        });
      }

      const tasks = await tasksService.getMyTasks(userId, { search, priority, status });
      const list = Array.isArray(tasks) ? tasks : (tasks.rows || []);
      return res.status(200).json(list);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  },

  /**
   * Get task by ID
   */
  async getTaskById(req, res) {
    try {
      const task = await tasksService.getTaskById(req.params.id, req.user);
      return res.status(200).json(task);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  },

  /**
   * Create a new task (Admin / Event Manager)
   */
  async createTask(req, res) {
    try {
      const task = await tasksService.createTask(
        req.body,
        req.user,
        req
      );
      return res.status(201).json(task);
    } catch (err) {
      const status = err.status || 400;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  },

  /**
   * Update task status (with state machine transition & duplicate completion protection)
   */
  async updateTaskStatus(req, res) {
    try {
      const { status } = req.body;
      const task = await tasksService.updateTaskStatus(req.params.id, status, req.user, req);
      return res.status(200).json(task);
    } catch (err) {
      const status = err.status || 400;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  },

  /**
   * Delete task
   */
  async deleteTask(req, res) {
    try {
      const task = await tasksService.deleteTask(req.params.id, req.user, req);
      return res.status(200).json({ message: 'Task deleted successfully', task });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  }
};

module.exports = tasksController;
