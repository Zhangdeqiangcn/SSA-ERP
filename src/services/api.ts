import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse, isCancel } from 'axios';
import { useGlobalToastStore } from '@/stores/globalToastStore';
import { getSyncToken, clearSession, SESSION_EXPIRED_EVENT } from '@/stores/persistStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
// 注意：V3.91.0 起令牌不再落地明文 localStorage（防 XSS 窃取），改由 persistStorage 以
// 「内存态 + 生产 HttpOnly Cookie」持有。getSyncToken() 返回内存/ dev sessionStorage 中的令牌；
// 生产刷新后返回 null，此时浏览器自动携带 HttpOnly Cookie，后端 getUserFromRequest 仍鉴权成功，
// 故此处「拿不到令牌就不加 Authorization 头」是安全的（不会误 401）。
function getAuthToken(): string | null {
  return getSyncToken();
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
    // 取消的请求（组件卸载 / 主动 cancel）不提示，避免误报
    if (isCancel(error)) return Promise.reject(error);

    const status = error.response?.status;
    if (status === 401) {
      // ★ V3.93.1 修复「/ 与 /login 之间反复跳闪」：
      // 此前进法 = clearSession() 后直接 `window.location.href = '/login'`（裸跳整页），
      // 但它**没有清 localStorage 里的 auth-storage（isAuthenticated）**。
      // 一旦本地残留 isAuthenticated=true（登录态持久化在 localStorage，刷新后恢复），
      // 落到 /login 时 Login.tsx 的 `if (isAuthenticated) return <Navigate to="/" />`
      // 会立刻又跳回 /，回到 / 再次 401、再次裸跳 /login → 双向无限弹跳。
      //
      // 现收敛到与 persistStorage 完全一致的防循环路径：
      // ① clearSession() 清内存令牌 + 会话标记；
      // ② 派发 SESSION_EXPIRED_EVENT，由 authStore 监听器统一做
      //    「清 auth-storage 登录态 + 一次性闸门 + 已在 /login 则不跳」。
      // 这样 401 后 isAuthenticated 被彻底清成 false，登录页不再跳回 /，循环即断。
      try {
        clearSession();
      } catch {
        /* ignore */
      }
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        }
      } catch {
        /* ignore */
      }
      return Promise.reject(error);
    }

    // V3.23.0 · #5 消除静默失败：服务端 5xx 与网络失败是「用户无能为力、但操作确未成功」
    // 的最危险一类，此前被各 store 的 .catch 静默吞掉 → 本地状态与数据库真值永久分歧且零感知。
    // 仅在这两个类别上弹全局提示；4xx（多为校验/业务拒绝）仍交由各 store 内联处理，不重复提示。
    if (!status || status >= 500) {
      const message = status
        ? `服务异常（${status}），操作可能未成功，请稍后重试`
        : '网络异常，请检查网络连接后重试';
      useGlobalToastStore.getState().showError(message);
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
