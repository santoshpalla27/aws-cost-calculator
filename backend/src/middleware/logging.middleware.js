/**
 * Request Logging Middleware
 */

const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom morgan token for request ID
morgan.token('request-id', (req) => req.id);

// Custom token for user ID
morgan.token('user-id', (req) => req.user?.id || 'anonymous');

// Morgan format
const morganFormat = ':method :url :status :response-time ms - :res[content-length] - :user-id';

// Morgan stream to winston
const stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Create morgan middleware
const requestLogger = morgan(morganFormat, {
  stream,
  skip: (req, res) => {
    // Skip health check endpoints
    return req.url === '/health' || req.url === '/api/v1/health';
  },
});

module.exports = requestLogger;