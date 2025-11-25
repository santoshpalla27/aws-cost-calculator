/**
 * Scenario Service
 * Business logic for scenario operations
 */

const scenarioRepository = require('../repositories/scenario.repository');
const leaderboardRepository = require('../repositories/leaderboard.repository');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');
const { buildPaginationResponse } = require('../utils/helpers');
const { ATTEMPT_STATUS } = require('../utils/constants');
const scenarioEngine = require('../engines/scenario.engine');
const logger = require('../utils/logger');

const scenarioService = {
  /**
   * Get all scenarios with filters
   */
  async getScenarios(filters) {
    const { scenarios, total } = await scenarioRepository.findAll(filters);
    return buildPaginationResponse(scenarios, total, filters.page, filters.limit);
  },

  /**
   * Get scenario by ID
   */
  async getScenario(scenarioId) {
    const scenario = await scenarioRepository.findById(scenarioId);
    if (!scenario) {
      throw new NotFoundError('Scenario');
    }
    return scenario;
  },

  /**
   * Start scenario attempt
   */
  async startScenario(userId, scenarioId) {
    const scenario = await scenarioRepository.findById(scenarioId);
    if (!scenario || !scenario.is_active) {
      throw new NotFoundError('Scenario');
    }

    // Check max attempts
    if (scenario.max_attempts) {
      const attemptCount = await scenarioRepository.countUserEvaluations(userId, scenarioId);
      if (attemptCount >= scenario.max_attempts) {
        throw new ConflictError(`Maximum attempts (${scenario.max_attempts}) reached`);
      }
    }

    const steps = await scenarioRepository.getSteps(scenarioId);
    const totalSteps = steps.filter(s => s.is_correct).length;

    // Create evaluation
    const evaluation = await scenarioRepository.createEvaluation(
      userId,
      scenarioId,
      totalSteps,
      totalSteps // maxScore is total correct steps
    );

    return {
      evaluationId: evaluation.id,
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        category: scenario.category,
        difficulty: scenario.difficulty,
        symptoms: scenario.symptoms,
        logs: scenario.logs,
        context: scenario.context,
        timeLimit: scenario.time_limit_seconds,
      },
      steps: steps.map(s => ({ id: s.id, actionText: s.action_text, actionCommand: s.action_command })),
      startedAt: evaluation.started_at,
    };
  },

  /**
   * Submit scenario step
   */
  async submitStep(userId, evaluationId, stepId) {
    const evaluation = await scenarioRepository.getEvaluation(evaluationId);
    if (!evaluation || evaluation.user_id !== userId) {
      throw new NotFoundError('Scenario evaluation');
    }

    if (evaluation.status === ATTEMPT_STATUS.COMPLETED) {
      throw new ConflictError('Scenario already completed');
    }

    const previousSteps = evaluation.steps_taken || [];
    const stepResult = await scenarioEngine.evaluateStep(evaluation.scenario_id, stepId, previousSteps);

    if (!stepResult.valid) {
      throw new ValidationError(stepResult.error || 'Invalid step');
    }

    // Update evaluation
    const newStepsTaken = [...previousSteps, { stepId, selectedAt: new Date(), score: stepResult.score }];
    const newScore = (evaluation.score || 0) + stepResult.score;

    await scenarioRepository.updateEvaluation(evaluationId, {
      stepsTaken: newStepsTaken,
      score: newScore,
    });

    return stepResult;
  },

  /**
   * Get evaluation result
   */
  async getEvaluationResult(userId, evaluationId) {
    const evaluation = await scenarioRepository.getEvaluation(evaluationId);
    if (!evaluation || evaluation.user_id !== userId) {
      throw new NotFoundError('Scenario evaluation');
    }
    
    // Finalize if still in progress
    if (evaluation.status !== ATTEMPT_STATUS.COMPLETED) {
      const finalEval = await scenarioEngine.evaluateScenario(evaluation.scenario_id, evaluation.steps_taken);

      await scenarioRepository.updateEvaluation(evaluationId, {
        score: finalEval.score,
        percentage: finalEval.percentage,
        correctSteps: finalEval.correctSteps,
        feedback: finalEval.feedback.message,
        status: ATTEMPT_STATUS.COMPLETED,
      });

      // Update leaderboard
      await leaderboardRepository.upsertEntry(
        userId,
        evaluation.category,
        finalEval.score,
        'scenario'
      );
      
      return finalEval;
    }

    return {
      score: evaluation.score,
      maxScore: evaluation.max_score,
      percentage: parseFloat(evaluation.percentage),
      details: evaluation.steps_taken,
      feedback: evaluation.feedback,
      explanation: evaluation.explanation,
      learningPoints: evaluation.learning_points,
    };
  },
};

module.exports = scenarioService;