import { create } from 'zustand';

interface PlacedComponent {
  id: string;
  componentId: string;
  position: { x: number; y: number };
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

interface PuzzleState {
  currentAttemptId: string | null;
  placedComponents: PlacedComponent[];
  connections: Connection[];
  setAttemptId: (id: string) => void;
  placeComponent: (component: PlacedComponent) => void;
  removeComponent: (id: string) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (id: string) => void;
  reset: () => void;
}

export const usePuzzleStore = create<PuzzleState>((set) => ({
  currentAttemptId: null,
  placedComponents: [],
  connections: [],
  setAttemptId: (id) => set({ currentAttemptId: id }),
  placeComponent: (component) =>
    set((state) => ({
      placedComponents: [...state.placedComponents, component],
    })),
  removeComponent: (id) =>
    set((state) => ({
      placedComponents: state.placedComponents.filter((c) => c.id !== id),
    })),
  addConnection: (connection) =>
    set((state) => ({
      connections: [...state.connections, connection],
    })),
  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    })),
  reset: () => set({ currentAttemptId: null, placedComponents: [], connections: [] }),
}));