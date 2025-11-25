/**
 * Quiz Validation Schemas
 */

const { z } = require('zod');
const { QUIZ_CATEGORIES, DIFFICULTY_LEVELS } = require('../utils/constants');

const quizCategoryEnum = z.enum(Object.values(QUIZ_CATEGORIES));
const difficultyEnum = z.enum(Object.values(DIFFICULTY_LEVELS));

// Query parameters for listing quizzes
const quizListQuerySchema = z.object({
  category: quizCategoryEnum.optional(),
  difficulty: difficultyEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
  tags: z.string().optional(), // Comma-separated tags
  sortBy: z.enum(['created_at', 'title', 'difficulty']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Create quiz schema (admin)
const createQuizSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  category: quizCategoryEnum,
  difficulty: difficultyEnum,
  timeLimitSeconds: z.number().int().positive().default(1800),
  passingScore: z.number().int().min(0).max(100).default(70),
  isRandomized: z.boolean().default(true),
  maxAttempts: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

// Update quiz schema
const updateQuizSchema = createQuizSchema.partial();

// Quiz option (question) schema
const optionItemSchema = z.object({
  id: z.string().uuid(),
  text: z.string().min(1).max(1000),
  isCorrect: z.boolean(),
});

const createQuizOptionSchema = z.object({
  questionText: z.string().min(10).max(5000),
  questionOrder: z.number().int().min(0).default(0),
  options: z.array(optionItemSchema).min(2).max(10),
  explanation: z.string().min(10).max(5000),
  hint: z.string().max(1000).optional(),
  difficulty: difficultyEnum.optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  timeLimitSeconds: z.number().int().positive().nullable().optional(),
  points: z.number().int().positive().default(1),
});

// Start quiz attempt
const startQuizSchema = z.object({
  quizId: z.string().uuid(),
});

// Submit quiz answers
const submitQuizAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptionIds: z.array(z.string().uuid()).min(1),
      timeSpentSeconds: z.number().int().min(0).optional(),
    })
  ),
});

// ID parameter
const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const quizIdParamSchema = z.object({
  quizId: z.string().uuid(),
});

const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid(),
});

module.exports = {
  quizListQuerySchema,
  createQuizSchema,
  updateQuizSchema,
  createQuizOptionSchema,
  startQuizSchema,
  submitQuizAnswersSchema,
  uuidParamSchema,
  quizIdParamSchema,
  attemptIdParamSchema,
};