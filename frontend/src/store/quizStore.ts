import { create } from 'zustand';

interface QuizState {
  currentAttemptId: string | null;
  answers: Map<string, string[]>;
  setAttemptId: (id: string) => void;
  setAnswer: (questionId: string, answer: string[]) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  currentAttemptId: null,
  answers: new Map(),
  setAttemptId: (id) => set({ currentAttemptId: id }),
  setAnswer: (questionId, answer) =>
    set((state) => ({
      answers: new Map(state.answers).set(questionId, answer),
    })),
  reset: () => set({ currentAttemptId: null, answers: new Map() }),
}));