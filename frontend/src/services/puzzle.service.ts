import api from './api';

export const puzzleService = {
  getPuzzles: async (filters) => {
    const response = await api.get('/puzzles', { params: filters });
    return response.data;
  },

  getPuzzle: async (id) => {
    const response = await api.get(`/puzzles/${id}`);
    return response.data.data;
  },

  startPuzzle: async (puzzleId) => {
    const response = await api.post(`/puzzles/${puzzleId}/start`);
    return response.data.data;
  },

  submitPuzzle: async (attemptId, submission) => {
    const response = await api.post(`/puzzles/attempts/${attemptId}/submit`, submission);
    return response.data.data;
  },

  getPuzzleResult: async (attemptId) => {
    const response = await api.get(`/puzzles/attempts/${attemptId}/result`);
    return response.data.data;
  },
};