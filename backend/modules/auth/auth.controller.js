const authService = require('./auth.service');

/**
 * Auth Controller
 * Coordinates HTTP requests for user authentication.
 */
class AuthController {
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      return res.status(201).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      return res.status(200).json(result);
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }

  async getMe(req, res) {
    try {
      const user = await authService.getMe(req.user.id);
      return res.status(200).json({ user });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
    }
  }
}

module.exports = new AuthController();
