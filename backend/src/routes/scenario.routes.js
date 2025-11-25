/**
 * Scenario Routes
 */

const express = require('express');
const scenarioController = require('../controllers/scenario.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate.middleware');
const {
  scenarioListQuerySchema,
  submitScenarioStepSchema,
  scenarioIdParamSchema,
  evaluationIdParamSchema,
} = require('../validators/scenario.validator');

const router = express.Router();

router.get('/', validateQuery(scenarioListQuerySchema), scenarioController.getScenarios);

router.get('/:id', validateParams(scenarioIdParamSchema), scenarioController.getScenario);

router.post(
  '/:scenarioId/start',
  authenticate,
  validateParams(scenarioIdParamSchema),
  scenarioController.startScenario
);

router.post(
  '/evaluations/:evaluationId/step',
  authenticate,
  validateParams(evaluationIdParamSchema),
  validateBody(submitScenarioStepSchema),
  scenarioController.submitStep
);

router.get(
  '/evaluations/:evaluationId/result',
  authenticate,
  validateParams(evaluationIdParamSchema),
  scenarioController.getEvaluationResult
);

module.exports = router;