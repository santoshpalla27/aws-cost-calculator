import { create } from 'zustand';

interface Step {
  stepId: string;
  selectedAt: Date;
  isCorrect: boolean;
}

interface ScenarioState {
  currentEvaluationId: string | null;
  stepsTaken: Step[];
  setEvaluationId: (id: string) => void;
  addStep: (step: Step) => void;
  reset: () => void;
}

export const useScenarioStore = create<ScenarioState>((set) => ({
  currentEvaluationId: null,
  stepsTaken: [],
  setEvaluationId: (id) => set({ currentEvaluationId: id }),
  addStep: (step) =>
    set((state) => ({
      stepsTaken: [...state.stepsTaken, step],
    })),
  reset: () => set({ currentEvaluationId: null, stepsTaken: [] }),
}));