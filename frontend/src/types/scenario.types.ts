export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  symptoms: string[];
  logs?: string;
  context?: Record<string, any>;
  explanation: string;
  learningPoints: string[];
  relatedDocs: string[];
  timeLimitSeconds: number;
  maxAttempts: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioStep {
  id: string;
  stepOrder: number;
  actionText: string;
  actionCommand?: string;
  isCorrect: boolean;
  feedbackCorrect?: string;
  feedbackIncorrect?: string;
  partialCredit?: number;
  leadsToStepId?: string;
}

export interface ScenarioAttempt {
  evaluationId: string;
  scenario: {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    symptoms: string[];
    logs?: string;
    context?: Record<string, any>;
    timeLimit: number;
  };
  steps: Pick<ScenarioStep, 'id' | 'actionText' | 'actionCommand'>[];
  startedAt: string;
}

export interface StepEvaluationResult {
  valid: boolean;
  isCorrect: boolean;
  isCorrectOrder: boolean;
  score: number;
  feedback: string;
  isComplete: boolean;
  nextHint?: string;
  leadsTo?: string;
}

export interface ScenarioEvaluationResult {
  score: number;
  maxScore: number;
  percentage: number;
  correctSteps: number;
  totalSteps: number;
  requiredSteps: number;
  details: ScenarioAnswerDetail[];
  feedback: {
    level: string;
    message: string;
    recommendation: string;
  };
  explanation: string;
  learningPoints: string[];
  relatedDocs: string[];
}

export interface ScenarioAnswerDetail {
  stepOrder: number;
  stepId: string;
  actionText: string;
  isCorrect: boolean;
  isCorrectOrder: boolean;
  expectedStepId?: string;
  feedback?: string;
  selectedAt: string;
}
