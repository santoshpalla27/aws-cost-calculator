import api from './api';

export const quizService = {
  getQuizzes: async (filters) => {
    const response = await api.get('/quizzes', { params: filters });
    return response.data;
  },

  getQuiz: async (id) => {
    const response = await api.get(`/quizzes/${id}`);
    return response.data.data;
  },

  startQuiz: async (quizId) => {
    const response = await api.post(`/quizzes/${quizId}/start`);
    return response.data.data;
  },

  submitQuiz: async (attemptId, answers) => {
    const response = await api.post(`/quizzes/attempts/${attemptId}/submit`, { answers });
    return response.data.data;
  },

  getQuizResult: async (attemptId) => {
    const response = await api.get(`/quizzes/attempts/${attemptId}/result`);
    return response.data.data;
  },
};