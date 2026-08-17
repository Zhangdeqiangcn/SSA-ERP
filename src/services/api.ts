import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic CRUD operations
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>): Promise<T> =>
    apiClient.get(url, { params }).then((res) => res.data),

  post: <T>(url: string, data?: unknown): Promise<T> =>
    apiClient.post(url, data).then((res) => res.data),

  put: <T>(url: string, data?: unknown): Promise<T> =>
    apiClient.put(url, data).then((res) => res.data),

  patch: <T>(url: string, data?: unknown): Promise<T> =>
    apiClient.patch(url, data).then((res) => res.data),

  delete: <T>(url: string): Promise<T> =>
    apiClient.delete(url).then((res) => res.data),
};

export default api;
