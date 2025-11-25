/**
 * Scenario Controller
 * Handles HTTP requests for scenario endpoints
 */

const scenarioService = require('../services/scenario.service');

const scenarioController = {
  /**
   * GET /api/v1/scenarios
   */
  async getScenarios(req, res, next) {
    try {
      const result = await scenarioService.getScenarios(req.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/scenarios/:id
   */
  async getScenario(req, res, next) {
    try {
      const scenario = await scenarioService.getScenario(req.params.id);
      res.json({
        success: true,
        data: scenario,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/scenarios/:scenarioId/start
   */
  async startScenario(req, res, next) {
    try {
      const result = await scenarioService.startScenario(
        req.user.id,
        req.params.scenarioId
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
   * POST /api/v1/scenarios/evaluations/:evaluationId/step
   */
  async submitStep(req, res, next) {
    try {
      const result = await scenarioService.submitStep(
        req.user.id,
        req.params.evaluationId,
        req.body.stepId
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
   * GET /api/v1/scenarios/evaluations/:evaluationId/result
   */
  async getEvaluationResult(req, res, next) {
    try {
      const result = await scenarioService.getEvaluationResult(
        req.user.id,
        req.params.evaluationId
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  // ... Admin methods for scenarios
};

module.exports = scenarioController;