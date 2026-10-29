// 共享存储适配器：登录态建立后，把各 store 的持久化数据代理到后端（按组织共享）
// 未登录 / 后端不可达时，自动回退到浏览器 localStorage（保证离线可用、本地不丢）
//
// ════════════════════════════════════════════════════════════════
// V3.1.0 重要改造（来源：《稳定性·可靠性·安全性深度评测报告》H-02 / H-03 / M-13）
// ════════════════════════════════════════════════════════════════
// 改造前的三个问题：
//   ① 【静默数据丢失】云端写入失败被 `catch {}` 吞掉，界面照常显示「保存成功」，
//      但云端仍是旧值；下次读取以云端为准 → 用户改动无声回滚，换台设备看到的还是旧数据。
//   ② 【停用账号仍读本地】接口返回 401（账号已停用）时，代码直接回退本地缓存，
//      于是离职员工不重新登录就能看到全量业务数据，还能继续往本地写「影子数据」。
//   ③ 【多端互相覆盖】状态值按「键」整块覆盖，后写的人无声覆盖先写的人。
//
// 改造后的行为：
//   ① 写入失败 → 记入重试队列（自动退避重试 4 次）并在界面顶部常驻提示，
//      用户能看见「有 N 项没保存成功」，并可手动立即重试；
//   ② 401 → 派发会话失效事件，由 authStore 清理本地业务缓存并跳转登录页，
//      不再回退本地渲染（账号停用因此真正生效到数据层）；
//   ③ 写入时带上「上次读到的版本号」，云端版本已变 → 返回 409，
//      此处以云端最新版为准写回本地并提示用户刷新，不再无声覆盖他人改动。
//
// 取舍说明：401 不再回退本地，意味着「离线可用」只在「网络不通」时成立，
//   在「账号已停用」时不再成立——这正是本次要达成的效果。
import { createJSONStorage, type StateStorage, type PersistStorage } from 'zustand/middleware';
import { useSyncStatusStore } from './syncStatusStore';

const TOKEN_KEY = 'ssa-erp-auth-token';
const SESSION_FLAG = 'ssa-erp-session'; // 非敏感布尔标记：仅表示「存在会话，可尝试云端同步」
const LS = typeof window !== 'undefined' ? window.localStorage : (undefined as any);
const SS = typeof window !== 'undefined' ? window.sessionStorage : (undefined as any);
const IS_DEV = import.meta.env.DEV === true;

/** 会话失效事件名：由 authStore 监听并执行清缓存 + 跳转 */
export const SESSION_EXPIRED_EVENT = 'ssa-erp:session-expired';

/** 自动重试的退避间隔（毫秒）：5s → 15s → 30s → 60s */
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000];
/** 自动重试次数上限；超过后停止自动重试，保留在队列中等待用户手动处理 */
const MAX_AUTO_ATTEMPTS = RETRY_DELAYS_MS.length;

/**
 * V3.91.0 安全整改：令牌不再落地明文到 localStorage（避免 XSS 一键窃取）。
 * 改为：
 *   · 内存变量 memoryToken —— 当前页面会话内持有，刷新即失；
 *   · 生产态由后端 HttpOnly Cookie（ssa-erp-auth）持久化，浏览器自动携带、JS 读不到；
 *   · 开发态（http，Secure Cookie 不被存储）额外镜像到 sessionStorage，保证 dev 跨域代理
 *     场景下刷新后仍能以 Authorization 头鉴权；
 *   · 非敏感的 SESSION_FLAG 布尔标记写入 localStorage，供「是否尝试云端同步」判断
 *     （不含任何机密，XSS 读取无收益）。
 */
let memoryToken: string | null = null;

