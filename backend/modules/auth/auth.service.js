const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');
const { pool } = require('../../config/database');
const authRepository = require('./auth.repository');
const sessionService = require('./session.service');
const passwordService = require('./password.service');
const auditService = require('../../shared/audit/audit.service');

/**
 * Auth Service
 * Business logic for user registration, authentication, and session retrieval.
 */
class AuthService {
  /**
   * Registers a new user with default role ('member') and initializes a pending membership.
   */
  async register({ name, email, password }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      const err = new Error('Name is required');
      err.code = 'INVALID_NAME';
      err.status = 400;
      throw err;
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      const err = new Error('Email is required');
      err.code = 'INVALID_EMAIL';
      err.status = 400;
      throw err;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      const err = new Error('Invalid email format');
      err.code = 'INVALID_EMAIL_FORMAT';
      err.status = 400;
      throw err;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      const err = new Error('Password must be at least 6 characters long');
      err.code = 'WEAK_PASSWORD';
      err.status = 400;
      throw err;
    }

    // Check for existing user with this email
    const existing = await authRepository.getUserByEmail(cleanEmail);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.code = 'EMAIL_ALREADY_EXISTS';
      err.status = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create user with default role 'member'
      const user = await authRepository.createUser(
        {
          name: name.trim(),
          email: cleanEmail,
          password_hash: passwordHash,
          role: 'member',
        },
        client
      );

      // 2. Initialize pending membership (per Rule 1: register -> pending membership)
      const currentYear = new Date().getFullYear();
      const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const memberCode = `MEM-${currentYear}-${randomSuffix}`;

      await client.query(
        `
        INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount)
        VALUES ($1, $2, 'pending', 'pending', 500.00)
        ON CONFLICT (member_code) DO NOTHING;
      `,
        [user.id, memberCode]
      );

      await client.query('COMMIT');

      // 3. Issue JWT Bearer token
      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        user,
        token,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Authenticates user credentials and returns safe user data, JWT token, and session token.
   */
  async login({ email, password }, req = null) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.code = 'MISSING_CREDENTIALS';
      err.status = 400;
      throw err;
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await authRepository.getUserByEmail(cleanEmail);

    if (!user && (cleanEmail.endsWith('@skyline.org') || cleanEmail.endsWith('@campuscore.org') || cleanEmail.endsWith('@odoo-ldce.org'))) {
      const altDomains = ['@odoo-ldce.org', '@skyline.org', '@campuscore.org'];
      const currentPrefix = cleanEmail.split('@')[0];
      for (const dom of altDomains) {
        user = await authRepository.getUserByEmail(`${currentPrefix}${dom}`);
        if (user) break;
      }
    }

