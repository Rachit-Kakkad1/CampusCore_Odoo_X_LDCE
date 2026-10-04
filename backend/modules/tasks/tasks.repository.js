// backend/modules/tasks/tasks.repository.js
const { pool } = require('../../config/database');

const tasksRepository = {
  /**
   * Get all tasks with search, filtering, and safe sorting/pagination.
   */
  async getAllTasks({
    assignee_id,
    volunteer_id,
    fundraiser_id,
    event_id,
    status,
    priority,
    manager_id,
    search,
    page = null,
    pageSize = null,
    limit = null,
    offset = 0,
    sort = 'id',
    sortDirection = 'ASC',
  } = {}, client = pool) {
    const where = [];
    const params = [];

    const effectiveAssigneeId = assignee_id || volunteer_id;
    if (effectiveAssigneeId) {
      params.push(parseInt(effectiveAssigneeId, 10));
      where.push(`t.assignee_id = $${params.length}`);
    }

    if (fundraiser_id) {
      params.push(parseInt(fundraiser_id, 10));
      where.push(`t.fundraiser_id = $${params.length}`);
    }

    if (event_id) {
      params.push(parseInt(event_id, 10));
      where.push(`t.event_id = $${params.length}`);
    }

    if (status && status !== 'ALL') {
      const normalizedStatus = status.toUpperCase();
      if (normalizedStatus === 'PENDING' || normalizedStatus === 'TODO') {
        where.push(`UPPER(t.status) IN ('TODO', 'PENDING')`);
      } else {
        params.push(normalizedStatus);
        where.push(`UPPER(t.status) = $${params.length}`);
      }
    }

    if (priority && priority !== 'ALL') {
      params.push(priority.toUpperCase());
      where.push(`UPPER(t.priority) = $${params.length}`);
    }

    if (manager_id) {
      params.push(parseInt(manager_id, 10));
      where.push(`(e.event_manager_id = $${params.length} OR e.created_by = $${params.length})`);
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      const sIdx = params.length;
      where.push(`(
        t.title ILIKE $${sIdx} OR
        t.description ILIKE $${sIdx} OR
        u.name ILIKE $${sIdx} OR
        u.email ILIKE $${sIdx} OR
        e.title ILIKE $${sIdx}
      )`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const effectiveLimit = pageSize || limit;
    const isPaginated = effectiveLimit !== null && effectiveLimit !== undefined;

    let totalItems = 0;
    if (isPaginated) {
      const countSql = `
        SELECT COUNT(DISTINCT t.id)::int AS total
        FROM tasks t
        LEFT JOIN fundraisers f ON t.fundraiser_id = f.id
        LEFT JOIN events e ON t.event_id = e.id
        LEFT JOIN users u ON t.assignee_id = u.id
        ${whereClause};
      `;
      const countRes = await client.query(countSql, params);
      totalItems = countRes.rows[0]?.total || 0;
    }

    const sortMap = {
      id: 't.id',
      created_at: 't.created_at',
      due_date: 't.due_date',
      priority: 't.priority',
      status: 't.status',
      title: 't.title',
    };
    const sortColumn = sortMap[sort] || 't.id';
    const direction = (sortDirection || '').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let sql = `
      SELECT 
        t.id,
        t.fundraiser_id,
        t.event_id,
        t.title,
        t.description,
        t.assignee_id,
        t.status,
        t.priority,
        t.due_date,
        t.due_date AS due_at,
        t.completed_at,
        t.completed_by,
        t.created_by,
        t.created_at,
        t.updated_at,
        f.title AS fundraiser_title,
        f.description AS fundraiser_description,
        e.title AS event_title,
        e.venue AS event_venue,
        e.event_manager_id,
        u.name AS assignee_name,
        u.email AS assignee_email,
        u.phone AS assignee_phone,
        u.role AS assignee_role,
        creator.name AS creator_name,
        completer.name AS completed_by_name
      FROM tasks t
      LEFT JOIN fundraisers f ON t.fundraiser_id = f.id
      LEFT JOIN events e ON t.event_id = e.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users completer ON t.completed_by = completer.id
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}, t.id ASC
    `;

    const dataParams = [...params];
    if (isPaginated) {
      dataParams.push(effectiveLimit, offset);
      sql += ` LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};`;
    }

    const res = await client.query(sql, dataParams);
    const rows = res.rows;

    if (isPaginated) {
      return {
        rows,
        totalItems,
      };
    }

    return rows;
  },

  /**
   * Find task by ID
   */
  async getTaskById(id, client = pool) {
    const sql = `
      SELECT 
        t.id,
        t.fundraiser_id,
        t.event_id,
        t.title,
        t.description,
        t.assignee_id,
        t.status,
        t.priority,
        t.due_date,
        t.due_date AS due_at,
        t.completed_at,
        t.completed_by,
        t.created_by,
        t.created_at,
        t.updated_at,
        f.title AS fundraiser_title,
        e.title AS event_title,
        e.venue AS event_venue,
        e.event_manager_id,
        u.name AS assignee_name,
        u.email AS assignee_email,
        u.phone AS assignee_phone,
        u.role AS assignee_role,
        creator.name AS creator_name,
        completer.name AS completed_by_name
      FROM tasks t
      LEFT JOIN fundraisers f ON t.fundraiser_id = f.id
      LEFT JOIN events e ON t.event_id = e.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users completer ON t.completed_by = completer.id
      WHERE t.id = $1;
    `;
    const res = await client.query(sql, [id]);
    return res.rows[0] || null;
  },

  /**
   * Create a new task
   */
  async createTask({
    fundraiser_id = null,
    event_id = null,
    title,
    description = null,
    assignee_id = null,
    volunteer_id = null,
    status = 'PENDING',
    priority = 'MEDIUM',
    due_date = null,
    due_at = null,
    created_by = null,
  }, client = pool) {
    const normalizedStatus = (status || 'PENDING').toUpperCase();
    const effectiveAssignee = assignee_id || volunteer_id || null;
    const effectiveDueDate = due_date || due_at || null;

    const sql = `
      INSERT INTO tasks (
        fundraiser_id,
        event_id,
        title,
        description,
        assignee_id,
        status,
        priority,
        due_date,
        created_by,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *;
    `;
    const res = await client.query(sql, [
      fundraiser_id || null,
      event_id || null,
      title,
      description || null,
      effectiveAssignee,
      normalizedStatus,
      priority ? priority.toUpperCase() : 'MEDIUM',
      effectiveDueDate,
      created_by || null,
    ]);
    return res.rows[0];
  },

  /**
   * Transition task status atomically with concurrency protection.
   */
  async updateTaskStatusAtomic(id, newStatus, currentExpectedStatus = null, completedBy = null, client = pool) {
    const normalizedStatus = newStatus.toUpperCase();
    const isCompleting = normalizedStatus === 'COMPLETED';

    let sql = `
      UPDATE tasks
      SET status = $1::varchar,
          completed_at = CASE WHEN $1::varchar = 'COMPLETED' THEN NOW() ELSE completed_at END,
          completed_by = CASE WHEN $1::varchar = 'COMPLETED' THEN $2::int ELSE completed_by END,
          updated_at = NOW()
      WHERE id = $3
    `;
    const params = [normalizedStatus, isCompleting ? completedBy : null, id];

    if (currentExpectedStatus) {
      params.push(currentExpectedStatus.toUpperCase());
      sql += ` AND UPPER(status) = $${params.length}`;
    }

    sql += ` RETURNING *;`;

    const res = await client.query(sql, params);
    return res.rows[0] || null;
  },

  /**
   * Delete task
   */
  async deleteTask(id, client = pool) {
    const res = await client.query('DELETE FROM tasks WHERE id = $1 RETURNING *;', [id]);
    return res.rows[0] || null;
  }
};

module.exports = tasksRepository;