// 由 authStore 在登录/登出时调用，写入/清除令牌与会话标记
export function setSyncToken(token: string | null) {
  memoryToken = token ?? null;
  try {
    if (memoryToken) {
      LS.setItem(SESSION_FLAG, '1');
      if (IS_DEV && SS) SS.setItem(TOKEN_KEY, memoryToken); // dev 仅镜像，便于刷新后回放
    } else {
      LS.removeItem(SESSION_FLAG);
      if (SS) SS.removeItem(TOKEN_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** 读取当前令牌（内存优先，dev 回退 sessionStorage）。生产刷新后返回 null，由 HttpOnly Cookie 兜底鉴权 */
export function getSyncToken(): string | null {
  if (memoryToken) return memoryToken;
  if (IS_DEV && SS) {
    try {
      return SS.getItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 是否存在有效会话（非敏感布尔判断，替代「token 是否非空」的旧逻辑） */
export function hasSession(): boolean {
  try {
    return !!LS.getItem(SESSION_FLAG);
  } catch {
    return false;
  }
}

/** 清除本地会话态（401 等场景调用） */
export function clearSession() {
  setSyncToken(null);
}

function apiUrl(key: string) {
  return `/api/state/${encodeURIComponent(key)}`;
}

function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** 各状态键「上次从云端读到的版本号」，用于写入时做冲突比对 */
const knownVersion = new Map<string, number>();

/** 等待重试的写入：key → { value, attempts } */
interface PendingWrite {
  value: string;
  attempts: number;
}
const pendingWrites = new Map<string, PendingWrite>();
let retryTimer: ReturnType<typeof setTimeout> | null = null;

/** 会话失效后的兜底跳转保护：避免事件未被监听时卡在原地 */
let expiredHandled = false;

function notify() {
  return useSyncStatusStore.getState();
}

/**
 * 401 处理：账号被停用 / 会话失效。
 * 派发事件交给 authStore 收拾（清 token、清本地业务缓存、跳登录），
 * 本处只做兜底跳转，避免循环依赖。
 */
function handleUnauthorized() {
  if (expiredHandled) return;
  expiredHandled = true;
  notify().reportExpired();
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
  } catch {
    /* ignore */
  }
  // 兜底：若无人监听事件（极端情况），1 秒后自行跳登录页。
  // ★ V3.10.1：已在登录页则不跳 —— 否则会整页重载应用、把 expiredHandled 重置为 false，
  //   在「登录页上仍有未登录请求陆续 401」时形成无限刷新循环（详见 authStore 同处注释）。
  setTimeout(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/login') return;
    window.location.href = '/login';
  }, 1000);
}

/** 安排下一次自动重试 */
function scheduleRetry(attempts: number) {
  if (retryTimer) return;
  if (!pendingWrites.size) return;
  if (attempts >= MAX_AUTO_ATTEMPTS) return; // 超出上限：等待用户手动重试
  const delay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flushPendingWrites();
  }, delay);
}

/** 把队列中的写入重放一遍；成功的出队，失败的按退避策略再排队 */
export async function flushPendingWrites(): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  const keys = Array.from(pendingWrites.keys());
  for (const key of keys) {
    const item = pendingWrites.get(key);
    if (!item) continue;
    // 队列里的是「最后一次要保存的值」，期间可能有新值覆盖；直接重放当前值即可
    const res = await putToCloud(key, item.value, item.attempts + 1);
    if (res.ok) ok += 1;
    else failed += 1;
  }
  return { ok, failed };
}

/** 当前是否有未成功保存到云端的改动 */
export function hasUnsyncedChanges(): boolean {
  return pendingWrites.size > 0;
}

interface PutResult {
  ok: boolean;
  status?: number;
  message?: string;
}

/**
 * 写入云端（内部统一入口）。
 * - 带上已知版本号做冲突检测；
 * - 401 → 会话失效处理；
 * - 409 → 以云端为准写回本地并提示冲突；
 * - 其他失败 → 入队 + 界面提示 + 自动重试。
 */
async function putToCloud(key: string, value: string, attempt = 1): Promise<PutResult> {
  if (!hasSession()) return { ok: false, status: 0, message: '未登录' };
  const token = getSyncToken();

  const body: any = { value };
  const base = knownVersion.get(key);
  if (typeof base === 'number') body.baseVersion = base;

  let res: Response;
  let data: any = {};
  try {
    res = await fetch(apiUrl(key), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify(body),
    });
  } catch {
    const msg = '网络异常，无法连接服务器';
    pendingWrites.set(key, { value, attempts: attempt });
    notify().reportFailure(key, msg, attempt);
    scheduleRetry(attempt);
    return { ok: false, status: 0, message: msg };
  }

  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.status === 401) {
    handleUnauthorized();
    return { ok: false, status: 401, message: '登录状态已失效' };
  }

  if (res.status === 409 || data?.code === 'VERSION_CONFLICT') {
    // 多端冲突：以云端最新版为准写回本地，并提示用户刷新页面重新载入
    const cur = data?.current;
    knownVersion.set(key, Number(cur?.version) || 1);
    pendingWrites.delete(key);
    if (cur && cur.value != null) {
      try {
        LS.setItem(key, String(cur.value));
      } catch {
        /* ignore */
      }
    }
    notify().reportConflict(key);
    return { ok: false, status: 409, message: data?.error || '数据已被其他设备修改' };
  }

  if (!res.ok) {
    const msg = data?.error || `云端保存失败（HTTP ${res.status}）`;
    pendingWrites.set(key, { value, attempts: attempt });
    // 权限不足（403）属于「重试也没用」的情况：只提示、不自动重试，避免每 5 秒骚扰一次
    const isPermission = res.status === 403;
    // A5：数据域体积超硬上限（413）同样「重试也没用」——
    // 数据没变小之前重试一万次还是失败，反而是每 5 秒弹一次更烦人。
    // 这类失败必须显式中断重试并给出可操作说明（导出留底 → 安排迁关系表）。
    const isTooLarge = res.status === 413 || data?.code === 'STATE_TOO_LARGE';
    notify().reportFailure(key, msg, attempt, isPermission || isTooLarge ? 'warn' : 'error');
    if (!isPermission && !isTooLarge && (res.status === 0 || res.status >= 500)) scheduleRetry(attempt);
    return { ok: false, status: res.status, message: msg };
  }

  // 成功：更新版本号、出队、清掉界面提示
  const v = Number(data?.version);
  if (Number.isFinite(v) && v > 0) knownVersion.set(key, v);
  pendingWrites.delete(key);
  notify().clearFailure(key);
  return { ok: true, status: res.status };
}

