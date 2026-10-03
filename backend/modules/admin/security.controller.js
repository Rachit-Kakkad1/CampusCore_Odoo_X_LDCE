const auditService = require('../../shared/audit/audit.service');
const authService = require('../auth/auth.service');
const sessionService = require('../auth/session.service');

class SecurityController {
  async getOverview(req, res) {
    try {
      const overview = await auditService.getSecurityOverview();
      return res.status(200).json({
        success: true,
        ...overview,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getAuditLogs(req, res) {
    try {
      const { limit, page, entityType, action, actorId } = req.query;
      const logs = await auditService.getAuditLogs({ limit, page, entityType, action, actorId });
      return res.status(200).json({
        success: true,
        ...logs,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async unlockUser(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user ? (req.user.id || req.user.userId) : null;
      const user = await authService.unlockUser(id, adminId, req);
      return res.status(200).json({
        success: true,
        message: 'User account unlocked successfully',
        user,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async revokeSession(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user ? (req.user.id || req.user.userId) : null;
      const session = await sessionService.revokeSession(id, null, adminId, req);
      return res.status(200).json({
        success: true,
        message: 'Session revoked successfully',
        session,
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }
}

module.exports = new SecurityController();
