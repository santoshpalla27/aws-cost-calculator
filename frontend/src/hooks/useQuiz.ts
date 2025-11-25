import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/services/api';

export const useQuizzes = (filters) => {
  return useQuery({
    queryKey: ['quizzes', filters],
    queryFn: () => api.get('/quizzes', { params: filters }).then(res => res.data),
  });
};

export const useQuiz = (id) => {
  return useQuery({
    queryKey: ['quiz', id],
    queryFn: () => api.get(`/quizzes/${id}`).then(res => res.data.data),
    enabled: !!id,
  });
};

export const useStartQuiz = () => {
  return useMutation({
    mutationFn: (quizId: string) => api.post(`/quizzes/${quizId}/start`).then(res => res.data.data),
  });
};

export const useSubmitQuiz = () => {
  return useMutation({
    mutationFn: ({ attemptId, answers }) => api.post(`/quizzes/attempts/${attemptId}/submit`, { answers }).then(res => res.data.data),
  });
};