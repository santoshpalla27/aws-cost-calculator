import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/services/api';

export const useScenarios = (filters) => {
  return useQuery({
    queryKey: ['scenarios', filters],
    queryFn: () => api.get('/scenarios', { params: filters }).then(res => res.data),
  });
};

export const useScenario = (id) => {
  return useQuery({
    queryKey: ['scenario', id],
    queryFn: () => api.get(`/scenarios/${id}`).then(res => res.data.data),
    enabled: !!id,
  });
};

export const useStartScenario = () => {
  return useMutation({
    mutationFn: (scenarioId: string) => api.post(`/scenarios/${scenarioId}/start`).then(res => res.data.data),
  });
};

export const useSubmitScenarioStep = () => {
  return useMutation({
    mutationFn: ({ evaluationId, stepId }) => api.post(`/scenarios/evaluations/${evaluationId}/step`, { stepId }).then(res => res.data.data),
  });
};