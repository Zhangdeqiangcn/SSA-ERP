import { create } from 'zustand';
import { authHeaders } from '@/utils/authHeaders';
import { hasSession } from '@/stores/persistStorage';

/**
 * 单位换算规则单一数据源（V3.17.9 差距15 收口）
 * ------------------------------------------------------------
 * ── 这一版改了什么，为什么必须改 ──────────────────────────────
 * 上一轮为「差距15 单位换算独立建表」做了迁移 0074 + /api/unit-conversions 端点，
 * 但本 store 仍走 zustand persist（app_state 大对象）——于是新表成了一块**没人读的死表**：
 * 界面上改一条换算规则只会写进浏览器那侧的状态键，服务端新建的表一条数据都不会变。
 * 这属于「修复只做了一半」：看起来差距消除了，实际口径还是老的。
 * 本版把 store 的主源切到 D1，本地不再持久化换算规则。
 *
 * ── 为什么必须不能只存在浏览器里 ──────────────────────────────
 * 换算规则出错影响全公司算料算钱（1 箱到底算 12 个还是 24 个），
 * 它必须是组织级权威数据：换台电脑看到的要一样、要进备份、要能审计谁改的。
 *
 * ── 兼容性 ────────────────────────────────────────────────────
 * 公开 API 不变（rules / addRule / updateRule / removeRule / resetRules），
 * 只是 add/update/remove 由「同步改本地」变成「写服务端后重新拉取」，
 * 返回值由 void 变成 Promise<boolean>；既有调用点都是按钮事件里直接调用、
 * 不使用返回值，因此无需改动调用方。
 * 另外新增 loadRules()，由页面挂载时调用（不放在模块顶层自动跑，
 * 避免未登录时也发起请求 —— 铁律⑫：未登录是一等公民）。
 */

export interface UnitRule {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: number; // 1 fromUnit = factor toUnit
}

/** 兜底默认值：仅在**服务端一条规则都没有**时用于首次播种（首次部署的空库） */
export const DEFAULT_UNIT_RULES: UnitRule[] = [
  { id: 'u1', fromUnit: '箱', toUnit: '个', factor: 12 },
  { id: 'u2', fromUnit: '吨', toUnit: '公斤', factor: 1000 },
  { id: 'u3', fromUnit: '米', toUnit: '厘米', factor: 100 },
  { id: 'u4', fromUnit: '千只', toUnit: '只', factor: 1000 },
  { id: 'u5', fromUnit: '卷', toUnit: '米', factor: 50 },
  { id: 'u6', fromUnit: '捆', toUnit: '根', factor: 20 },
];

/** 纯函数：按规则换算（支持正/反向），无路径返回 null */
export function convertUnit(value: number, from: string, to: string, rules: UnitRule[]): number | null {
  if (from === to) return value;
  const direct = rules.find((r) => r.fromUnit === from && r.toUnit === to);
  if (direct) return value * direct.factor;
  const rev = rules.find((r) => r.fromUnit === to && r.toUnit === from);
  if (rev) return value / rev.factor;
  return null;
}

/** 服务端下划线 → 前端驼峰（映射只在这两处维护） */
const toRule = (r: any): UnitRule => ({
  id: String(r.id),
  fromUnit: String(r.from_unit ?? r.fromUnit ?? ''),
  toUnit: String(r.to_unit ?? r.toUnit ?? ''),
  factor: Number(r.factor) || 1,
});

async function req<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: authHeaders({
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...((init?.headers as Record<string, string>) || {}),
      }),
    });
    const text = await res.text();
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
    if (!res.ok) return { ok: false, status: res.status, error: payload?.error || `HTTP ${res.status}` };
    return { ok: true, status: res.status, data: payload };
  } catch (e: any) {
    return { ok: false, status: 0, error: e?.message || '网络异常' };
  }
}

interface UnitConversionState {
  rules: UnitRule[];
  loading: boolean;
  /** 最近一次失败原因；null 表示正常。界面据此提示，而不是静默失败 */
  lastError: string | null;
  loadedAt: number | null;
  /** 从 D1 拉取（页面挂载时调用） */
  loadRules: () => Promise<void>;
  /** 本地批量替换（仅用于把一次拉取结果灌进来 / 重置预览，不写服务端） */
  setRules: (rules: UnitRule[]) => void;
  addRule: (rule: Omit<UnitRule, 'id'>) => Promise<boolean>;
  updateRule: (id: string, patch: Partial<Omit<UnitRule, 'id'>>) => Promise<boolean>;
  removeRule: (id: string) => Promise<boolean>;
  /** 放弃本地修改，重新从服务端拉一次（不再「重置成前端默认 6 条」——
   *  那会把公司自定义的换算规则一并抹掉，是破坏性操作） */
  resetRules: () => Promise<void>;
}

export const useUnitConversionStore = create<UnitConversionState>()((set, get) => ({
  rules: [],
  loading: false,
  lastError: null,
  loadedAt: null,

  loadRules: async () => {
    // 未登录不发起业务请求
    let hasToken = false;
    try { hasToken = hasSession(); } catch { /* ignore */ }
    if (!hasToken) {
      set({ rules: DEFAULT_UNIT_RULES.map((r) => ({ ...r })), loadedAt: Date.now(), lastError: null });
      return;
    }

    set({ loading: true });
    const r = await req<any>('/api/unit-conversions');
    if (!r.ok) {
      set({ loading: false, lastError: r.error || '加载单位换算规则失败' });
      return;
    }
    const list = (r.data?.data || []).map(toRule).filter((x: UnitRule) => x.fromUnit && x.toUnit);
    set({ rules: list, loading: false, lastError: null, loadedAt: Date.now() });
  },

  setRules: (rules) => set({ rules }),

  addRule: async (rule) => {
    const r = await req<any>('/api/unit-conversions', {
      method: 'POST',
      body: JSON.stringify({ fromUnit: rule.fromUnit, toUnit: rule.toUnit, factor: rule.factor }),
    });
    if (!r.ok) {
      set({ lastError: r.error || '新增失败' });
      return false;
    }
    await get().loadRules();
    return true;
  },

  updateRule: async (id, patch) => {
    const cur = get().rules.find((x) => x.id === id);
    const next = { ...(cur || { id } as UnitRule), ...patch };
    const r = await req<any>(`/api/unit-conversions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ fromUnit: next.fromUnit, toUnit: next.toUnit, factor: next.factor }),
    });
    if (!r.ok) {
      set({ lastError: r.error || '更新失败' });
      return false;
    }
    await get().loadRules();
    return true;
  },

  removeRule: async (id) => {
    const r = await req<any>(`/api/unit-conversions/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      set({ lastError: r.error || '删除失败' });
      return false;
    }
    await get().loadRules();
    return true;
  },

  resetRules: async () => {
    await get().loadRules();
  },
}));
