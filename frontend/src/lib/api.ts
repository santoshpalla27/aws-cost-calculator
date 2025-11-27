import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    // Get token from wherever you store it (e.g., localStorage, cookie)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      console.error('Unauthorized access - please log in');
    }
    
    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const terraformAPI = {
  estimate: (data: any) => api.post('/terraform/estimate', data),
  diff: (data: any) => api.post('/terraform/diff', data),
};

export const awsAPI = {
  calculateEC2: (data: any) => api.post('/aws/ec2', data),
  calculateRDS: (data: any) => api.post('/aws/rds', data),
  calculateS3: (data: any) => api.post('/aws/s3', data),
  calculateEKS: (data: any) => api.post('/aws/eks', data),
};

export const reportsAPI = {
  getReports: (params?: any) => api.get('/reports', { params }),
  getReport: (id: string) => api.get(`/reports/${id}`),
  exportReport: (id: string, format: 'pdf' | 'csv') => 
    api.get(`/reports/export/${id}?format=${format}`, { 
      responseType: 'blob' 
    }),
};