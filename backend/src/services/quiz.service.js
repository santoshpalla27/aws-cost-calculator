/**
 * Quiz Service
 * Business logic for quiz operations
 */

const quizRepository = require('../repositories/quiz.repository');
const leaderboardRepository = require('../repositories/leaderboard.repository');
const { cacheHelper } = require('../config/redis');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const { calculatePercentage, buildPaginationResponse } = require('../utils/helpers');
const { CACHE_KEYS, CACHE_TTL, ATTEMPT_STATUS } = require('../utils/constants');
const quizEngine = require('../engines/quiz.engine');
const logger = require('../utils/logger');

const quizService = {
  /**
   * Get all quizzes with filters
   */
  async getQuizzes(filters) {
    const cacheKey = `${CACHE_KEYS.QUIZ_LIST}:${JSON.stringify(filters)}`;
    
    // Try cache first
    const cached = await cacheHelper.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { quizzes, total } = await quizRepository.findAll(filters);
    const result = buildPaginationResponse(quizzes, total, filters.page, filters.limit);

    // Cache result
    await cacheHelper.set(cacheKey, result, CACHE_TTL.QUIZ_LIST);

    return result;
  },

  /**
   * Get quiz by ID
   */
  async getQuiz(quizId) {
    const quiz = await quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    // Get question count
    const questions = await quizRepository.getQuestions(quizId, false);
    quiz.questionCount = questions.length;

    return quiz;
  },

  /**
   * Start quiz attempt
   */
  async startQuiz(userId, quizId, ipAddress = null) {
    const quiz = await quizRepository.findById(quizId);
    if (!quiz || !quiz.is_active) {
      throw new NotFoundError('Quiz');
    }

    // Check max attempts
    if (quiz.max_attempts) {
      const attemptCount = await quizRepository.countUserAttempts(userId, quizId);
      if (attemptCount >= quiz.max_attempts) {
        throw new ConflictError(`Maximum attempts (${quiz.max_attempts}) reached`);
      }
    }

    // Check for in-progress attempt
    const inProgress = await quizRepository.getInProgressAttempt(userId, quizId);
    if (inProgress) {
      // Return existing attempt
      const questions = await quizRepository.getQuestions(quizId, quiz.is_randomized);
      return {
        attemptId: inProgress.id,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          category: quiz.category,
          difficulty: quiz.difficulty,
          timeLimit: quiz.time_limit_seconds,
          passingScore: quiz.passing_score,
        },
        questions: questions.map(this.sanitizeQuestion),
        startedAt: inProgress.started_at,
        isResume: true,
      };
    }

    // Get questions
    const questions = await quizRepository.getQuestions(quizId, quiz.is_randomized);
    if (questions.length === 0) {
      throw new ValidationError('Quiz has no questions');
    }

    // Create attempt
    const attempt = await quizRepository.createAttempt(
      userId,
      quizId,
      questions.length,
      ipAddress
    );

    return {
      attemptId: attempt.id,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        category: quiz.category,
        difficulty: quiz.difficulty,
        timeLimit: quiz.time_limit_seconds,
        passingScore: quiz.passing_score,
      },
      questions: questions.map(this.sanitizeQuestion),
      startedAt: attempt.started_at,
      isResume: false,
    };
  },

  /**
   * Submit quiz answers
   */
  async submitQuiz(userId, attemptId, answers) {
    const attempt = await quizRepository.getAttempt(attemptId);
    if (!attempt) {
      throw new NotFoundError('Quiz attempt');
    }

    if (attempt.user_id !== userId) {
      throw new ValidationError('Invalid attempt');
    }

    if (attempt.status === ATTEMPT_STATUS.COMPLETED) {
      throw new ConflictError('Quiz already submitted');
    }

    // Check time limit
    const startTime = new Date(attempt.started_at).getTime();
    const now = Date.now();
    const timeTaken = Math.floor((now - startTime) / 1000);

    if (attempt.time_limit_seconds && timeTaken > attempt.time_limit_seconds + 60) { // 60s grace
      // Auto-fail for exceeding time
      logger.warn(`Quiz attempt ${attemptId} exceeded time limit`);
    }

    // Evaluate answers using quiz engine
    const evaluation = await quizEngine.evaluateQuiz(attempt.quiz_id, answers);

    // Update attempt
    const updatedAttempt = await quizRepository.updateAttempt(attemptId, {
      score: evaluation.score,
      correctAnswers: evaluation.correctCount,
      percentage: evaluation.percentage,
      timeTakenSeconds: timeTaken,
      answers: evaluation.details,
      status: ATTEMPT_STATUS.COMPLETED,
    });

    // Update leaderboard
    await leaderboardRepository.upsertEntry(
      userId,
      attempt.category,
      evaluation.score,
      'quiz'
    );

    // Invalidate cache
    await cacheHelper.invalidatePattern(`${CACHE_KEYS.LEADERBOARD}:*`);

    return {
      attemptId: updatedAttempt.id,
      score: evaluation.score,
      totalQuestions: attempt.total_questions,
      correctAnswers: evaluation.correctCount,
      percentage: evaluation.percentage,
      timeTaken: timeTaken,
      passed: evaluation.percentage >= attempt.passing_score,
      passingScore: attempt.passing_score,
      details: evaluation.details,
    };
  },

  /**
   * Get attempt result
   */
  async getAttemptResult(userId, attemptId) {
    const attempt = await quizRepository.getAttempt(attemptId);
    if (!attempt) {
      throw new NotFoundError('Quiz attempt');
    }

    if (attempt.user_id !== userId) {
      throw new ValidationError('Invalid attempt');
    }

    if (attempt.status !== ATTEMPT_STATUS.COMPLETED) {
      throw new ValidationError('Quiz not yet submitted');
    }

    return {
      attemptId: attempt.id,
      quizTitle: attempt.quiz_title,
      category: attempt.category,
      difficulty: attempt.difficulty,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      correctAnswers: attempt.correct_answers,
      percentage: parseFloat(attempt.percentage),
      timeTaken: attempt.time_taken_seconds,
      passed: parseFloat(attempt.percentage) >= attempt.passing_score,
      passingScore: attempt.passing_score,
      answers: attempt.answers,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at,
    };
  },

  /**
   * Get user's quiz history
   */
  async getUserQuizHistory(userId, quizId = null) {
    if (quizId) {
      return quizRepository.getUserAttempts(userId, quizId);
    }

    // Get all completed attempts
    const result = await require('../config/database').query(
      `SELECT qa.*, q.title as quiz_title, q.category, q.difficulty
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE qa.user_id = $1 AND qa.status = 'completed'
       ORDER BY qa.completed_at DESC
       LIMIT 50`,
      [userId]
    );

    return result.rows;
  },

  /**
   * Remove sensitive data from question for client
   */
  sanitizeQuestion(question) {
    return {
      id: question.id,
      questionText: question.question_text,
      options: question.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        // Don't include isCorrect!
      })),
      difficulty: question.difficulty,
      timeLimit: question.time_limit_seconds,
      points: question.points,
    };
  },

  // Admin methods
  /**
   * Create quiz (admin)
   */
  async createQuiz(quizData, adminId) {
    const quiz = await quizRepository.create(quizData, adminId);
    await cacheHelper.invalidatePattern(`${CACHE_KEYS.QUIZ_LIST}:*`);
    return quiz;
  },

  /**
   * Update quiz (admin)
   */
  async updateQuiz(quizId, updates, adminId) {
    const existing = await quizRepository.findById(quizId);
    if (!existing) {
      throw new NotFoundError('Quiz');
    }

    const updated = await quizRepository.update(quizId, updates);
    await cacheHelper.invalidatePattern(`${CACHE_KEYS.QUIZ_LIST}:*`);
    return updated;
  },

  /**
   * Delete quiz (admin)
   */
  async deleteQuiz(quizId, adminId) {
    const existing = await quizRepository.findById(quizId);
    if (!existing) {
      throw new NotFoundError('Quiz');
    }

    await quizRepository.delete(quizId);
    await cacheHelper.invalidatePattern(`${CACHE_KEYS.QUIZ_LIST}:*`);
    return { message: 'Quiz deleted successfully' };
  },

  /**
   * Add question to quiz (admin)
   */
  async addQuestion(quizId, questionData, adminId) {
    const quiz = await quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    return quizRepository.createQuestion(quizId, questionData);
  },

  /**
   * Update question (admin)
   */
  async updateQuestion(questionId, updates, adminId) {
    return quizRepository.updateQuestion(questionId, updates);
  },

  /**
   * Delete question (admin)
   */
  async deleteQuestion(questionId, adminId) {
    await quizRepository.deleteQuestion(questionId);
    return { message: 'Question deleted successfully' };
  },

  /**
   * Get quiz questions (admin - includes correct answers)
   */
  async getQuizQuestions(quizId) {
    const quiz = await quizRepository.findById(quizId);
    if (!quiz) {
      throw new NotFoundError('Quiz');
    }

    return quizRepository.getQuestions(quizId, false);
  },
};

module.exports = quizService;