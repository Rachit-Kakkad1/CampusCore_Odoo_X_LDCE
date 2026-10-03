// frontend/src/services/tasks.service.js
import api from './api.js';

export const tasksService = {
  /**
   * Fetch all tasks (with optional filter by status, fundraiser_id, assignee_id)
   */
  async getAllTasks(filters = {}) {
    const res = await api.get('/tasks', { params: filters });
    return res.data;
  },

  /**
   * Fetch tasks assigned specifically to current logged-in user
   */
  async getMyTasks() {
    const res = await api.get('/tasks/mine');
    return res.data;
  },

  /**
   * Fetch single task details
   */
  async getTaskById(id) {
    const res = await api.get(`/tasks/${id}`);
    return res.data;
  },

  /**
   * Update task status ('TODO' | 'IN_PROGRESS' | 'COMPLETED')
   */
  async updateTaskStatus(id, status) {
    const res = await api.patch(`/tasks/${id}/status`, { status });
    return res.data;
  },

  /**
   * Create task (Admin / Event Manager)
   */
  async createTask(data) {
    const res = await api.post('/tasks', data);
    return res.data;
  },

  /**
   * Delete task
   */
  async deleteTask(id) {
    const res = await api.delete(`/tasks/${id}`);
    return res.data;
  }
};

export default tasksService;
