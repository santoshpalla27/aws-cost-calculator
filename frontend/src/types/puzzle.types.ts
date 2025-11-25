export interface Puzzle {
  id: string;
  title: string;
  description: string;
  puzzleType: string;
  difficulty: string;
  targetArchitecture: Record<string, any>;
  requirements: string[];
  hints: string[];
  timeLimitSeconds: number;
  maxAttempts: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  components: PuzzleItem[];
}

export interface PuzzleItem {
  id: string;
  puzzleId: string;
  componentType: string;
  componentName?: string;
  expectedPosition: { x: number; y: number; zone?: string; layer?: string };
  expectedConnections: { targetItemId: string; connectionType: string }[];
  properties: Record<string, any>;
  isRequired: boolean;
  isProvided: boolean;
  iconUrl?: string;
}

export interface PuzzleAttempt {
  attemptId: string;
  puzzle: {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    hints: string[];
    timeLimit: number;
  };
  availableComponents: AvailableComponent[];
  startedAt: string;
}

export interface AvailableComponent {
  type: string;
  name: string;
  category: string;
  icon: string;
}

export interface SubmittedComponent {
  itemId: string;
  position: { x: number; y: number; zone?: string };
}

export interface SubmittedConnection {
  fromItemId: string;
  toItemId: string;
  connectionType: string;
}

export interface PuzzleSubmission {
  components: SubmittedComponent[];
  connections: SubmittedConnection[];
}

export interface PuzzleEvaluationResult {
  score: number;
  maxScore: number;
  percentage: number;
  componentScore: number;
  connectionScore: number;
  correctComponents: any[];
  missingComponents: string[];
  extraComponents: any[];
  correctConnections: any[];
  missingConnections: any[];
  incorrectConnections: any[];
  feedback: {
    overall: string;
    components: string[];
    connections: string[];
    suggestions: string[];
  };
  requirementsMet: {
    allMet: boolean;
    details: { requirement: string; met: boolean }[];
  };
}
