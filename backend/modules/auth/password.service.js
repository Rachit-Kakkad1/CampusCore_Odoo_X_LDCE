const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../../config/database');
const auditService = require('../../shared/audit/audit.service');
const { emailService } = require('../../shared/email/email.service');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

class PasswordService {
  /**
   * Changes password for an authenticated user.
   */
  async changePassword(userId, currentPassword, newPassword, req = null) {
    if (!currentPassword || !newPassword) {
      const err = new Error('Both current and new password are required');
      err.status = 400;
      throw err;
    }

    if (newPassword.length < 8) {
      const err = new Error('New password must be at least 8 characters long');
      err.status = 400;
      throw err;
    }

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1;', [userId]);
    if (userRes.rows.length === 0) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      await auditService.recordLog({
        actorId: userId,
        action: 'PASSWORD_CHANGE_FAILED',
        entityType: 'user',
        entityId: userId,
        metadata: { reason: 'INVALID_CURRENT_PASSWORD' },
        req,
      });

      const err = new Error('Current password does not match');
      err.status = 400;
      err.code = 'INVALID_CURRENT_PASSWORD';
      throw err;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2;', [newHash, userId]);

    // Invalidate other sessions
    const currentSessionToken = req?.headers?.['x-session-token'];
    if (currentSessionToken) {
      await pool.query(
        'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND session_token != $2;',
        [userId, currentSessionToken]
      );
    }

    await auditService.recordLog({
      actorId: userId,
      action: 'USER_PASSWORD_CHANGED',
      entityType: 'user',
      entityId: userId,
      req,
    });

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Generates a single-use, hashed-at-rest reset token and dispatches reset instructions.
   * Returns a generic message to prevent account enumeration attacks.
   */
  async requestPasswordReset(email, req = null) {
    const genericResponse = {
      success: true,
      message: 'If an account is associated with this email address, password reset instructions have been sent.',
    };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return genericResponse;
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await pool.query('SELECT id, name, email FROM users WHERE LOWER(email) = $1;', [cleanEmail]);
    if (userRes.rows.length === 0) {
      return genericResponse; // Non-revealing response
    }

    const user = userRes.rows[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Invalidate any previous unused tokens for this user
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL;', [user.id]);

    await pool.query(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
      VALUES ($1, $2, $3, NOW());
    `, [user.id, tokenHash, expiresAt]);

    await auditService.recordLog({
      actorId: user.id,
      action: 'USER_PASSWORD_RESET_REQUESTED',
      entityType: 'user',
      entityId: user.id,
      req,
    });

    // In development/test mode, dispatch email
    try {
      await emailService.sendMail({
        to: user.email,
        subject: 'Password Reset Request - CampusCore',
        text: `Hello ${user.name},\n\nYou requested a password reset. Use the following reset token: ${rawToken}\nThis token will expire in 1 hour.`,
        html: `<p>Hello ${user.name},</p><p>You requested a password reset. Use the following reset token:</p><h3>${rawToken}</h3><p>This token will expire in 1 hour.</p>`,
      });
    } catch (e) {
      console.warn('Password reset email dispatch warning:', e.message);
    }

    // In test environment, return resetToken for automated assertions
    if (process.env.NODE_ENV === 'test') {
      return { ...genericResponse, devResetToken: rawToken };
    }

    return genericResponse;
  }

  /**
   * Resets password using a valid single-use token.
   */
  async resetPassword(token, newPassword, req = null) {
    if (!token || !newPassword) {
      const err = new Error('Token and new password are required');
      err.status = 400;
      throw err;
    }

    if (newPassword.length < 8) {
      const err = new Error('New password must be at least 8 characters long');
      err.status = 400;
      throw err;
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const tokenRes = await pool.query(`
      SELECT * FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW();
    `, [tokenHash]);

    if (tokenRes.rows.length === 0) {
      const err = new Error('Invalid or expired password reset token');
      err.status = 400;
      err.code = 'INVALID_RESET_TOKEN';
      throw err;
    }

    const resetRecord = tokenRes.rows[0];
    const userId = resetRecord.user_id;

    // Mark token as used immediately to guarantee single-use
    await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1;', [resetRecord.id]);

    // Update password hash and clear any lockout
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(`
      UPDATE users
      SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL
      WHERE id = $2;
    `, [newHash, userId]);

    // Invalidate all active sessions for security
    await pool.query('UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1;', [userId]);

    await auditService.recordLog({
      actorId: userId,
      action: 'USER_PASSWORD_RESET_COMPLETED',
      entityType: 'user',
      entityId: userId,
      req,
    });

    return { success: true, message: 'Password has been reset successfully. Please log in with your new password.' };
  }
}

module.exports = new PasswordService();
