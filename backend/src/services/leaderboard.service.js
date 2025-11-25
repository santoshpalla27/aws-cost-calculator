/**
 * Leaderboard Service
 * Business logic for leaderboard operations
 */

const leaderboardRepository = require('../repositories/leaderboard.repository');
const { cacheHelper } = require('../config/redis');
const { CACHE_KEYS, CACHE_TTL } = require('../utils/constants');

const leaderboardService = {
  /**
   * Get leaderboard data
   */
  async getLeaderboard(filters) {
    const { category, period = 'all_time', limit = 100 } = filters;
    const cacheKey = `${CACHE_KEYS.LEADERBOARD}:${category || 'all'}:${period}`;

    const cached = await cacheHelper.get(cacheKey);
    if (cached) {
      return cached.slice(0, limit);
    }

    const leaderboard = await leaderboardRepository.getLeaderboard(category, period, limit);
    
    await cacheHelper.set(cacheKey, leaderboard, CACHE_TTL.LEADERBOARD);

    return leaderboard;
  },

  /**
   * Get user's rank
   */
  async getUserRank(userId, category = null) {
    return leaderboardRepository.getUserRank(userId, category, 'all_time');
  },
};

module.exports = leaderboardService;