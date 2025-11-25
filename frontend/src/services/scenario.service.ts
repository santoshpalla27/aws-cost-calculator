import api from './api';

export const scenarioService = {
  getScenarios: async (filters) => {
    const response = await api.get('/scenarios', { params: filters });
    return response.data;
  },

  getScenario: async (id) => {
    const response = await api.get(`/scenarios/${id}`);
    return response.data.data;
  },

  startScenario: async (scenarioId) => {
    const response = await api.post(`/scenarios/${scenarioId}/start`);
    return response.data.data;
  },

  submitStep: async (evaluationId, stepId) => {
    const response = await api.post(`/scenarios/evaluations/${evaluationId}/step`, { stepId });
    return response.data.data;
  },

  getEvaluationResult: async (evaluationId) => {
    const response = await api.get(`/scenarios/evaluations/${evaluationId}/result`);
    return response.data.data;
  },
};