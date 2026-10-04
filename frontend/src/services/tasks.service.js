// frontend/src/services/tasks.service.js
import api from './api.js';

export const tasksService = {
  /**
   * Fetch all tasks (with optional filter by status, fundraiser_id, assignee_id)
   */
  async getAllTasks(filters = {}) {
    const res = await api.get('/tasks', { params: filters });
    return res;
  },

  /**
   * Fetch tasks assigned specifically to current logged-in user
   */
  async getMyTasks(params = {}) {
    const res = await api.get('/tasks/mine', { params });
    return res.data || res;
  },

  /**
   * Fetch tasks for a specific event
   */
  async getTasksForEvent(eventId, params = {}) {
    const res = await api.get(`/events/${eventId}/volunteer-tasks`, { params });
    return res.data || res;
  },

  /**
   * Fetch single task details
   */
  async getTaskById(id) {
    const res = await api.get(`/tasks/${id}`);
    return res.data || res;
  },

  /**
   * Update task status ('PENDING' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED')
   */
  async updateTaskStatus(id, status) {
    const res = await api.patch(`/tasks/${id}/status`, { status });
    return res.data || res;
  },

  /**
   * Create task (Admin / Event Manager)
   */
  async createTask(data) {
    const res = await api.post('/tasks', data);
    return res.data || res;
  },

  /**
   * Delete task
   */
  async deleteTask(id) {
    const res = await api.delete(`/tasks/${id}`);
    return res.data || res;
  }
};

export default tasksService;

