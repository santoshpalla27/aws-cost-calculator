/**
 * Puzzle Controller
 * Handles HTTP requests for puzzle endpoints
 */

const puzzleService = require('../services/puzzle.service');

const puzzleController = {
  /**
   * GET /api/v1/puzzles
   */
  async getPuzzles(req, res, next) {
    try {
      const result = await puzzleService.getPuzzles(req.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/puzzles/:id
   */
  async getPuzzle(req, res, next) {
    try {
      const puzzle = await puzzleService.getPuzzle(req.params.id);
      res.json({
        success: true,
        data: puzzle,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/puzzles/:puzzleId/start
   */
  async startPuzzle(req, res, next) {
    try {
      const result = await puzzleService.startPuzzle(
        req.user.id,
        req.params.puzzleId
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/puzzles/attempts/:attemptId/submit
   */
  async submitPuzzle(req, res, next) {
    try {
      const result = await puzzleService.submitPuzzle(
        req.user.id,
        req.params.attemptId,
        req.body
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/puzzles/attempts/:attemptId/result
   */
  async getAttemptResult(req, res, next) {
    try {
      const result = await puzzleService.getAttemptResult(
        req.user.id,
        req.params.attemptId
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // ... Admin methods for puzzles
};

module.exports = puzzleController;