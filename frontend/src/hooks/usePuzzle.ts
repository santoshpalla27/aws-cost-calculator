import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/services/api';

export const usePuzzles = (filters) => {
  return useQuery({
    queryKey: ['puzzles', filters],
    queryFn: () => api.get('/puzzles', { params: filters }).then(res => res.data),
  });
};

export const usePuzzle = (id) => {
  return useQuery({
    queryKey: ['puzzle', id],
    queryFn: () => api.get(`/puzzles/${id}`).then(res => res.data.data),
    enabled: !!id,
  });
};

export const useStartPuzzle = () => {
  return useMutation({
    mutationFn: (puzzleId: string) => api.post(`/puzzles/${puzzleId}/start`).then(res => res.data.data),
  });
};

export const useSubmitPuzzle = () => {
  return useMutation({
    mutationFn: ({ attemptId, solution }) => api.post(`/puzzles/attempts/${attemptId}/submit`, solution).then(res => res.data.data),
  });
};