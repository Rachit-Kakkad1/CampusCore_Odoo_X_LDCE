const authService = require('./auth.service');

/**
 * Auth Controller
 * Coordinates HTTP requests for user authentication.
 */
class AuthController {
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      return res.status(201).json({ success: true, ...result });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async login(req, res) {
    try {
      const result = await authService.login(req.body, req);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getMe(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const user = await authService.getMe(userId);
      return res.status(200).json({ success: true, user, profile: user });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getProfile(req, res) {
    return this.getMe(req, res);
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const { name, phone } = req.body || {};
      const updated = await authService.updateProfile(userId, { name, phone }, req);
      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updated,
        profile: updated,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAllUsers(req, res) {
    try {
      const { role, search } = req.query;
      const { parsePaginationParams, buildPaginationResponse } = require('../../shared/pagination/paginate');

      const hasPagination = req.query.page !== undefined || req.query.pageSize !== undefined || req.query.limit !== undefined;

      if (hasPagination) {
        const { page, pageSize, offset, sort, sortDirection } = parsePaginationParams(req.query, {
          defaultPageSize: 20,
          maxPageSize: 100,
          allowedSortFields: ['id', 'name', 'email', 'role', 'created_at'],
          defaultSort: 'id',
          defaultSortDirection: 'ASC',
        });

        const result = await authService.getAllUsers({
          role,
          search,
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
          users: rows,
        });
      }

      // Backward-compatible unpaginated query
      const users = await authService.getAllUsers({ role, search });
      const list = Array.isArray(users) ? users : (users.rows || []);
      return res.status(200).json({
        success: true,
        count: list.length,
        data: list,
        users: list,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        error: err.code || 'INTERNAL_ERROR',
        message: err.message,
      });
    }
  }

  async createUser(req, res) {
    try {
      const user = await authService.createUserByAdmin(req.body);
      return res.status(201).json({ success: true, user });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const updated = await authService.updateUserRole(id, role);
      return res.status(200).json({ success: true, user: updated });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user ? (req.user.id || req.user.userId) : null;
      const deleted = await authService.deleteUser(id, currentUserId);
      return res.status(200).json({ success: true, user: deleted });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getStats(req, res) {
    try {
      const stats = await authService.getUserStats();
      return res.status(200).json({ success: true, data: stats });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async changePassword(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const { current_password, new_password, currentPassword, newPassword } = req.body || {};
      const cur = current_password || currentPassword;
      const nw = new_password || newPassword;
      const result = await authService.changePassword(userId, cur, nw, req);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body || {};
      const result = await authService.requestPasswordReset(email, req);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, new_password, newPassword } = req.body || {};
      const nw = new_password || newPassword;
      const result = await authService.resetPassword(token, nw, req);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getSessions(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const currentToken = req.headers['x-session-token'] || null;
      const sessions = await authService.getUserSessions(userId, currentToken);
      return res.status(200).json({ success: true, sessions });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async revokeSession(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const isAdmin = req.user && req.user.role === 'admin';
      const revoked = await authService.revokeSession(id, userId, isAdmin ? userId : null, req);
      return res.status(200).json({ success: true, message: 'Session revoked successfully', session: revoked });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async revokeOtherSessions(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const currentToken = req.headers['x-session-token'] || null;
      const result = await authService.revokeOtherSessions(userId, currentToken, req);
      return res.status(200).json({ success: true, message: 'All other sessions have been revoked', ...result });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async logout(req, res) {
    try {
      const userId = req.user ? (req.user.id || req.user.userId) : null;
      const currentToken = req.headers['x-session-token'] || null;
      if (currentToken && userId) {
        const sessionRes = await authService.getUserSessions(userId, currentToken);
        const current = sessionRes.find(s => s.is_current);
        if (current) {
          await authService.revokeSession(current.id, userId, null, req);
        }
      }
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    }
  }

  async unlockUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user ? (req.user.id || req.user.userId) : null;
      const user = await authService.unlockUser(id, adminId, req);
      return res.status(200).json({ success: true, message: 'User account unlocked successfully', user });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }
}

module.exports = new AuthController();
