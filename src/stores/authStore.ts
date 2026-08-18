import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole, ROLE_PERMISSIONS } from '@/types/settings';
import { setSyncToken } from './persistStorage';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
  username?: string;
  org_id?: string;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (p: {
    username: string;
    password: string;
    name: string;
    companyCode: string;
    orgName?: string;
    role?: UserRole;
    department?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

async function postJSON(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, data };
}

// 登录/注册成功后：写入会话、本地兜底 token，并重载页面让所有 store 从云端按组织拉取同一份数据
function applySession(token: string, user: User) {
  setSyncToken(token);
  // 触发整页重载，使各 store 的 persist 以 backendStorage 从服务端重新水合
  window.location.reload();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      token: null,

      login: async (username, password) => {
        const { ok, status, data } = await postJSON('/api/auth/login', { username, password });
        if (!ok) {
          return { ok: false, error: data?.error || (status === 401 ? '用户名或密码错误' : '登录失败') };
        }
        set({ currentUser: data.user, isAuthenticated: true, token: data.token });
        applySession(data.token, data.user);
        return { ok: true };
      },

      register: async (p) => {
        const { ok, status, data } = await postJSON('/api/auth/register', p);
        if (!ok) {
          return { ok: false, error: data?.error || (status === 409 ? '用户名已被占用' : '注册失败') };
        }
        set({ currentUser: data.user, isAuthenticated: true, token: data.token });
        applySession(data.token, data.user);
        return { ok: true };
      },

      logout: () => {
        const token = get().token;
        if (token) {
          fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
        setSyncToken(null);
        set({ currentUser: null, isAuthenticated: false, token: null });
        window.location.reload();
      },

      hasPermission: (permission: string) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        const userPermissions = ROLE_PERMISSIONS[currentUser.role] || [];
        return userPermissions.includes('*') || userPermissions.includes(permission);
      },
    }),
    {
      name: 'auth-storage', // 登录态保留在本地，保证刷新后免登录
    }
  )
);
