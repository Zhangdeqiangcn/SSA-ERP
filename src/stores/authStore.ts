import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole, ROLE_PERMISSIONS } from '@/types/settings';
import { SESSION_EXPIRED_EVENT, setSyncToken } from './persistStorage';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
  username?: string;
  org_id?: string;
  /** 绑定的主邮箱（超级管理员用它接收安全验证码） */
  email?: string;
  /** 绑定的备用（抄送）邮箱，与主邮箱共同构成双邮箱验证通道 */
  altEmail?: string;
  /** 手机号（V3.15.0 新增，个人中心可自助修改） */
  phone?: string;
}

/** 超级管理员首次激活所需的展示信息（邮箱由后端脱敏后返回） */
export interface ActivationInfo {
  username: string;
  name?: string;
  emails: Array<{ email: string; label: string }>;
}

/** 双邮箱验证码的两种使用场景 */
export type CodePurpose = 'activate' | 'change_password';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<{
    ok: boolean;
    error?: string;
    /** 后端返回 needActivation 时为 true：超管尚未完成安全初始化，需先走双邮箱验证 */
    needActivation?: boolean;
    activation?: ActivationInfo;
  }>;
  register: (p: {
    username: string;
    password: string;
    name: string;
    companyCode: string;
    orgName?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    department?: string;
  }) => Promise<{ ok: boolean; pending?: boolean; error?: string; message?: string; orgName?: string }>;
  logout: () => void;
  /**
   * 下线全部设备（V2.98.0 · 评测 M-09）
   * 不传 userId → 清空本人全部会话；传 userId → 管理员把指定账号踢下线。
   * 成功返回被作废的会话条数；调用方需自行处理「当前设备也被踢」后的跳转。
   */
  logoutAll: (userId?: string) => Promise<{ ok: boolean; revoked?: number; error?: string }>;
  hasPermission: (permission: string) => boolean;
  /** 双邮箱验证第 1 步：向账号绑定的每个邮箱分别发送验证码 */
  sendCode: (p: { username: string; password: string; purpose: CodePurpose }) =>
    Promise<{ ok: boolean; error?: string; data?: any }>;
  /** 双邮箱验证第 2 步：校验全部验证码（每枚都要正确），返回一次性凭证 */
  verifyCode: (p: { username: string; password: string; purpose: CodePurpose; codes: string[] }) =>
    Promise<{ ok: boolean; error?: string; ticket?: string }>;
  /** 首次激活第 3 步：凭凭证设置密码并直接登录 */
  activate: (p: { username: string; ticket: string; newPassword: string }) =>
    Promise<{ ok: boolean; error?: string }>;
  /** 修改密码（需登录态 + 双邮箱验证凭证，超级管理员「安全中心」专用） */
  changePassword: (p: { ticket: string; newPassword: string }) =>
    Promise<{ ok: boolean; error?: string }>;
  /** 修改密码（登录态，凭当前密码 + 新密码，全角色可用，对应个人中心「修改密码」） */
  changePasswordSelf: (p: { currentPassword: string; newPassword: string }) =>
    Promise<{ ok: boolean; error?: string }>;
  /** 找回密码：发送重置验证码到注册邮箱（登录页可用，不需登录态） */
  resetPasswordRequest: (p: { username: string }) =>
    Promise<{ ok: boolean; error?: string; sent?: boolean; email?: string; expiresInSeconds?: number; message?: string }>;
  /** 找回密码：校验验证码并重置密码（登录页可用，不需登录态） */
  resetPasswordConfirm: (p: { username: string; code: string; newPassword: string }) =>
    Promise<{ ok: boolean; error?: string }>;
  /** 自助更新个人资料（白名单：name/phone/email/altEmail；部门/角色等管理员字段只读） */
  updateProfile: (p: { name?: string; phone?: string; email?: string; altEmail?: string }) =>
    Promise<{ ok: boolean; error?: string; user?: User }>;
  /** 应用启动时从 /api/auth/me 刷新当前用户资料（V3.15.0：补齐登录态未返回的新字段） */
  refreshUser: () => Promise<{ ok: boolean; error?: string }>;
  /**
   * 安全邮箱备用通道：申请「延时投递」或查询投递状态。
   * 不依赖登录态（登录页也可调用），因此它是「进不去系统时」的取码后路。
   * 接口从不回传验证码本身，只回传脱敏邮箱与投递时间。
   */
  securityMailbox: (p: {
    username: string;
    password: string;
    purpose: CodePurpose;
    action: 'enqueue' | 'status';
  }) => Promise<{ ok: boolean; error?: string; data?: any }>;
  // ── 后台任务调度（V3.1.0 · 评测 H-04 整改）────────────────────
  /** 查看任务队列概览与执行留痕（管理员） */
  jobsOverview: () => Promise<{ ok: boolean; error?: string; data?: any }>;
  /** 立即推进一次后台任务 */
  jobsRun: () => Promise<{ ok: boolean; error?: string; data?: any }>;
  /** 把投递失败的任务重新排队 */
  jobsReplay: () => Promise<{ ok: boolean; error?: string; data?: any }>;
  /** 重新生成外部调度令牌 */
  jobsRotateToken: () => Promise<{ ok: boolean; error?: string; data?: any }>;
  // ── 审计与行级策略健康度（V3.3.0 · 评测 L-04 / L-05 整改）──────
  /** 读取审计写入降级情况与行级策略登记情况（管理员） */
  auditHealth: () => Promise<{ ok: boolean; error?: string; data?: any }>;
  /** 切换当前登录用户的角色（演示/多身份场景：不改账号，仅切换 role 与显示名） */
  switchRole: (role: UserRole, name?: string) => void;
}

