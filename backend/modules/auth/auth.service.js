// backend/modules/auth/auth.service.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const env = require('../../config/env');

const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = '24h';

const authService = {
  /**
   * Register a new user.
   */
  async register({ name, email, password, role = 'member' }) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      const err = new Error('Name is required.');
      err.status = 400;
      throw err;
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      const err = new Error('Email is required.');
      err.status = 400;
      throw err;
    }

    // Basic email format validation
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      const err = new Error('Invalid email format.');
      err.status = 400;
      throw err;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      const err = new Error('Password must be at least 6 characters long.');
      err.status = 400;
      throw err;
    }

    // Check if user already exists
    const existing = await authRepository.findByEmail(normalizedEmail);
    if (existing) {
      const err = new Error('Email already registered.');
      err.status = 409;
      throw err;
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Persist safe record
    const user = await authRepository.createUser({
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role: role || 'member',
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    };
  },

  /**
   * Authenticate user with email and password.
   */
  async login({ email, password }) {
    if (!email || !password) {
      const err = new Error('Email and password are required.');
      err.status = 400;
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await authRepository.findByEmail(normalizedEmail);

    if (!user) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      throw err;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      },
      token,
    };
  },

  /**
   * Get authenticated user profile.
   */
  async getCurrentUserProfile(userId) {
    const user = await authRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      throw err;
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };
  },
};

module.exports = authService;
