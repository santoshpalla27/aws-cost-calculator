/**
 * Puzzle Service
 * Business logic for puzzle operations
 */

const puzzleRepository = require('../repositories/puzzle.repository');
const leaderboardRepository = require('../repositories/leaderboard.repository');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');
const { buildPaginationResponse } = require('../utils/helpers');
const { ATTEMPT_STATUS } = require('../utils/constants');
const puzzleEngine = require('../engines/puzzle.engine');

const puzzleService = {
  /**
   * Get all puzzles with filters
   */
  async getPuzzles(filters) {
    const { puzzles, total } = await puzzleRepository.findAll(filters);
    return buildPaginationResponse(puzzles, total, filters.page, filters.limit);
  },

  /**
   * Get puzzle by ID
   */
  async getPuzzle(puzzleId) {
    const puzzle = await puzzleRepository.findById(puzzleId);
    if (!puzzle) {
      throw new NotFoundError('Puzzle');
    }
    puzzle.components = await puzzleRepository.getItems(puzzleId);
    return puzzle;
  },

  /**
   * Start puzzle attempt
   */
  async startPuzzle(userId, puzzleId) {
    const puzzle = await puzzleRepository.findById(puzzleId);
    if (!puzzle || !puzzle.is_active) {
      throw new NotFoundError('Puzzle');
    }

    // Check max attempts
    if (puzzle.max_attempts) {
      const attemptCount = await puzzleRepository.countUserAttempts(userId, puzzleId);
      if (attemptCount >= puzzle.max_attempts) {
        throw new ConflictError(`Maximum attempts (${puzzle.max_attempts}) reached`);
      }
    }
    
    const items = await puzzleRepository.getItems(puzzleId);
    const maxScore = items.filter(i => i.is_required).length;

    const attempt = await puzzleRepository.createAttempt(userId, puzzleId, maxScore);

    return {
      attemptId: attempt.id,
      puzzle: {
        id: puzzle.id,
        title: puzzle.title,
        description: puzzle.description,
        requirements: puzzle.requirements,
        hints: puzzle.hints,
        timeLimit: puzzle.time_limit_seconds,
      },
      availableComponents: puzzleEngine.getAvailableComponents(),
      startedAt: attempt.started_at,
    };
  },

  /**
   * Submit puzzle solution
   */
  async submitPuzzle(userId, attemptId, submission) {
    const attempt = await puzzleRepository.getAttempt(attemptId);
    if (!attempt || attempt.user_id !== userId) {
      throw new NotFoundError('Puzzle attempt');
    }

    if (attempt.status === ATTEMPT_STATUS.COMPLETED) {
      throw new ConflictError('Puzzle already submitted');
    }

    const evaluation = await puzzleEngine.evaluatePuzzle(attempt.puzzle_id, submission);

    const timeTaken = Math.floor((Date.now() - new Date(attempt.started_at).getTime()) / 1000);

    const updatedAttempt = await puzzleRepository.updateAttempt(attemptId, {
      submittedArchitecture: submission,
      score: evaluation.score,
      percentage: evaluation.percentage,
      correctComponents: evaluation.correctComponents.length,
      correctConnections: evaluation.correctConnections.length,
      missingComponents: evaluation.missingComponents.map(c => c.componentType),
      incorrectConnections: evaluation.incorrectConnections.map(c => `${c.fromItemId}->${c.toItemId}`),
      timeTakenSeconds: timeTaken,
      status: ATTEMPT_STATUS.COMPLETED,
      feedback: evaluation.feedback,
    });

    // Update leaderboard
    await leaderboardRepository.upsertEntry(
      userId,
      attempt.puzzle_type, // Assuming puzzle_type can be a category
      evaluation.score,
      'puzzle'
    );

    return evaluation;
  },

  /**
   * Get puzzle attempt result
   */
  async getAttemptResult(userId, attemptId) {
    const attempt = await puzzleRepository.getAttempt(attemptId);
    if (!attempt || attempt.user_id !== userId) {
      throw new NotFoundError('Puzzle attempt');
    }

    if (attempt.status !== ATTEMPT_STATUS.COMPLETED) {
      throw new ValidationError('Puzzle not yet submitted');
    }

    return {
      attemptId: attempt.id,
      puzzleTitle: attempt.puzzle_title,
      submittedArchitecture: attempt.submitted_architecture,
      score: attempt.score,
      percentage: parseFloat(attempt.percentage),
      feedback: attempt.feedback,
      completedAt: attempt.completed_at,
    };
  },
};

module.exports = puzzleService;