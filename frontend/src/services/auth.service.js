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
  }
};

export default authService;
