/**
 * Authentication Service
 * Handles all authentication-related business logic
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userRepository = require('../repositories/user.repository');
const { query } = require('../config/database');
const { generateToken, generateUUID } = require('../utils/helpers');
const {
  AuthenticationError,
  ValidationError,
  ConflictError,
  NotFoundError,
} = require('../utils/errors');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

const authService = {
  /**
   * Register new user
   */
  async signup(userData) {
    const { email, username, password, firstName, lastName } = userData;

    // Check if email exists
    if (await userRepository.emailExists(email)) {
      throw new ConflictError('Email already registered');
    }

    // Check if username exists
    if (await userRepository.usernameExists(username)) {
      throw new ConflictError('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Get default role
    const roleId = await userRepository.getDefaultRoleId();
    if (!roleId) {
      throw new Error('Default user role not found');
    }

    // Create user
    const user = await userRepository.create({
      email,
      username,
      passwordHash,
      firstName,
      lastName,
      roleId,
    });

    // Generate email verification token
    const verificationToken = generateToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await query(
      `INSERT INTO email_verification (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [generateUUID(), user.id, verificationToken, expiresAt]
    );

    // TODO: Send verification email
    logger.info(`Verification token for ${email}: ${verificationToken}`);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  },

  /**
   * Login user
   */
  async login(email, password, ipAddress = null, userAgent = null) {
    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is active
    if (!user.is_active) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if email is verified (optional: can be enforced)
    if (!user.is_verified && config.env === 'production') {
      throw new AuthenticationError('Please verify your email before logging in');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    // Update last login
    await userRepository.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name,
        avatarUrl: user.avatar_url,
      },
      ...tokens,
    };
  },

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user, ipAddress = null, userAgent = null) {
    // Generate access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role_name,
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry }
    );

    // Generate refresh token
    const refreshToken = generateToken(64);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token
    await query(
      `INSERT INTO session_tokens (id, user_id, refresh_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [generateUUID(), user.id, refreshToken, ipAddress, userAgent, expiresAt]
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.accessExpiry,
    };
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    // Find refresh token
    const result = await query(
      `SELECT st.*, u.email, u.username, r.name as role_name
       FROM session_tokens st
       JOIN users u ON st.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE st.refresh_token = $1 AND st.is_revoked = false AND st.expires_at > NOW()`,
      [refreshToken]
    );

    const session = result.rows[0];
    if (!session) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: session.user_id,
        email: session.email,
        role: session.role_name,
      },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry }
    );

    return {
      accessToken,
      expiresIn: config.jwt.accessExpiry,
    };
  },

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken) {
    await query(
      `UPDATE session_tokens SET is_revoked = true WHERE refresh_token = $1`,
      [refreshToken]
    );
    return { message: 'Logged out successfully' };
  },

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await query(
      `UPDATE session_tokens SET is_revoked = true WHERE user_id = $1`,
      [userId]
    );
    return { message: 'Logged out from all devices' };
  },

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const result = await query(
      `SELECT * FROM email_verification
       WHERE token = $1 AND verified_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    const verification = result.rows[0];
    if (!verification) {
      throw new ValidationError('Invalid or expired verification token');
    }

    // Mark as verified
    await query(
      `UPDATE email_verification SET verified_at = NOW() WHERE id = $1`,
      [verification.id]
    );

    // Update user
    await userRepository.update(verification.user_id, { isVerified: true });

    return { message: 'Email verified successfully' };
  },

  /**
   * Request password reset
   */
  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = generateToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_resets (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [generateUUID(), user.id, resetToken, expiresAt]
    );

    // TODO: Send reset email
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent' };
  },

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    const result = await query(
      `SELECT * FROM password_resets
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    const reset = result.rows[0];
    if (!reset) {
      throw new ValidationError('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await userRepository.updatePassword(reset.user_id, passwordHash);

    // Mark token as used
    await query(
      `UPDATE password_resets SET used_at = NOW() WHERE id = $1`,
      [reset.id]
    );

    // Revoke all sessions for security
    await this.logoutAll(reset.user_id);

    return { message: 'Password reset successfully' };
  },

  /**
   * Change password (authenticated)
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await userRepository.updatePassword(userId, passwordHash);

    return { message: 'Password changed successfully' };
  },
};

module.exports = authService;