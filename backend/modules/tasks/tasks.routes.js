// backend/modules/tasks/tasks.routes.js
const express = require('express');
const router = express.Router();
const tasksController = require('./tasks.controller');
const { requireAuth } = require('../../shared/auth/requireAuth');
const { requireRole } = require('../../shared/auth/requireRole');

// Get current user's tasks
router.get('/mine', requireAuth, tasksController.getMyTasks);
router.get('/my-tasks', requireAuth, tasksController.getMyTasks);

// General tasks list and details
router.get('/', requireAuth, tasksController.getAllTasks);
router.get('/:id', requireAuth, tasksController.getTaskById);

// Create task (Admins / Event Managers)
router.post('/', requireAuth, requireRole('admin', 'event_manager', 'treasurer'), tasksController.createTask);

// Update task status (Volunteers, Event Managers, Admins)
router.patch('/:id/status', requireAuth, tasksController.updateTaskStatus);
router.put('/:id/status', requireAuth, tasksController.updateTaskStatus);

// Delete task (Admins)
router.delete('/:id', requireAuth, requireRole('admin', 'event_manager'), tasksController.deleteTask);

module.exports = router;
