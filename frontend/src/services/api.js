import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

export const estimateCost = async (files, credentials) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  formData.append('aws_access_key_id', credentials.aws_access_key_id);
  formData.append('aws_secret_access_key', credentials.aws_secret_access_key);
  if (credentials.aws_session_token) {
    formData.append('aws_session_token', credentials.aws_session_token);
  }
  formData.append('region', credentials.region);

  try {
    const response = await api.post('/estimate', formData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 
      error.message || 
      'Failed to estimate costs'
    );
  }
};

export const validateTerraform = async (files) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });

  try {
    const response = await api.post('/validate', formData);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.error || 
      error.message || 
      'Failed to validate Terraform files'
    );
  }
};

export default api;