/**
 * Quiz Evaluation Engine
 * Handles quiz scoring and evaluation logic
 */

const quizRepository = require('../repositories/quiz.repository');
const { calculatePercentage, shuffleArray } = require('../utils/helpers');
const logger = require('../utils/logger');

const quizEngine = {
  /**
   * Evaluate quiz answers
   * @param {string} quizId - Quiz ID
   * @param {Array} answers - Array of {questionId, selectedOptionIds, timeSpentSeconds}
   * @returns {Object} Evaluation result
   */
  async evaluateQuiz(quizId, answers) {
    const details = [];
    let totalScore = 0;
    let correctCount = 0;
    let totalPoints = 0;

    for (const answer of answers) {
      const question = await quizRepository.getQuestionWithAnswer(answer.questionId);
      
      if (!question) {
        logger.warn(`Question ${answer.questionId} not found during evaluation`);
        continue;
      }

      totalPoints += question.points;

      // Evaluate the answer
      const evaluation = this.evaluateAnswer(
        question,
        answer.selectedOptionIds
      );

      if (evaluation.isCorrect) {
        totalScore += question.points;
        correctCount++;
      }

      details.push({
        questionId: answer.questionId,
        questionText: question.question_text,
        selectedOptionIds: answer.selectedOptionIds,
        correctOptionIds: question.correct_option_ids,
        isCorrect: evaluation.isCorrect,
        pointsEarned: evaluation.isCorrect ? question.points : 0,
        maxPoints: question.points,
        explanation: question.explanation,
        timeSpent: answer.timeSpentSeconds || 0,
      });
    }

    const percentage = calculatePercentage(totalScore, totalPoints);

    return {
      score: totalScore,
      maxScore: totalPoints,
      correctCount,
      totalQuestions: answers.length,
      percentage,
      details,
    };
  },

  /**
   * Evaluate a single answer
   * @param {Object} question - Question object with correct_option_ids
   * @param {Array} selectedIds - User's selected option IDs
   * @returns {Object} {isCorrect, partialCredit}
   */
  evaluateAnswer(question, selectedIds) {
    const correctIds = question.correct_option_ids || [];
    const selected = Array.isArray(selectedIds) ? selectedIds : [selectedIds];

    // Check if all selected answers are correct and all correct answers are selected
    if (correctIds.length === 0) {
      return { isCorrect: false, partialCredit: 0 };
    }

    const correctSelected = selected.filter((id) => correctIds.includes(id));
    const incorrectSelected = selected.filter((id) => !correctIds.includes(id));

    // Exact match required for full credit
    const isExactMatch =
      correctSelected.length === correctIds.length &&
      incorrectSelected.length === 0;

    // Calculate partial credit (optional feature)
    let partialCredit = 0;
    if (!isExactMatch && correctSelected.length > 0) {
      // Partial credit: correct selections / total correct - penalty for wrong
      partialCredit = Math.max(
        0,
        (correctSelected.length / correctIds.length) -
          (incorrectSelected.length * 0.25)
      );
    }

    return {
      isCorrect: isExactMatch,
      partialCredit: isExactMatch ? 1 : partialCredit,
    };
  },

  /**
   * Randomize questions and their options
   * @param {Array} questions - Array of question objects
   * @returns {Array} Randomized questions
   */
  randomizeQuestions(questions) {
    // Shuffle questions
    const shuffledQuestions = shuffleArray(questions);

    // Shuffle options within each question
    return shuffledQuestions.map((q) => ({
      ...q,
      options: shuffleArray(q.options),
    }));
  },

  /**
   * Check if answer is within time limit
   * @param {Date} startTime - Quiz start time
   * @param {number} timeLimit - Time limit in seconds
   * @param {number} graceSeconds - Grace period in seconds
   * @returns {boolean}
   */
  isWithinTimeLimit(startTime, timeLimit, graceSeconds = 60) {
    if (!timeLimit) return true;

    const elapsed = (Date.now() - new Date(startTime).getTime()) / 1000;
    return elapsed <= timeLimit + graceSeconds;
  },

  /**
   * Calculate performance metrics
   * @param {Object} attempt - Quiz attempt with answers
   * @returns {Object} Performance metrics
   */
  calculatePerformanceMetrics(attempt) {
    const answers = attempt.answers || [];
    
    if (answers.length === 0) {
      return {
        averageTimePerQuestion: 0,
        fastestQuestion: null,
        slowestQuestion: null,
        accuracyByDifficulty: {},
      };
    }

    // Average time per question
    const totalTime = answers.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
    const averageTimePerQuestion = totalTime / answers.length;

    // Fastest and slowest
    const sorted = [...answers].sort((a, b) => (a.timeSpent || 0) - (b.timeSpent || 0));
    const fastestQuestion = sorted[0];
    const slowestQuestion = sorted[sorted.length - 1];

    // Accuracy by difficulty (if difficulty info is included)
    const accuracyByDifficulty = {};
    // This would need difficulty information in answers

    return {
      averageTimePerQuestion: Math.round(averageTimePerQuestion),
      fastestQuestion,
      slowestQuestion,
      accuracyByDifficulty,
    };
  },
};

module.exports = quizEngine;