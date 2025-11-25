/**
 * Email Service
 * Handles sending emails
 */

const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

const transport = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

transport
  .verify()
  .then(() => logger.info('Connected to email server'))
  .catch((err) => logger.warn('Unable to connect to email server.', err));

const emailService = {
  /**
   * Send an email
   */
  async send(to, subject, html) {
    if (config.env === 'test') {
      logger.info(`Email sending skipped in test environment. To: ${to}, Subject: ${subject}`);
      return;
    }
    
    try {
      await transport.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
      });
    } catch (error) {
      logger.error('Email sending failed:', error);
      // Don't throw error to user, just log it
    }
  },

  /**
   * Send verification email
   */
  async sendVerificationEmail(to, token) {
    const subject = 'Verify your email for AWS Interview Master';
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    const html = `<p>Please click this link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`;
    await this.send(to, subject, html);
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to, token) {
    const subject = 'Password Reset for AWS Interview Master';
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    const html = `<p>Please click this link to reset your password: <a href="${resetUrl}">${resetUrl}</a></p>`;
    await this.send(to, subject, html);
  },
};

module.exports = emailService;