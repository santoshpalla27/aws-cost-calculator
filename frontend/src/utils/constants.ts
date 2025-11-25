export const QUIZ_CATEGORIES = {
  AWS: 'aws',
  DEVOPS: 'devops',
  TERRAFORM: 'terraform',
  KUBERNETES: 'kubernetes',
  DOCKER: 'docker',
  CICD: 'cicd',
  NETWORKING: 'networking',
} as const;

export const DIFFICULTY_LEVELS = {
  L1: 'L1', // Basic
  L2: 'L2', // Intermediate
  L3: 'L3', // Advanced
} as const;

export const PUZZLE_TYPES = {
  THREE_TIER: 'three_tier',
  SERVERLESS: 'serverless',
  MICROSERVICES: 'microservices',
  DATA_PIPELINE: 'data_pipeline',
  HYBRID_CLOUD: 'hybrid_cloud',
} as const;
