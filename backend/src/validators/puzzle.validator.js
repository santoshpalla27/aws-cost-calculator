/**
 * Puzzle Validation Schemas
 */

const { z } = require('zod');
const { PUZZLE_TYPES, DIFFICULTY_LEVELS } = require('../utils/constants');

const puzzleTypeEnum = z.enum(Object.values(PUZZLE_TYPES));
const difficultyEnum = z.enum(Object.values(DIFFICULTY_LEVELS));

// Query parameters for listing puzzles
const puzzleListQuerySchema = z.object({
  type: puzzleTypeEnum.optional(),
  difficulty: difficultyEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(100).optional(),
  tags: z.string().optional(),
});

// Position schema
const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  zone: z.string().optional(),
  layer: z.string().optional(),
});

// Connection schema
const connectionSchema = z.object({
  targetItemId: z.string().uuid(),
  connectionType: z.string().max(50),
});

// Create puzzle schema
const createPuzzleSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().min(20).max(5000),
  puzzleType: puzzleTypeEnum,
  difficulty: difficultyEnum,
  targetArchitecture: z.record(z.any()),
  requirements: z.array(z.string().max(500)).min(1).max(20),
  hints: z.array(z.string().max(500)).max(10).default([]),
  timeLimitSeconds: z.number().int().positive().default(1200),
  maxAttempts: z.number().int().positive().default(5),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

// Puzzle item schema
const createPuzzleItemSchema = z.object({
  componentType: z.string().min(1).max(100),
  componentName: z.string().max(255).optional(),
  expectedPosition: positionSchema,
  expectedConnections: z.array(connectionSchema).default([]),
  properties: z.record(z.any()).default({}),
  isRequired: z.boolean().default(true),
  isProvided: z.boolean().default(false),
  iconUrl: z.string().url().optional(),
});

// Submit puzzle solution
const submitPuzzleSolutionSchema = z.object({
  components: z.array(
    z.object({
      itemId: z.string().uuid(),
      position: positionSchema,
    })
  ),
  connections: z.array(
    z.object({
      fromItemId: z.string().uuid(),
      toItemId: z.string().uuid(),
      connectionType: z.string().max(50),
    })
  ),
});

// Puzzle ID params
const puzzleIdParamSchema = z.object({
  puzzleId: z.string().uuid(),
});

const puzzleAttemptIdParamSchema = z.object({
  attemptId: z.string().uuid(),
});

module.exports = {
  puzzleListQuerySchema,
  createPuzzleSchema,
  createPuzzleItemSchema,
  submitPuzzleSolutionSchema,
  puzzleIdParamSchema,
  puzzleAttemptIdParamSchema,
};