/**
 * Quiz Routes
 */

const express = require('express');
const quizController = require('../controllers/quiz.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody, validateQuery, validateParams } = require('../middleware/validate.middleware');
const { quizSubmitLimiter } = require('../middleware/rateLimit.middleware');
const {
  quizListQuerySchema,
  submitQuizAnswersSchema,
  uuidParamSchema,
  quizIdParamSchema,
  attemptIdParamSchema,
} = require('../validators/quiz.validator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/quizzes:
 *   get:
 *     summary: Get all quizzes
 *     tags: [Quizzes]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [aws, devops, terraform, kubernetes, docker, cicd, networking]
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [L1, L2, L3]
 */
router.get('/', validateQuery(quizListQuerySchema), quizController.getQuizzes);

/**
 * @swagger
 * /api/v1/quizzes/{id}:
 *   get:
 *     summary: Get quiz by ID
 *     tags: [Quizzes]
 */
router.get('/:id', validateParams(uuidParamSchema), quizController.getQuiz);

/**
 * @swagger
 * /api/v1/quizzes/{quizId}/start:
 *   post:
 *     summary: Start a quiz attempt
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:quizId/start',
  authenticate,
  validateParams(quizIdParamSchema),
  quizController.startQuiz
);

/**
 * @swagger
 * /api/v1/quizzes/attempts/{attemptId}/submit:
 *   post:
 *     summary: Submit quiz answers
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/attempts/:attemptId/submit',
  authenticate,
  quizSubmitLimiter,
  validateParams(attemptIdParamSchema),
  validateBody(submitQuizAnswersSchema),
  quizController.submitQuiz
);

/**
 * @swagger
 * /api/v1/quizzes/attempts/{attemptId}/result:
 *   get:
 *     summary: Get quiz attempt result
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/attempts/:attemptId/result',
  authenticate,
  validateParams(attemptIdParamSchema),
  quizController.getAttemptResult
);

/**
 * @swagger
 * /api/v1/quizzes/history:
 *   get:
 *     summary: Get user's quiz history
 *     tags: [Quizzes]
 *     security:
 *       - bearerAuth: []
 */
router.get('/history', authenticate, quizController.getQuizHistory);

module.exports = router;