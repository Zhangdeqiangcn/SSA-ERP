import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_USERS, type SystemUser } from './userStore';

/**
 * C7 服务端化雏形 · 会话 store（多用户）
 * ------------------------------------------------------------
 * 目标：把「当前登录人」从散落各页的硬编码收敛为唯一会话来源，
 * 为后续真实服务端（登录态 / token / 多租户）留出替换点。
 *
 * 现阶段仍走 localStorage（key = ssa-erp-session），
 * 用户主数据复用 userStore 的 DEFAULT_USERS，避免两套人员数据打架。
 */

export interface SessionInfo {
  userId: string;
  userName: string;
  role: string;
  department: string;
  /** 会话建立时间（ISO） */
  loginAt: string;
  /** 会话标识，切换用户即刷新 */
  token: string;
}

const makeToken = () => `tk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const buildSession = (u: SystemUser): SessionInfo => ({
  userId: u.id,
  userName: u.name,
  role: u.role,
  department: u.department,
  loginAt: new Date().toISOString(),
  token: makeToken(),
});

const DEFAULT_SESSION: SessionInfo = buildSession(DEFAULT_USERS[0]);

interface SessionState {
  current: SessionInfo;
  /** 历史会话（最近 20 条），便于审计溯源 */
  history: SessionInfo[];
  /** 切换当前用户（按 userStore 的用户 id） */
  switchUser: (userId: string) => SessionInfo | null;
  /** 主动登出并回到默认管理员 */
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      current: DEFAULT_SESSION,
      history: [],
      switchUser: (userId) => {
        const user = DEFAULT_USERS.find((u) => u.id === userId);
        if (!user) return null;
        const next = buildSession(user);
        const prev = get().current;
        set((state) => ({
          current: next,
          history: [prev, ...state.history].slice(0, 20),
        }));
        return next;
      },
      resetSession: () => set({ current: buildSession(DEFAULT_USERS[0]), history: [] }),
    }),
    { name: 'ssa-erp-session', version: 1 }
  )
);

/** 非 React 环境（store / service 内部）取当前操作人 */
export const currentUser = (): SessionInfo => useSessionStore.getState().current;
