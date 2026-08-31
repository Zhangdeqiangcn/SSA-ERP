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
  /** 切换当前登录用户的角色（演示/多身份场景：不改账号，仅切换 role 与显示名） */
  switchRole: (role: UserRole, name?: string) => void;
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

      switchRole: (role, name) => {
        const { currentUser, token } = get();
        if (!currentUser) return;
        const updated: User = { ...currentUser, role, name: name || currentUser.name };
        set({ currentUser: updated });
        if (token) applySession(token, updated);
      },
    }),
    {
      name: 'auth-storage', // 登录态保留在本地，保证刷新后免登录
    }
  )
);

// ── DEV 自动登录演示用户 ────────────────────────────────────────
// 背景：E2E 套件（v34–v65、flow）写于登录守卫之前，按「未登录纯前端模式」直达业务页。
// 但 Header 等布局组件依赖 currentUser，否则渲染崩溃整页白屏。
// 解决：vite dev 下若 persist 未恢复出用户 *且* localStorage 也完全没有过会话
//（fresh load 或被 localStorage.clear()）—— 自动注入演示管理员，不调 /api、不 reload。
// 已有会话（含已登出）则不动，避免「登出立刻自动登回」。
// 生产构建（import.meta.env.DEV=false）不受影响。
if (import.meta.env.DEV) {
  const hadSession = !!localStorage.getItem('auth-storage');
  if (!useAuthStore.getState().currentUser && !hadSession) {
    useAuthStore.setState({
      currentUser: {
        id: 'dev-admin',
        name: '演示管理员',
        role: 'admin' as UserRole,
        department: 'DEV',
        username: 'dev-admin',
        org_id: 'dev',
      },
      isAuthenticated: true,
      token: 'dev-token',
    });
  }
}
