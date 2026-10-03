// backend/modules/tasks/tasks.service.js
const tasksRepository = require('./tasks.repository');

const tasksService = {
  async getAllTasks(filters) {
    return await tasksRepository.getAllTasks(filters);
  },

  async getMyTasks(userId) {
    return await tasksRepository.getAllTasks({ assignee_id: userId });
  },

  async getTaskById(id) {
    const task = await tasksRepository.getTaskById(id);
    if (!task) {
      const err = new Error('Task not found');
      err.status = 404;
      throw err;
    }
    return task;
  },

  async createTask(data) {
    if (!data.title || !data.fundraiser_id) {
      const err = new Error('Title and Fundraiser ID are required');
      err.status = 400;
      throw err;
    }
    return await tasksRepository.createTask(data);
  },

  async updateTaskStatus(id, status, user) {
    const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'todo', 'in_progress', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      const err = new Error("Invalid status. Allowed: 'TODO', 'IN_PROGRESS', 'COMPLETED'");
      err.status = 400;
      throw err;
    }

    const task = await tasksRepository.getTaskById(id);
    if (!task) {
      const err = new Error('Task not found');
      err.status = 404;
      throw err;
    }

    // Volunteers can only update tasks assigned to them (or any task if unassigned)
    if (user.role === 'volunteer' && task.assignee_id && task.assignee_id !== user.id) {
      const err = new Error('You can only update status for tasks assigned to you');
      err.status = 403;
      throw err;
    }

    return await tasksRepository.updateTaskStatus(id, status);
  },

  async deleteTask(id) {
    return await tasksRepository.deleteTask(id);
  }
};

module.exports = tasksService;
