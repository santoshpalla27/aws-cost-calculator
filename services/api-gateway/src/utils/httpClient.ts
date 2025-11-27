import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '../middleware/logger';

export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string, timeout: number = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('HTTP Request', {
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('HTTP Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('HTTP Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('HTTP Response Error', {
          message: error.message,
          status: error.response?.status,
        });
        return Promise.reject(error);
      }
    );
  }

  async get(url: string, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: AxiosRequestConfig): Promise<any> {
    const response = await this.client.delete(url, config);
    return response.data;
  }
}