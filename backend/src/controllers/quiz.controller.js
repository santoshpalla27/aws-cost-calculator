/**
 * Quiz Controller
 * Handles HTTP requests for quiz endpoints
 */

const quizService = require('../services/quiz.service');

const quizController = {
  /**
   * GET /api/v1/quizzes
   */
  async getQuizzes(req, res, next) {
    try {
      const result = await quizService.getQuizzes(req.query);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/quizzes/:id
   */
  async getQuiz(req, res, next) {
    try {
      const quiz = await quizService.getQuiz(req.params.id);
      res.json({
        success: true,
        data: quiz,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/quizzes/:quizId/start
   */
  async startQuiz(req, res, next) {
    try {
      const result = await quizService.startQuiz(
        req.user.id,
        req.params.quizId,
        req.ip
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
   * POST /api/v1/quizzes/attempts/:attemptId/submit
   */
  async submitQuiz(req, res, next) {
    try {
      const result = await quizService.submitQuiz(
        req.user.id,
        req.params.attemptId,
        req.body.answers
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
   * GET /api/v1/quizzes/attempts/:attemptId/result
   */
  async getAttemptResult(req, res, next) {
    try {
      const result = await quizService.getAttemptResult(
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

  /**
   * GET /api/v1/quizzes/history
   */
  async getQuizHistory(req, res, next) {
    try {
      const history = await quizService.getUserQuizHistory(
        req.user.id,
        req.query.quizId
      );
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  },

  // Admin endpoints
  /**
   * POST /api/v1/admin/quizzes
   */
  async createQuiz(req, res, next) {
    try {
      const quiz = await quizService.createQuiz(req.body, req.user.id);
      res.status(201).json({
        success: true,
        data: quiz,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/admin/quizzes/:id
   */
  async updateQuiz(req, res, next) {
    try {
      const quiz = await quizService.updateQuiz(
        req.params.id,
        req.body,
        req.user.id
      );
      res.json({
        success: true,
        data: quiz,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/admin/quizzes/:id
   */
  async deleteQuiz(req, res, next) {
    try {
      const result = await quizService.deleteQuiz(req.params.id, req.user.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/admin/quizzes/:quizId/questions
   */
  async getQuizQuestions(req, res, next) {
    try {
      const questions = await quizService.getQuizQuestions(req.params.quizId);
      res.json({
        success: true,
        data: questions,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/admin/quizzes/:quizId/questions
   */
  async addQuestion(req, res, next) {
    try {
      const question = await quizService.addQuestion(
        req.params.quizId,
        req.body,
        req.user.id
      );
      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/admin/questions/:questionId
   */
  async updateQuestion(req, res, next) {
    try {
      const question = await quizService.updateQuestion(
        req.params.questionId,
        req.body,
        req.user.id
      );
      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/admin/questions/:questionId
   */
  async deleteQuestion(req, res, next) {
    try {
      const result = await quizService.deleteQuestion(
        req.params.questionId,
        req.user.id
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = quizController;