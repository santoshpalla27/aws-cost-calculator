/**
 * Puzzle Routes
 */

const express = require('express');
const puzzleController = require('../controllers/puzzle.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate.middleware');
const {
  puzzleListQuerySchema,
  submitPuzzleSolutionSchema,
  puzzleIdParamSchema,
  puzzleAttemptIdParamSchema,
} = require('../validators/puzzle.validator');

const router = express.Router();

router.get('/', validateQuery(puzzleListQuerySchema), puzzleController.getPuzzles);

router.get('/:id', validateParams(puzzleIdParamSchema), puzzleController.getPuzzle);

router.post(
  '/:puzzleId/start',
  authenticate,
  validateParams(puzzleIdParamSchema),
  puzzleController.startPuzzle
);

router.post(
  '/attempts/:attemptId/submit',
  authenticate,
  validateParams(puzzleAttemptIdParamSchema),
  validateBody(submitPuzzleSolutionSchema),
  puzzleController.submitPuzzle
);

router.get(
  '/attempts/:attemptId/result',
  authenticate,
  validateParams(puzzleAttemptIdParamSchema),
  puzzleController.getAttemptResult
);

module.exports = router;