/**
 * Admin Routes
 */

const express = require('express');
const adminController = require('../controllers/admin.controller');
const quizController = require('../controllers/quiz.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/rbac.middleware');
const { validateBody, validateParams, validateQuery } = require('../middleware/validate.middleware');
const { createQuizSchema, updateQuizSchema, createQuizOptionSchema, uuidParamSchema, quizIdParamSchema } = require('../validators/quiz.validator');

const router = express.Router();

router.use(authenticate, isAdmin);

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard stats
 *     tags: [Admin]
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @swagger
 * /api/v1/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin]
 */
router.get('/audit-logs', validateQuery(/*schema*/), adminController.getAuditLogs);


// Quiz Management
router.post('/quizzes', validateBody(createQuizSchema), quizController.createQuiz);
router.put('/quizzes/:id', validateParams(uuidParamSchema), validateBody(updateQuizSchema), quizController.updateQuiz);
router.delete('/quizzes/:id', validateParams(uuidParamSchema), quizController.deleteQuiz);
router.get('/quizzes/:quizId/questions', validateParams(quizIdParamSchema), quizController.getQuizQuestions);
router.post('/quizzes/:quizId/questions', validateParams(quizIdParamSchema), validateBody(createQuizOptionSchema), quizController.addQuestion);
router.put('/questions/:questionId', validateParams(uuidParamSchema), validateBody(updateQuizSchema), quizController.updateQuestion);
router.delete('/questions/:questionId', validateParams(uuidParamSchema), quizController.deleteQuestion);

// TODO: Add Scenario and Puzzle management routes

module.exports = router;