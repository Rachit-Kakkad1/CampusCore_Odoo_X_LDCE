const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');
const { pool } = require('../../config/database');
const authRepository = require('./auth.repository');

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
   * Authenticates user credentials and returns safe user data and JWT token.
   */
  async login({ email, password }) {
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
      const err = new Error('Invalid email or password');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      const err = new Error('Invalid email or password');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };

    const token = jwt.sign(
      {
        id: safeUser.id,
        name: safeUser.name,
        email: safeUser.email,
        role: safeUser.role,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: safeUser,
      token,
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
}


module.exports = new AuthService();
