import axios, { AxiosInstance, AxiosError } from 'axios';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 300000, // 5 minutes for Terraform operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      
      switch (status) {
        case 400:
          throw new Error(data.detail || 'Bad request');
        case 404:
          throw new Error(data.detail || 'Resource not found');
        case 500:
          throw new Error(data.detail || 'Internal server error');
        default:
          throw new Error(data.detail || 'An error occurred');
      }
    } else if (error.request) {
      throw new Error('Network error - please check your connection');
    }
    throw error;
  }
);

// API functions
export const terraformApi = {
  scan: async (file: File, skipInit = false, targetRegion?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const params = new URLSearchParams();
    if (skipInit) params.append('skip_init', 'true');
    if (targetRegion) params.append('target_region', targetRegion);
    
    const response = await api.post(
      `/api/terraform/scan?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
  
  validate: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/terraform/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const pricingApi = {
  getRegions: async () => {
    const response = await api.get('/api/pricing/regions');
    return response.data;
  },
  
  getInstanceTypes: async (region: string = 'us-east-1') => {
    const response = await api.get(`/api/pricing/ec2/types?region=${region}`);
    return response.data;
  },
  
  getEC2Price: async (
    instanceType: string,
    region: string,
    operatingSystem: string = 'Linux',
    tenancy: string = 'Shared'
  ) => {
    const params = new URLSearchParams({
      instance_type: instanceType,
      region,
      operating_system: operatingSystem,
      tenancy,
    });
    const response = await api.get(`/api/pricing/ec2/price?${params.toString()}`);
    return response.data;
  },
  
  estimate: async (service: string, region: string, parameters: Record<string, any>) => {
    const response = await api.post('/api/pricing/estimate', {
      service,
      region,
      parameters,
    });
    return response.data;
  },
};

export const healthApi = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
  
  detailed: async () => {
    const response = await api.get('/health/detailed');
    return response.data;
  },
};

export default api;