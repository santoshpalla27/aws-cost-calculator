/**
 * Rate Limiting Middleware
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const { RateLimitError } = require('../utils/errors');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new RateLimitError());
  },
});

/**
 * Strict rate limiter for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res, next) => {
    next(new RateLimitError('Too many login attempts, please try again in 15 minutes'));
  },
});

/**
 * Quiz submission rate limiter
 */
const quizSubmitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 submissions per minute
  message: { error: 'Too many submissions, please slow down' },
  handler: (req, res, next) => {
    next(new RateLimitError('Too many submissions'));
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  quizSubmitLimiter,
};