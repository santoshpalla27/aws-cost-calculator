/**
 * Scenario Evaluation Engine
 * Handles scenario-based problem solving evaluation
 */

const scenarioRepository = require('../repositories/scenario.repository');
const { calculatePercentage } = require('../utils/helpers');
const logger = require('../utils/logger');

const scenarioEngine = {
  /**
   * Evaluate a scenario step selection
   * @param {string} scenarioId - Scenario ID
   * @param {string} stepId - Selected step ID
   * @param {Array} previousSteps - Previously selected steps
   * @returns {Object} Step evaluation result
   */
  async evaluateStep(scenarioId, stepId, previousSteps = []) {
    const step = await scenarioRepository.getStep(stepId);
    
    if (!step || step.scenario_id !== scenarioId) {
      return {
        valid: false,
        error: 'Invalid step selection',
      };
    }

    const scenario = await scenarioRepository.findById(scenarioId);
    const correctSteps = scenario.correct_resolution_steps || [];

    // Determine expected step order
    const currentStepIndex = previousSteps.length;
    const expectedStepId = correctSteps[currentStepIndex];

    // Check if this is the correct step for this position
    const isCorrectStep = step.is_correct;
    const isCorrectOrder = stepId === expectedStepId;

    // Get feedback
    const feedback = isCorrectStep
      ? step.feedback_correct || 'Correct! Good choice.'
      : step.feedback_incorrect || 'This is not the optimal choice.';

    // Check if scenario is complete
    const isComplete = isCorrectStep && currentStepIndex + 1 >= correctSteps.length;

    // Calculate partial credit for partially correct steps
    let score = 0;
    if (isCorrectStep) {
      score = 1;
    } else if (step.partial_credit > 0) {
      score = step.partial_credit;
    }

    return {
      valid: true,
      isCorrect: isCorrectStep,
      isCorrectOrder,
      score,
      feedback,
      isComplete,
      nextHint: !isComplete && !isCorrectStep ? this.getHint(scenario, currentStepIndex) : null,
      leadsTo: step.leads_to_step_id,
    };
  },

  /**
   * Evaluate complete scenario attempt
   * @param {string} scenarioId - Scenario ID
   * @param {Array} stepsTaken - Array of {stepId, selectedAt, score}
   * @returns {Object} Full evaluation result
   */
  async evaluateScenario(scenarioId, stepsTaken) {
    const scenario = await scenarioRepository.findById(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    const correctSteps = scenario.correct_resolution_steps || [];
    const allSteps = await scenarioRepository.getSteps(scenarioId);

    let correctCount = 0;
    let totalScore = 0;
    const maxScore = correctSteps.length;

    const details = [];

    for (let i = 0; i < stepsTaken.length; i++) {
      const taken = stepsTaken[i];
      const step = allSteps.find((s) => s.id === taken.stepId);
      
      if (!step) continue;

      const expectedStepId = correctSteps[i];
      const isCorrect = step.is_correct;
      const isCorrectOrder = taken.stepId === expectedStepId;

      if (isCorrect) {
        correctCount++;
        totalScore += 1;
      } else if (step.partial_credit > 0) {
        totalScore += step.partial_credit;
      }

      details.push({
        stepOrder: i + 1,
        stepId: taken.stepId,
        actionText: step.action_text,
        isCorrect,
        isCorrectOrder,
        expectedStepId,
        feedback: isCorrect ? step.feedback_correct : step.feedback_incorrect,
        selectedAt: taken.selectedAt,
      });
    }

    const percentage = calculatePercentage(totalScore, maxScore);

    // Generate overall feedback
    const overallFeedback = this.generateOverallFeedback(percentage, scenario);

    return {
      score: Math.round(totalScore * 100) / 100,
      maxScore,
      correctSteps: correctCount,
      totalSteps: stepsTaken.length,
      requiredSteps: correctSteps.length,
      percentage,
      details,
      feedback: overallFeedback,
      explanation: scenario.explanation,
      learningPoints: scenario.learning_points,
      relatedDocs: scenario.related_docs,
    };
  },

  /**
   * Get hint for current step
   */
  getHint(scenario, stepIndex) {
    // Could be more sophisticated - pulling from a hints array
    const hints = [
      'Consider what information you have from the symptoms.',
      'Think about the most common causes for this type of issue.',
      'Review the logs carefully for any error patterns.',
      'Consider the order of diagnostic steps.',
      'Sometimes the simplest explanation is correct.',
    ];

    return hints[stepIndex % hints.length];
  },

  /**
   * Generate overall feedback based on score
   */
  generateOverallFeedback(percentage, scenario) {
    if (percentage >= 90) {
      return {
        level: 'excellent',
        message: 'Excellent work! You demonstrated strong troubleshooting skills.',
        recommendation: 'Try more advanced scenarios to continue improving.',
      };
    } else if (percentage >= 70) {
      return {
        level: 'good',
        message: 'Good job! You have a solid understanding of the concepts.',
        recommendation: 'Review the explanation to understand any missed steps.',
      };
    } else if (percentage >= 50) {
      return {
        level: 'fair',
        message: 'Fair attempt. There\'s room for improvement.',
        recommendation: 'Study the learning points and try similar scenarios.',
      };
    } else {
      return {
        level: 'needs_improvement',
        message: 'This scenario was challenging. Don\'t give up!',
        recommendation: 'Review the documentation and try again.',
      };
    }
  },

  /**
   * Parse and format scenario logs for display
   */
  formatScenarioLogs(logs) {
    if (!logs) return [];

    // Split logs into lines and parse
    const lines = logs.split('\n');
    return lines.map((line, index) => {
      // Detect log level
      let level = 'info';
      if (line.includes('ERROR') || line.includes('error')) level = 'error';
      else if (line.includes('WARN') || line.includes('warning')) level = 'warning';
      else if (line.includes('DEBUG')) level = 'debug';

      return {
        lineNumber: index + 1,
        content: line,
        level,
        timestamp: this.extractTimestamp(line),
      };
    });
  },

  /**
   * Extract timestamp from log line
   */
  extractTimestamp(line) {
    // Common timestamp patterns
    const patterns = [
      /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/,
      /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/,
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return match[0];
    }

    return null;
  },
};

module.exports = scenarioEngine;
