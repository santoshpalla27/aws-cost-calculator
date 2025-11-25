/**
 * Leaderboard Controller
 * Handles HTTP requests for leaderboard endpoints
 */

const leaderboardService = require('../services/leaderboard.service');

const leaderboardController = {
  /**
   * GET /api/v1/leaderboard
   */
  async getLeaderboard(req, res, next) {
    try {
      const result = await leaderboardService.getLeaderboard(req.query);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/leaderboard/rank
   */
  async getUserRank(req, res, next) {
    try {
      const result = await leaderboardService.getUserRank(req.user.id, req.query.category);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = leaderboardController;