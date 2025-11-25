export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  timeLimitSeconds: number;
  passingScore: number;
  isRandomized: boolean;
  maxAttempts: number | null;
  tags: string[];
  version: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: QuizOption[];
  difficulty: string;
  points: number;
  timeLimit?: number;
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizAttempt {
  attemptId: string;
  quiz: {
    id: string;
    title: string;
    timeLimit: number;
    passingScore: number;
  };
  questions: QuizQuestion[];
  startedAt: string;
  isResume: boolean;
}

export interface QuizAnswer {
  questionId: string;
  selectedOptionIds: string[];
  timeSpentSeconds: number;
}

export interface QuizSubmissionResult {
  attemptId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  timeTaken: number;
  passed: boolean;
  passingScore: number;
  details: AnswerDetail[];
}

export interface AnswerDetail {
  questionId: string;
  questionText: string;
  selectedOptionIds: string[];
  correctOptionIds: string[];
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  explanation: string;
  timeSpent: number;
}