/** 携带当前会话令牌的 GET（后台任务等管理员接口用） */
async function authGet(url: string, token: string | null) {
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, data };
}

/** 携带当前会话令牌的 POST */
async function authPost(url: string, body: any, token: string | null) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
        // V3.14.1：super_admin 未设置密码时，后端返回 needActivation，需先走激活流程
        if (data?.needActivation) {
          return { ok: true, needActivation: true, activation: {
            username: data.username,
            name: data.name,
            emails: data.emails || [],
          }};
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
        // 202：加入已有组织，等待管理员审批。此时后端不返回 token，
        // 不能建立会话（否则各 store 会以空 token 去拉云端数据）；直接返回 pending 交给 UI 提示。
        // 注意 202 的 res.ok 仍为 true，必须靠 status / data.pending 识别。
        if (status === 202 || data?.pending) {
          return { ok: true, pending: true, message: data?.message, orgName: data?.orgName };
        }
        // 200：首次注册，已自动成为该组织管理员并直接登录
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

      logoutAll: async (userId?: string) => {
        const token = get().token;
        if (!token) return { ok: false, error: '未登录' };
        try {
          const res = await fetch('/api/auth/logout-all', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(userId ? { userId } : {}),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return { ok: false, error: data?.error || `操作失败（HTTP ${res.status}）` };
          return { ok: true, revoked: typeof data?.revoked === 'number' ? data.revoked : 0 };
        } catch {
          return { ok: false, error: '操作失败，请检查网络后重试' };
        }
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

      // ── 双邮箱安全验证（超级管理员专用）──────────────────────────

      /** 第 1 步：向账号绑定的每个邮箱分别发送验证码 */
      sendCode: async ({ username, password, purpose }) => {
        const { ok, data } = await postJSON('/api/auth/send-code', { username, password, purpose });
        if (!ok) return { ok: false, error: data?.error || '验证码发送失败' };
        return { ok: true, data };
      },

      /** 第 2 步：校验全部验证码（每枚都必须正确），换取一次性凭证 */
      verifyCode: async ({ username, password, purpose, codes }) => {
        const { ok, data } = await postJSON('/api/auth/verify-code', {
          username, password, purpose, codes,
        });
        if (!ok) return { ok: false, error: data?.error || '验证码校验失败' };
        return { ok: true, ticket: data?.ticket };
      },

      /** 第 3 步（首次激活）：凭凭证设置密码，成功后直接登录进入系统 */
      activate: async ({ username, ticket, newPassword }) => {
        const { ok, data } = await postJSON('/api/auth/activate', { username, ticket, newPassword });
        if (!ok) return { ok: false, error: data?.error || '激活失败，请重试' };
        set({ currentUser: data.user, isAuthenticated: true, token: data.token });
        applySession(data.token, data.user);
        return { ok: true };
      },

      /** 修改密码（需登录态）：凭双邮箱验证凭证提交新密码 */
      changePassword: async ({ ticket, newPassword }) => {
        const token = get().token;
        let res: Response;
        try {
          res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ticket, newPassword }),
          });
        } catch {
          return { ok: false, error: '网络异常，请稍后重试' };
        }
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          /* 忽略解析失败 */
        }
        if (!res.ok) return { ok: false, error: data?.error || '密码修改失败' };
        return { ok: true };
      },

      /** 修改密码（登录态，凭当前密码；全角色自服务改密） */
      changePasswordSelf: async ({ currentPassword, newPassword }) => {
        const token = get().token;
        if (!token) return { ok: false, error: '未登录' };
        try {
          const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ currentPassword, newPassword }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return { ok: false, error: data?.error || '密码修改失败' };
          return { ok: true };
        } catch {
          return { ok: false, error: '网络异常，请稍后重试' };
        }
      },

      /** 找回密码：发送验证码到注册邮箱（登录页调用，无需登录态） */
      resetPasswordRequest: async ({ username }) => {
        const { ok, data } = await postJSON('/api/auth/reset-password-send', { username });
        if (!ok) return { ok: false, error: data?.error || '请求失败，请稍后重试' };
        return {
          ok: true,
          sent: data?.sent,
          email: data?.email,
          expiresInSeconds: data?.expiresInSeconds,
          message: data?.message,
        };
      },

      /** 找回密码：校验验证码并重置密码（登录页调用，无需登录态） */
      resetPasswordConfirm: async ({ username, code, newPassword }) => {
        const { ok, data } = await postJSON('/api/auth/reset-password-confirm', {
          username,
          code,
          newPassword,
        });
        if (!ok) return { ok: false, error: data?.error || '重置失败，请稍后重试' };
        return { ok: true };
      },

      /** 自助更新个人资料（白名单字段；部门/角色等管理员字段服务端会拒绝） */
      updateProfile: async (p) => {
        const token = get().token;
        if (!token) return { ok: false, error: '未登录' };
        try {
          const res = await fetch('/api/auth/profile', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(p),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return { ok: false, error: data?.error || '资料更新失败' };
          // 同步本地当前用户对象（部门/角色/用户名等未变字段保持原值）
          const updated = { ...get().currentUser, ...(data.user || {}) } as User;
          set({ currentUser: updated });
          return { ok: true, user: updated };
        } catch {
          return { ok: false, error: '网络异常，请稍后重试' };
        }
      },

      /** 应用启动时刷新当前用户资料（补齐登录态未返回的新字段） */
      refreshUser: async () => {
        const token = get().token;
        if (!token) return { ok: false, error: '未登录' };
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return { ok: false, error: data?.error || '刷新失败' };
          const merged = { ...get().currentUser, ...(data.user || {}) } as User;
          set({ currentUser: merged });
          return { ok: true };
        } catch {
          return { ok: false, error: '网络异常' };
        }
      },

      // ── 后台任务调度（V3.1.0）──────────────────────────────────
      jobsOverview: async () => {
        const { ok, data } = await authGet('/api/system/jobs', get().token);
        if (!ok) return { ok: false, error: data?.error || '读取任务状态失败' };
        return { ok: true, data };
      },
      jobsRun: async () => {
        const { ok, data } = await authPost('/api/system/jobs', { action: 'run' }, get().token);
        if (!ok) return { ok: false, error: data?.error || '推进任务失败' };
        return { ok: true, data };
      },
      jobsReplay: async () => {
        const { ok, data } = await authPost('/api/system/jobs', { action: 'replay' }, get().token);
        if (!ok) return { ok: false, error: data?.error || '重放失败任务失败' };
        return { ok: true, data };
      },
      jobsRotateToken: async () => {
        const { ok, data } = await authPost('/api/system/jobs', { action: 'rotate-token' }, get().token);
        if (!ok) return { ok: false, error: data?.error || '重新生成调度令牌失败' };
        return { ok: true, data };
      },

      // ── 审计与行级策略健康度（V3.3.0）──────────────────────────
      auditHealth: async () => {
        const { ok, data } = await authGet('/api/system/audit-health', get().token);
        if (!ok) return { ok: false, error: data?.error || '读取审计健康度失败' };
        return { ok: true, data };
      },

      /** 安全邮箱备用通道：申请延时投递 / 查询状态（不依赖登录态，登录页也可用） */
      securityMailbox: async ({ username, password, purpose, action }) => {
        const { ok, data } = await postJSON('/api/auth/security-mailbox', {
          username, password, purpose, action,
        });
        if (!ok) return { ok: false, error: data?.error || '安全邮箱通道操作失败' };
        return { ok: true, data };
      },
    }),
    {
      name: 'auth-storage', // 登录态（currentUser/isAuthenticated）保留在本地，保证刷新后免登录
      // V3.91.0：token 不再持久化到 localStorage（防 XSS 窃取），改由内存 + HttpOnly Cookie 持有
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ── 会话失效处理（V3.1.0 · 评测 H-03 整改）────────────────────
// 缺陷：账号被管理员停用后，接口返回 401，但持久化层「直接回退本地缓存」，
//   于是当事人只要不重新登录、直接刷新页面，依然能看到全量业务数据（客户、价格、订单……），
//   后续修改还会继续写入本地，形成一份与组织完全隔离的「影子数据」。
// 修复：收到 401 后不再回退本地，而是清空本机全部业务缓存并跳回登录页，
//   让「停用账号」真正生效到数据层。网络不通时仍保留离线可用（那是另一种错误）。
//
// ★ V3.10.1 追加修复「登录页频繁刷新」（本监听器曾是刷新循环的最后一环）：
//   原实现无条件执行 `window.location.href = '/login'`。当用户本来就在 /login
//   （或 /login 上还有未登录请求陆续 401）时，这次整页跳转会**重新加载整个应用**，
//   而模块级的状态清理标记（persistStorage 的 expiredHandled）随整页加载被重置，
//   于是新一轮 401 再次触发整页跳转 → 无限刷新，用户根本没机会输入密码。
//   现在：① 已在 /login 就**不跳转**（只清状态，避免无意义重载）；
//        ② 跳转用一次性闸门，同一页面生命周期内只跳一次。
let sessionExpiredRedirecting = false;
if (typeof window !== 'undefined') {
  window.addEventListener(SESSION_EXPIRED_EVENT, () => {
    try {
      // 先清内存态与令牌，再清本地存储；顺序反了会被 persist 又写回去
      useAuthStore.setState({ currentUser: null, isAuthenticated: false, token: null });
      setSyncToken(null);
      for (const k of Object.keys(window.localStorage)) {
        // auth-storage 是登录态持久化键（历史命名，无 ssa-erp- 前缀），必须一并清除
        if (k.startsWith('ssa-erp-') || k === 'auth-storage') window.localStorage.removeItem(k);
      }
      sessionStorage.setItem('ssa-erp-session-expired', '1');
    } catch {
      /* ignore */
    }
    // ★ 已在登录页：状态已清干净，无需再整页重载（重载只会白白重置防重复闸门）
    if (window.location.pathname === '/login') return;
    // ★ 一次性闸门：同一页面生命周期内只跳一次，避免多个并发 401 触发多次整页跳转
    if (sessionExpiredRedirecting) return;
    sessionExpiredRedirecting = true;
    window.location.href = '/login';
  });
}

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
