// frontend/src/services/auth.service.js
import api from './api.js';

export const authService = {
  /**
   * Register a new user account.
   */
  async register({ name, email, password, role = 'member' }) {
    const data = await api.post('/auth/register', { name, email, password, role });
    if (data.token) {
      api.setToken(data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    return data;
  },

  /**
   * Authenticate user with credentials.
   */
  async login({ email, password }) {
    const data = await api.post('/auth/login', { email, password });
    if (data.token) {
      api.setToken(data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }
    return data;
  },

  /**
   * Retrieve current authenticated user profile.
   */
  async getMe() {
    const data = await api.get('/auth/me');
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data.user;
  },

  /**
   * Terminate user session.
   */
  logout() {
    api.clearToken();
  },

  /**
   * Get cached user profile from local storage.
   */
  getStoredUser() {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Check if token exists in storage.
   */
  isAuthenticated() {
    return Boolean(api.getToken());
  },

  /**
   * Admin: fetch all user accounts with membership details and statistics.
   */
  async getAllUsers() {
    const res = await api.get('/users');
    return res.data || res.users || res;
  },

  /**
   * Admin: fetch user metrics and demographic statistics.
   */
  async getUserStats() {
    const res = await api.get('/users/stats');
    return res.data || res;
  },

  /**
   * Admin: create a new user account with designated role.
   */
  async createUser(userData) {
    const res = await api.post('/users', userData);
    return res.user || res.data || res;
  },

  /**
   * Admin: update a user's role.
   */
  async updateUserRole(id, role) {
    const res = await api.patch(`/users/${id}/role`, { role });
    return res.user || res.data || res;
  },

  /**
   * Admin: delete a user account.
   */
  async deleteUser(id) {
    const res = await api.delete(`/users/${id}`);
    return res.user || res.data || res;
  },

  /**
   * Get current authenticated user's profile
   * Endpoint: GET /profile
   */
  async getProfile() {
    const res = await api.get('/profile');
    if (res.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res.user || res.data || res;
  },

  /**
   * Update current authenticated user's profile
   * Endpoint: PATCH /profile
   */
  async updateProfile(profileData) {
    const res = await api.patch('/profile', profileData);
    if (res.user) {
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Change current authenticated user's password
   * Endpoint: PATCH /profile/password
   */
  async changePassword({ currentPassword, newPassword, confirmPassword }) {
    const res = await api.patch('/profile/password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return res;
  }
};


export default authService;
