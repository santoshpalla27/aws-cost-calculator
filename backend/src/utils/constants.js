/**
 * Application Constants
 */

module.exports = {
  // User roles
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
  },

  // Quiz categories
  QUIZ_CATEGORIES: {
    AWS: 'aws',
    DEVOPS: 'devops',
    TERRAFORM: 'terraform',
    KUBERNETES: 'kubernetes',
    DOCKER: 'docker',
    CICD: 'cicd',
    NETWORKING: 'networking',
  },

  // Difficulty levels
  DIFFICULTY_LEVELS: {
    L1: 'L1', // Basic
    L2: 'L2', // Intermediate
    L3: 'L3', // Advanced
  },

  // Puzzle types
  PUZZLE_TYPES: {
    THREE_TIER: 'three_tier',
    SERVERLESS: 'serverless',
    MICROSERVICES: 'microservices',
    DATA_PIPELINE: 'data_pipeline',
    HYBRID_CLOUD: 'hybrid_cloud',
  },

  // Attempt statuses
  ATTEMPT_STATUS: {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    ABANDONED: 'abandoned',
  },

  // Leaderboard periods
  LEADERBOARD_PERIODS: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    ALL_TIME: 'all_time',
  },

  // Audit actions
  AUDIT_ACTIONS: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    LOGOUT: 'logout',
    PASSWORD_RESET: 'password_reset',
  },

  // Default values
  DEFAULTS: {
    QUIZ_TIME_LIMIT: 1800, // 30 minutes
    SCENARIO_TIME_LIMIT: 900, // 15 minutes
    PUZZLE_TIME_LIMIT: 1200, // 20 minutes
    PASSING_SCORE: 70,
    PAGE_LIMIT: 20,
    MAX_PAGE_LIMIT: 100,
  },

  // Cache keys
  CACHE_KEYS: {
    LEADERBOARD: 'leaderboard',
    QUIZ_LIST: 'quiz_list',
    USER_STATS: 'user_stats',
  },

  // Cache TTL (in seconds)
  CACHE_TTL: {
    LEADERBOARD: 300, // 5 minutes
    QUIZ_LIST: 600, // 10 minutes
    USER_STATS: 120, // 2 minutes
  },
};