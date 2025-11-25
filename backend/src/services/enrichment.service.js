/**
 * Enrichment Service
 * Handles enriching question bank using external APIs
 *
 * NOTE: This is a stub for future implementation.
 */

const config = require('../config');
const logger = require('../utils/logger');

const enrichmentService = {
  /**
   * Generate new questions based on a topic
   */
  async generateQuestions(topic, count = 5) {
    if (!config.externalApis.geminiApiKey && !config.externalApis.openaiApiKey) {
      logger.warn('No API key configured for enrichment service.');
      return [];
    }

    // TODO: Implement logic to call Gemini or OpenAI to generate questions
    // Example prompt: "Generate 5 multiple choice questions about AWS ${topic} for an advanced level DevOps engineer."

    return [
      // Example generated question structure
      // {
      //   questionText: 'What is the primary purpose of a VPC endpoint?',
      //   options: [...],
      //   explanation: '...',
      // }
    ];
  },
};

module.exports = enrichmentService;