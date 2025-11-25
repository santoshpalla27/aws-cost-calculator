/**
 * Utility Helper Functions
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a secure random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate UUID
 */
const generateUUID = () => {
  return uuidv4();
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 10000) / 100;
};

/**
 * Parse time string to seconds
 */
const parseTimeToSeconds = (timeStr) => {
  const units = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  const match = timeStr.match(/^(\d+)([smhd])$/);
  if (!match) return parseInt(timeStr, 10);
  return parseInt(match[1], 10) * units[match[2]];
};

/**
 * Format seconds to human readable
 */
const formatSeconds = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};

/**
 * Sanitize object for logging (remove sensitive fields)
 */
const sanitizeForLogging = (obj, sensitiveFields = ['password', 'token', 'secret']) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  return sanitized;
};

/**
 * Paginate results
 */
const paginate = (page = 1, limit = 20) => {
  const offset = (Math.max(1, page) - 1) * limit;
  return { offset, limit: Math.min(100, limit) };
};

/**
 * Build pagination response
 */
const buildPaginationResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

module.exports = {
  generateToken,
  generateUUID,
  shuffleArray,
  calculatePercentage,
  parseTimeToSeconds,
  formatSeconds,
  sanitizeForLogging,
  paginate,
  buildPaginationResponse,
};