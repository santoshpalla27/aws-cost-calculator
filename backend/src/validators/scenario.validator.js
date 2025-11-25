/**
 * Scenario Validation Schemas
 */

const { z } = require('zod');
const { QUIZ_CATEGORIES, DIFFICULTY_LEVELS } = require('../utils/constants');

const categoryEnum = z.enum(Object.values(QUIZ_CATEGORIES));
const difficultyEnum = z.enum(Object.values(DIFFICULTY_LEVELS));

// Query parameters for listing scenarios
const scenarioListQuerySchema = z.object({
  category: categoryEnum.optional(),
  difficulty: difficultyEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
  tags: z.string().optional(),
});

// Create scenario schema
const createScenarioSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(20).max(5000),
  category: categoryEnum,
  difficulty: difficultyEnum,
  symptoms: z.array(z.string().max(1000)).min(1).max(20),
  logs: z.string().max(50000).optional(),
  context: z.record(z.any()).optional(),
  environment: z.record(z.any()).optional(),
  explanation: z.string().min(50).max(10000),
  learningPoints: z.array(z.string().max(500)).max(10).default([]),
  relatedDocs: z.array(z.string().url()).max(10).default([]),
  timeLimitSeconds: z.number().int().positive().default(900),
  maxAttempts: z.number().int().positive().default(3),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

// Scenario step schema
const createScenarioStepSchema = z.object({
  stepOrder: z.number().int().min(0),
  actionText: z.string().min(5).max(2000),
  actionCommand: z.string().max(1000).optional(),
  isCorrect: z.boolean(),
  feedbackCorrect: z.string().max(2000).optional(),
  feedbackIncorrect: z.string().max(2000).optional(),
  partialCredit: z.number().min(0).max(1).default(0),
  leadsToStepId: z.string().uuid().nullable().optional(),
});

// Submit scenario step
const submitScenarioStepSchema = z.object({
  stepId: z.string().uuid(),
});

// Scenario ID params
const scenarioIdParamSchema = z.object({
  scenarioId: z.string().uuid(),
});

const evaluationIdParamSchema = z.object({
  evaluationId: z.string().uuid(),
});

module.exports = {
  scenarioListQuerySchema,
  createScenarioSchema,
  createScenarioStepSchema,
  submitScenarioStepSchema,
  scenarioIdParamSchema,
  evaluationIdParamSchema,
};