/**
 * 从云端读取单个持久化键（原 getItem 的方法体，V3.4.0 抽成独立函数，
 * 只为在外面套一层「拉取中」打点；逻辑一行未改）。
 */
async function readFromCloud(name: string, token: string | null): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(apiUrl(name), { headers: authHeaders(token), cache: 'no-store' });
  } catch {
    return LS.getItem(name); // 网络异常 → 本地兜底（离线可用）
  }

  if (res.status === 401) {
    // 账号停用 / 会话失效：不再回退本地渲染，交给会话失效流程处理
    handleUnauthorized();
    return null;
  }

  if (res.status === 404) {
    // 云端尚无此数据：用本地值兜底，并异步把本地数据首次上云（旧数据平滑迁移）
    const local = LS.getItem(name);
    if (local) {
      void putToCloud(name, local).catch(() => {});
    }
    return local;
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    return LS.getItem(name);
  }
  if (res.ok) {
    const v = Number(data?.version);
    if (Number.isFinite(v) && v > 0) knownVersion.set(name, v);
    return data && data.value != null ? String(data.value) : LS.getItem(name);
  }
  return LS.getItem(name);
}

const rawStateStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    if (!hasSession()) return LS.getItem(name);
    const token = getSyncToken();

    // V3.4.0：云端拉取打点，供列表页骨架屏判断「数据是否还在路上」
    const { beginHydrate, endHydrate } = useSyncStatusStore.getState();
    beginHydrate(name);
    try {
      return await readFromCloud(name, token);
    } finally {
      endHydrate(name);
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    // 会话已失效（账号停用等）：本地缓存将被清空，此刻任何写入都不再落盘，
    // 否则 store 会在清理之后又把数据写回本地，形成「影子数据」。
    if (expiredHandled) return;
    if (!hasSession()) {
      try {
        LS.setItem(name, value);
      } catch {
        /* ignore */
      }
      return;
    }
    const token = getSyncToken();

    await putToCloud(name, value);

    // 本地始终保留一份（离线兜底 / 未登录时直接使用）
    try {
      LS.setItem(name, value);
    } catch {
      /* ignore */
    }
  },

  async removeItem(name: string): Promise<void> {
    if (!hasSession()) {
      try {
        LS.removeItem(name);
      } catch {
        /* ignore */
      }
      return;
    }
    const token = getSyncToken();
    try {
      const res = await fetch(apiUrl(name), { method: 'DELETE', headers: authHeaders(token) });
      if (res.status === 401) handleUnauthorized();
    } catch {
      /* ignore */
    }
    pendingWrites.delete(name);
    knownVersion.delete(name);
    try {
      LS.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

// 用 createJSONStorage 把底层 string 型 StateStorage 适配为 zustand v4 要求的 PersistStorage<S>，
// 这样所有 store 的 `storage: backendStorage` 既通过类型检查，又在运行期正确做 JSON 序列化往返
// （之前直接传 StateStorage，v4 读取 .state 拿不到值，持久化实际失效）。
export const backendStorage: PersistStorage<any> = createJSONStorage(
  () => rawStateStorage
) as PersistStorage<any>;
