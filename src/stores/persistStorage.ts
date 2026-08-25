// 共享存储适配器：登录态建立后，把各 store 的持久化数据代理到后端（按组织共享）
// 未登录 / 后端不可达时，自动回退到浏览器 localStorage（保证离线可用、本地不丢）
import { createJSONStorage, type StateStorage, type PersistStorage } from 'zustand/middleware';

const TOKEN_KEY = 'ssa-erp-auth-token';
const LS = typeof window !== 'undefined' ? window.localStorage : (undefined as any);

// 由 authStore 在登录/登出时调用，写入/清除本地 token 副本
export function setSyncToken(token: string | null) {
  try {
    if (token) LS.setItem(TOKEN_KEY, token);
    else LS.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function getToken(): string | null {
  try {
    return LS.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function apiUrl(key: string) {
  return `/api/state/${encodeURIComponent(key)}`;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

const rawStateStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    const token = getToken();
    if (!token) return LS.getItem(name);
    try {
      const res = await fetch(apiUrl(name), { headers: authHeaders(token), cache: 'no-store' });
      if (res.status === 404) {
        // 云端尚无此数据：用本地值兜底，并异步把本地数据首次上云（旧数据平滑迁移）
        const local = LS.getItem(name);
        if (local) {
          fetch(apiUrl(name), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
            body: JSON.stringify({ value: local }),
          }).catch(() => {});
        }
        return local;
      }
      if (!res.ok) return LS.getItem(name);
      const data = await res.json();
      return data && data.value != null ? String(data.value) : LS.getItem(name);
    } catch {
      return LS.getItem(name); // 网络异常 → 本地兜底
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    const token = getToken();
    if (!token) {
      LS.setItem(name, value);
      return;
    }
    try {
      await fetch(apiUrl(name), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ value }),
      });
    } catch {
      /* 云端写入失败不阻塞，本地仍保留 */
    }
    // 本地始终保留一份（离线兜底 / 未登录时直接使用）
    try {
      LS.setItem(name, value);
    } catch {
      /* ignore */
    }
  },

  async removeItem(name: string): Promise<void> {
    const token = getToken();
    if (!token) {
      LS.removeItem(name);
      return;
    }
    try {
      await fetch(apiUrl(name), { method: 'DELETE', headers: authHeaders(token) });
    } catch {
      /* ignore */
    }
    try {
      LS.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

// 用 createJSONStorage 把底层 string 型 StateStorage 包装成 zustand v4 要求的 PersistStorage<S>，
// 这样所有 store 的 `storage: backendStorage` 既通过类型检查，又在运行期正确做 JSON 序列化往返
// （之前直接传 StateStorage，v4 读取 .state 拿不到值，持久化实际失效）。
export const backendStorage: PersistStorage<any> = createJSONStorage(
  () => rawStateStorage
) as PersistStorage<any>;
