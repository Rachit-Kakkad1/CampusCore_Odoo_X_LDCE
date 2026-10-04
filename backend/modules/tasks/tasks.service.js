// backend/modules/tasks/tasks.service.js
const { pool } = require('../../config/database');
const tasksRepository = require('./tasks.repository');
const eventRepository = require('../events/event.repository');
const authRepository = require('../auth/auth.repository');
const auditService = require('../../shared/audit/audit.service');
const notificationService = require('../notifications/notification.service');

const tasksService = {
  /**
   * Get all tasks with authorization and filters
   */
  async getAllTasks(filters = {}, user = null) {
    const queryFilters = { ...filters };

    // Scoped access if user is Event Manager
    if (user && user.role === 'event_manager') {
      queryFilters.manager_id = user.id || user.userId;
    }

    return await tasksRepository.getAllTasks(queryFilters);
  },

  /**
   * Get tasks assigned exclusively to logged-in user / volunteer
   */
  async getMyTasks(userId, filters = {}) {
    if (!userId) {
      const err = new Error('Authentication required');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }
    return await tasksRepository.getAllTasks({
      ...filters,
      assignee_id: userId,
    });
  },

  /**
   * Get task by ID with authorization check
   */
  async getTaskById(id, user = null) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      const err = new Error('Invalid task ID');
      err.status = 400;
      err.code = 'INVALID_ID';
      throw err;
    }

    const task = await tasksRepository.getTaskById(parsedId);
    if (!task) {
      const err = new Error('Task not found');
      err.status = 404;
      err.code = 'TASK_NOT_FOUND';
      throw err;
    }

    // Authorization checks
    if (user) {
      if (user.role === 'volunteer' && task.assignee_id && task.assignee_id !== user.id) {
        const err = new Error('Access denied to this task');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      if (user.role === 'event_manager' && task.event_id) {
        const event = await eventRepository.getEventById(task.event_id);
        if (event && event.event_manager_id !== user.id && event.created_by !== user.id) {
          const err = new Error('Access denied to tasks for this event');
          err.status = 403;
          err.code = 'FORBIDDEN';
          throw err;
        }
      }
    }

    return task;
  },

  /**
   * Create task with event and volunteer validation
   */
  async createTask(data, creatorUser = null, req = null) {
    const {
      title,
      description = null,
      event_id = null,
      fundraiser_id = null,
      assignee_id = null,
      volunteer_id = null,
      priority = 'MEDIUM',
      status = 'PENDING',
      due_date = null,
      due_at = null,
    } = data;

    if (!title || typeof title !== 'string' || !title.trim()) {
      const err = new Error('Task title is required');
      err.status = 400;
      err.code = 'INVALID_TITLE';
      throw err;
    }

    const effectiveAssigneeId = assignee_id 
      ? parseInt(assignee_id, 10) 
      : (volunteer_id 
        ? parseInt(volunteer_id, 10) 
        : (data.assigned_to 
          ? parseInt(data.assigned_to, 10) 
          : (data.assignee ? parseInt(data.assignee, 10) : null)));
    const effectiveEventId = event_id ? parseInt(event_id, 10) : null;
    const effectiveFundraiserId = fundraiser_id ? parseInt(fundraiser_id, 10) : null;
    const effectiveDueDate = due_date || due_at || null;


    if (!effectiveEventId && !effectiveFundraiserId) {
      const err = new Error('Task must be associated with an event or a fundraiser');
      err.status = 400;
      err.code = 'INVALID_TASK_ASSOCIATION';
      throw err;
    }

    // Validate Event Scope & Existence
    let event = null;
    if (effectiveEventId) {
      event = await eventRepository.getEventById(effectiveEventId);
      if (!event) {
        const err = new Error('Associated event not found');
        err.status = 404;
        err.code = 'EVENT_NOT_FOUND';
        throw err;
      }

      // If actor is Event Manager, verify management authorization for this event
      if (creatorUser && creatorUser.role === 'event_manager') {
        if (event.event_manager_id !== creatorUser.id && event.created_by !== creatorUser.id) {
          const err = new Error('You can only create and manage tasks for your assigned events');
          err.status = 403;
          err.code = 'FORBIDDEN';
          throw err;
        }
      }
    }

    // Validate Assignee / Volunteer
    if (effectiveAssigneeId) {
      const assignee = await authRepository.getUserById(effectiveAssigneeId);
      if (!assignee) {
        const err = new Error('Assigned volunteer / user not found');
        err.status = 404;
        err.code = 'USER_NOT_FOUND';
        throw err;
      }

      // If associated with an event, verify volunteer is an approved event volunteer
      if (effectiveEventId) {
        const application = await eventRepository.getVolunteerApplicationByUserAndEvent(effectiveEventId, effectiveAssigneeId);
        if (!application || application.status !== 'approved') {
          const err = new Error('Tasks can only be assigned to approved volunteers for this event');
          err.status = 400;
          err.code = 'VOLUNTEER_NOT_APPROVED_FOR_EVENT';
          throw err;
        }
      }
    }

    // Validate Priority
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const normPriority = (priority || 'MEDIUM').toUpperCase();
    if (!validPriorities.includes(normPriority)) {
      const err = new Error(`Priority must be one of: ${validPriorities.join(', ')}`);
      err.status = 400;
      err.code = 'INVALID_PRIORITY';
      throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const task = await tasksRepository.createTask({
        title: title.trim(),
        description: description ? description.trim() : null,
        event_id: effectiveEventId,
        fundraiser_id: effectiveFundraiserId,
        assignee_id: effectiveAssigneeId,
        priority: normPriority,
        status: (status || 'PENDING').toUpperCase(),
        due_date: effectiveDueDate ? new Date(effectiveDueDate).toISOString() : null,
        created_by: creatorUser ? creatorUser.id : null,
      }, client);

      // In-app notification for the assigned volunteer
      if (effectiveAssigneeId) {
        const eventTitle = event ? event.title : 'Organization Program';
        await notificationService.createNotification({
          userId: effectiveAssigneeId,
          type: 'task_assigned',
          title: 'New Volunteer Task Assigned',
          message: `You have been assigned task "${title.trim()}" for ${eventTitle}.`,
          data: {
            task_id: task.id,
            event_id: effectiveEventId,
            priority: normPriority,
            due_date: effectiveDueDate,
          },
        }, client);
      }

      // Audit log entry
      await auditService.recordLog({
        actorId: creatorUser ? creatorUser.id : null,
        action: 'VOLUNTEER_TASK_CREATED',
        entityType: 'task',
        entityId: task.id,
        metadata: {
          title: task.title,
          event_id: effectiveEventId,
          assignee_id: effectiveAssigneeId,
          priority: normPriority,
        },
        req,
      });

      await client.query('COMMIT');
      return task;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Update task status with strict state machine transitions and concurrency protection
   */
  async updateTaskStatus(id, newStatus, user, req = null) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      const err = new Error('Invalid task ID');
      err.status = 400;
      err.code = 'INVALID_ID';
      throw err;
    }

    if (!newStatus || typeof newStatus !== 'string') {
      const err = new Error('New status is required');
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    let targetStatus = newStatus.trim().toUpperCase();
    if (targetStatus === 'TODO') targetStatus = 'PENDING';

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(targetStatus)) {
      const err = new Error(`Invalid status. Allowed: ${validStatuses.join(', ')}`);
      err.status = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }

    const task = await tasksRepository.getTaskById(parsedId);
    if (!task) {
      const err = new Error('Task not found');
      err.status = 404;
      err.code = 'TASK_NOT_FOUND';
      throw err;
    }

    let currentStatus = (task.status || 'PENDING').toUpperCase();
    if (currentStatus === 'TODO') currentStatus = 'PENDING';

    // Authorization checks
    if (user.role === 'volunteer' || user.role === 'member') {
      if (task.assignee_id && task.assignee_id !== user.id) {
        const err = new Error('You can only update tasks assigned to you');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    } else if (user.role === 'event_manager' && task.event_id) {
      const event = await eventRepository.getEventById(task.event_id);
      if (event && event.event_manager_id !== user.id && event.created_by !== user.id) {
        const err = new Error('You can only update tasks for your assigned events');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    // State Machine Transition Rules
    if (currentStatus === targetStatus) {
      if (currentStatus === 'COMPLETED') {
        const err = new Error('Task is already completed');
        err.status = 409;
        err.code = 'TASK_ALREADY_COMPLETED';
        throw err;
      }
      return task; // Idempotent same-state
    }

    // Disallow reopening completed tasks unless administrator
    if (currentStatus === 'COMPLETED' && user.role !== 'admin') {
      const err = new Error('Completed tasks cannot be reopened or changed');
      err.status = 400;
      err.code = 'INVALID_STATE_TRANSITION';
      throw err;
    }

    // Disallow moving cancelled tasks
    if (currentStatus === 'CANCELLED' && user.role !== 'admin') {
      const err = new Error('Cancelled tasks cannot be transitioned');
      err.status = 400;
      err.code = 'INVALID_STATE_TRANSITION';
      throw err;
    }

    // Atomic update in PostgreSQL
    const updated = await tasksRepository.updateTaskStatusAtomic(
      parsedId,
      targetStatus,
      task.status, // Verify expected prior status to prevent race conditions
      user.id
    );

    if (!updated) {
      // If atomic update returned null due to concurrency conflict, re-fetch and throw conflict
      const latest = await tasksRepository.getTaskById(parsedId);
      if (latest && latest.status.toUpperCase() === 'COMPLETED') {
        const err = new Error('Task was already completed by another concurrent request');
        err.status = 409;
        err.code = 'TASK_ALREADY_COMPLETED';
        throw err;
      }
      const err = new Error('State transition conflict; please refresh and try again');
      err.status = 409;
      err.code = 'STATE_TRANSITION_CONFLICT';
      throw err;
    }

    // Determine audit action
    let auditAction = 'VOLUNTEER_TASK_UPDATED';
    if (targetStatus === 'IN_PROGRESS') auditAction = 'VOLUNTEER_TASK_STARTED';
    else if (targetStatus === 'COMPLETED') auditAction = 'VOLUNTEER_TASK_COMPLETED';
    else if (targetStatus === 'CANCELLED') auditAction = 'VOLUNTEER_TASK_CANCELLED';

    await auditService.recordLog({
      actorId: user.id,
      action: auditAction,
      entityType: 'task',
      entityId: parsedId,
      oldValue: { status: currentStatus },
      newValue: { status: targetStatus },
      metadata: {
        task_title: task.title,
        event_id: task.event_id,
        assignee_id: task.assignee_id,
      },
      req,
    });

    return updated;
  },

  /**
   * Delete task
   */
  async deleteTask(id, user = null, req = null) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      const err = new Error('Invalid task ID');
      err.status = 400;
      err.code = 'INVALID_ID';
      throw err;
    }

    const task = await tasksRepository.getTaskById(parsedId);
    if (!task) {
      const err = new Error('Task not found');
      err.status = 404;
      err.code = 'TASK_NOT_FOUND';
      throw err;
    }

    if (user && user.role === 'event_manager' && task.event_id) {
      const event = await eventRepository.getEventById(task.event_id);
      if (event && event.event_manager_id !== user.id && event.created_by !== user.id) {
        const err = new Error('You can only delete tasks for your assigned events');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    const deleted = await tasksRepository.deleteTask(parsedId);

    if (user) {
      await auditService.recordLog({
        actorId: user.id,
        action: 'VOLUNTEER_TASK_DELETED',
        entityType: 'task',
        entityId: parsedId,
        oldValue: task,
        req,
      });
    }

    return deleted;
  }
};

module.exports = tasksService;
