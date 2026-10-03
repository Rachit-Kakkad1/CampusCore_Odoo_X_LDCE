// backend/modules/tasks/tasks.controller.js
const tasksService = require('./tasks.service');

const tasksController = {
  async getAllTasks(req, res) {
    try {
      const filters = {
        assignee_id: req.query.assignee_id ? parseInt(req.query.assignee_id) : undefined,
        fundraiser_id: req.query.fundraiser_id ? parseInt(req.query.fundraiser_id) : undefined,
        status: req.query.status
      };
      const tasks = await tasksService.getAllTasks(filters);
      return res.status(200).json(tasks);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  },

  async getMyTasks(req, res) {
    try {
      const userId = req.user.id;
      const tasks = await tasksService.getMyTasks(userId);
      return res.status(200).json(tasks);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  },

  async getTaskById(req, res) {
    try {
      const task = await tasksService.getTaskById(req.params.id);
      return res.status(200).json(task);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  },

  async createTask(req, res) {
    try {
      const task = await tasksService.createTask(req.body);
      return res.status(201).json(task);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  },

  async updateTaskStatus(req, res) {
    try {
      const { status } = req.body;
      const task = await tasksService.updateTaskStatus(req.params.id, status, req.user);
      return res.status(200).json(task);
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }
  },

  async deleteTask(req, res) {
    try {
      const task = await tasksService.deleteTask(req.params.id);
      return res.status(200).json({ message: 'Task deleted successfully', task });
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message });
    }
  }
};

module.exports = tasksController;
