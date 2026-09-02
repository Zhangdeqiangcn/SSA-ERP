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
// 注意：登录态 token 由 authStore.applySession → persistStorage.setSyncToken 写入
// localStorage['ssa-erp-auth-token']（见 persistStorage.ts）。旧代码误读 'token'（该 key 从未被写入），
// 导致所有经 api 的已迁域(materials/customers/vendors) 与 W0 S&OP 在生产环境请求不带 Bearer，
// 后端 getUserFromRequest 一律 401、D1 收不到写。此处优先读 ssa-erp-auth-token，
// 保留 'token' 作为防御性 fallback（以防将来确有写入点）。
const AUTH_TOKEN_KEY = 'ssa-erp-auth-token';
function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem('token');
  } catch {
    return null;
  }
}
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAuthToken();
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
      // 清除所有已知 token key，避免 stale token 导致反复 401
      try {
        localStorage.removeItem('ssa-erp-auth-token');
        localStorage.removeItem('token');
      } catch {
        /* ignore */
      }
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
