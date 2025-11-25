/**
 * Redis Configuration
 */

const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redis = null;

// Create Redis client if Redis is configured
if (config.redis.host) {
  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  });

  redis.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });
}

// Cache helper functions
const cacheHelper = {
  async get(key) {
    if (!redis) return null;
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 3600) {
    if (!redis) return false;
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  },

  async del(key) {
    if (!redis) return false;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  },

  async invalidatePattern(pattern) {
    if (!redis) return false;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis invalidate pattern error:', error);
      return false;
    }
  },
};

module.exports = { redis, cacheHelper };