    if (!user) {
      await auditService.recordLog({
        actorId: null,
        action: 'USER_LOGIN_FAILED',
        entityType: 'user',
        metadata: { email: cleanEmail, reason: 'USER_NOT_FOUND' },
        req,
      });
      const err = new Error('Invalid email or password');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / (60 * 1000));
      await auditService.recordLog({
        actorId: user.id,
        action: 'USER_LOGIN_LOCKED_ATTEMPT',
        entityType: 'user',
        entityId: user.id,
        metadata: { locked_until: user.locked_until },
        req,
      });
      const err = new Error(`Account is temporarily locked due to multiple failed login attempts. Please try again in ${waitMinutes} minute(s) or reset your password.`);
      err.code = 'ACCOUNT_LOCKED';
      err.status = 403;
      throw err;
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      const nextAttempts = (user.failed_login_attempts || 0) + 1;
      let lockoutDate = null;
      if (nextAttempts >= 5) {
        lockoutDate = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      }

      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3;',
        [nextAttempts, lockoutDate, user.id]
      );

      await auditService.recordLog({
        actorId: user.id,
        action: 'USER_LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        metadata: { attempts: nextAttempts, locked: !!lockoutDate },
        req,
      });

      const err = new Error('Invalid email or password');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

    // Reset failed login attempts and update last_login_at
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = $1;',
      [user.id]
    );

    const fullUser = await authRepository.getUserById(user.id);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_volunteer_assigned: fullUser ? !!fullUser.is_volunteer_assigned : false,
      created_at: user.created_at,
    };

    // Create session in user_sessions
    let session = null;
    try {
      session = await sessionService.createSession(user.id, req);
    } catch (sErr) {
      console.warn('Session creation warning:', sErr.message);
    }

    const token = jwt.sign(
      {
        id: safeUser.id,
        name: safeUser.name,
        email: safeUser.email,
        role: safeUser.role,
        is_volunteer_assigned: safeUser.is_volunteer_assigned,
        sessionId: session ? session.id : null,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await auditService.recordLog({
      actorId: user.id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      metadata: { sessionId: session ? session.id : null },
      req,
    });

    return {
      user: safeUser,
      token,
      session_token: session ? session.session_token : null,
      session_id: session ? session.id : null,
    };
  }

  /**
   * Retrieves profile for currently authenticated user.
   */
  async getMe(userId) {
    const user = await authRepository.getUserById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      err.status = 404;
      throw err;
    }
    return user;
  }

  async getCurrentUserProfile(userId) {
    return this.getMe(userId);
  }

  /**
   * Updates authenticated user's own profile (name, phone).
   */
  async updateProfile(userId, { name, phone }, req = null) {
    if (!userId) {
      const err = new Error('Authentication required');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const current = await authRepository.getUserById(userId);
    if (!current) {
      const err = new Error('User not found');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const cleanName = name !== undefined ? String(name).trim() : current.name;
    if (!cleanName) {
      const err = new Error('Name cannot be empty');
      err.status = 400;
      err.code = 'INVALID_NAME';
      throw err;
    }

    const cleanPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : current.phone;
    if (cleanPhone && cleanPhone.length > 50) {
      const err = new Error('Phone number must not exceed 50 characters');
      err.status = 400;
      err.code = 'INVALID_PHONE';
      throw err;
    }

    const updated = await authRepository.updateUserProfile(userId, {
      name: cleanName,
      phone: cleanPhone,
    });

    await auditService.recordLog({
      actorId: userId,
      action: 'USER_PROFILE_UPDATED',
      entityType: 'user',
      entityId: userId,
      oldValue: { name: current.name, phone: current.phone },
      newValue: { name: cleanName, phone: cleanPhone },
      req,
    });

    return updated;
  }

  /**
   * Retrieves all users for administrative workspace (with optional pagination, search, and role filtering).
   */
  async getAllUsers(filter = {}) {
    return authRepository.getAllUsers(filter);
  }

  /**
   * Admin creates a new user account with a specified role.
   */
  async createUserByAdmin({ name, email, password, role = 'member' }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      const err = new Error('Name is required');
      err.code = 'INVALID_NAME';
      err.status = 400;
      throw err;
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      const err = new Error('Email is required');
      err.code = 'INVALID_EMAIL';
      err.status = 400;
      throw err;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      const err = new Error('Invalid email format');
      err.code = 'INVALID_EMAIL_FORMAT';
      err.status = 400;
      throw err;
    }

    const validRoles = ['admin', 'treasurer', 'event_manager', 'volunteer', 'member'];
    if (!validRoles.includes(role)) {
      const err = new Error(`Role must be one of: ${validRoles.join(', ')}`);
      err.code = 'INVALID_ROLE';
      err.status = 400;
      throw err;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      const err = new Error('Password must be at least 6 characters long');
      err.code = 'WEAK_PASSWORD';
      err.status = 400;
      throw err;
    }

    const existing = await authRepository.getUserByEmail(cleanEmail);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.code = 'EMAIL_ALREADY_EXISTS';
      err.status = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const user = await authRepository.createUser(
        {
          name: name.trim(),
          email: cleanEmail,
          password_hash: passwordHash,
          role,
        },
        client
      );

      // If user is registered as member, initialize membership
      if (role === 'member') {
        const currentYear = new Date().getFullYear();
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const memberCode = `MEM-${currentYear}-${randomSuffix}`;

        await client.query(
          `
          INSERT INTO memberships (user_id, member_code, status, dues_status, dues_amount)
          VALUES ($1, $2, 'pending', 'pending', 500.00)
          ON CONFLICT (member_code) DO NOTHING;
          `,
          [user.id, memberCode]
        );
      }

      await client.query('COMMIT');
      return user;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Updates a user's role.
   */
  async updateUserRole(id, role) {
    const validRoles = ['admin', 'treasurer', 'event_manager', 'volunteer', 'member'];
    if (!validRoles.includes(role)) {
      const err = new Error(`Role must be one of: ${validRoles.join(', ')}`);
      err.code = 'INVALID_ROLE';
      err.status = 400;
      throw err;
    }

    const updated = await authRepository.updateUserRole(id, role);
    if (!updated) {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return updated;
  }

  /**
   * Deletes a user by ID, preventing self-deletion.
   */
  async deleteUser(id, currentUserId) {
    if (Number(id) === Number(currentUserId)) {
      const err = new Error('You cannot delete your own administrative account');
      err.code = 'CANNOT_DELETE_SELF';
      err.status = 400;
      throw err;
    }

    const deleted = await authRepository.deleteUser(id);
    if (!deleted) {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    return deleted;
  }

  /**
   * Retrieves analytics statistics for users.
   */
  async getUserStats() {
    return authRepository.getUserStats();
  }

  /**
   * Changes password for authenticated user.
   */
  async changePassword(userId, currentPassword, newPassword, req = null) {
    return passwordService.changePassword(userId, currentPassword, newPassword, req);
  }

  /**
   * Requests password reset with non-enumerating generic response.
   */
  async requestPasswordReset(email, req = null) {
    return passwordService.requestPasswordReset(email, req);
  }

  /**
   * Resets password using single-use hashed token.
   */
  async resetPassword(token, newPassword, req = null) {
    return passwordService.resetPassword(token, newPassword, req);
  }

  /**
   * Retrieves active sessions for a user.
   */
  async getUserSessions(userId, currentToken = null) {
    return sessionService.getUserSessions(userId, currentToken);
  }

  /**
   * Revokes a session.
   */
  async revokeSession(sessionId, userId, adminId = null, req = null) {
    return sessionService.revokeSession(sessionId, userId, adminId, req);
  }

  /**
   * Revokes all other sessions.
   */
  async revokeOtherSessions(userId, currentToken, req = null) {
    return sessionService.revokeOtherSessions(userId, currentToken, req);
  }

  /**
   * Admin unlocks a temporarily locked user account.
   */
  async unlockUser(userId, adminId, req = null) {
    const id = parseInt(userId, 10);
    if (isNaN(id)) {
      const err = new Error('Invalid user ID');
      err.status = 400;
      throw err;
    }

    const res = await pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1 RETURNING id, name, email;',
      [id]
    );

    if (res.rows.length === 0) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    await auditService.recordLog({
      actorId: adminId,
      action: 'ADMIN_UNLOCK_USER',
      entityType: 'user',
      entityId: id,
      req,
    });

    return res.rows[0];
  }
}

module.exports = new AuthService();
