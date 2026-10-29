// 云同步状态（V3.1.0 · 评测 H-02 / H-03 / M-13 整改）
//
// 用途：把「云端保存失败」「多端冲突」「登录状态失效」三类过去被静默吞掉的事件，
//   暴露成界面上能看见、能处理的状态，由 SyncStatusBanner 统一呈现。
//
// 为什么单独建一个 store：persistStorage 是底层存储适配器（被 authStore 引用），
//   它自己不能再引用 authStore（会形成循环依赖）。用一个中立的状态仓库 +
//   浏览器事件解耦，是这里最干净的做法。

import { create } from 'zustand';

/** 各持久化键的中文名（用于把 ssa-erp-xxx 翻译成人话） */
export const KEY_LABELS: Record<string, string> = {
  'ssa-erp-alert-rules': '预警规则',
  'ssa-erp-analytics': '分析配置',
  'ssa-erp-approval-flows': '审批流程',
  'ssa-erp-arap': '应收应付',
  'ssa-erp-audit': '审计日志',
  'ssa-erp-bom': '物料清单（BOM，即产品用料结构表）',
  'ssa-erp-coa': '会计科目',
  'ssa-erp-conditions': '条件配置',
  'ssa-erp-consignment': '寄售库存',
  'ssa-erp-customfield': '自定义字段',
  'ssa-erp-datadict': '数据字典',
  'ssa-erp-data-permission': '数据权限',
  'ssa-erp-display': '显示偏好',
  'ssa-erp-finance': '财务',
  'ssa-erp-finance-ext': '财务扩展',
  'ssa-erp-finance-ledger': '财务账簿',
  'ssa-erp-flow': '流程配置',
  'ssa-erp-fmea': '失效模式分析（FMEA）',
  'ssa-erp-fx': '汇率',
  'ssa-erp-integration': '集成配置',
  'ssa-erp-invoice-verify': '发票核验',
  'ssa-erp-listprefs': '列表偏好',
  'ssa-erp-lowcode': '低代码配置',
  'ssa-erp-material-approval': '物料审批',
  'ssa-erp-material-ext': '物料扩展',
  'ssa-erp-notify': '通知',
  'ssa-erp-numbering': '编号规则',
  'ssa-erp-order-templates': '订单模板',
  'ssa-erp-org': '组织与部门',
  'ssa-erp-price': '价格与价目表',
  'ssa-erp-purchase': '采购',
  // ⚠️ 以下两个键的 persist 已删除（财务 V3.8.0、销售 V3.9.0 迁入 D1 关系表），
  // 新版本不会再写入它们。**但映射刻意保留**：老版本浏览器里可能还挂着
  // 这两条待重试的失败记录，删掉映射会让同步面板显示裸 key（如 `ssa-erp-sales`）
  // 而不是「销售」，反而让用户看不懂。等这些遗留项自然清空后再考虑移除。
  // （'ssa-erp-finance' 原本就在上方第 27 行登记，此处不重复声明。）
  'ssa-erp-sales': '销售',
  'ssa-erp-users': '用户与角色',
};

export function keyLabel(key: string): string {
  return KEY_LABELS[key] || key;
}

export interface SyncFailure {
  key: string;
  label: string;
  message: string;
  attempts: number;
  at: number;
  /** error = 网络/服务端故障（会自动重试）；warn = 权限不足等重试也无用的情况 */
  severity: 'error' | 'warn';
}

export interface SyncConflict {
  key: string;
  label: string;
  at: number;
}

interface SyncStatusState {
  /** 云端保存失败、等待重试的项 */
  failures: SyncFailure[];
  /** 多端并发冲突（已改为以云端为准） */
  conflicts: SyncConflict[];
  /** 账号被停用 / 会话失效（将清理本地缓存并跳登录） */
  expired: boolean;
  reportFailure: (key: string, message: string, attempts: number, severity?: 'error' | 'warn') => void;
  clearFailure: (key: string) => void;
  clearFailures: () => void;
  reportConflict: (key: string) => void;
  clearConflicts: () => void;
  reportExpired: () => void;

  // ── V3.4.0（对标 D4 可用性 / D2 界面）：云端数据拉取中的并发计数 ──
  // 现状：业务数据一律同步读 zustand store，store 由 persist 从 /api/state/[key] 异步回填，
  //   回填完成前页面渲染的是本地/内置数据，回填后整表跳变一次——用户看到的是「先假后真」，
  //   没有任何「正在加载」的提示。此前全项目没有任何加载态（Skeleton 出现 0 次）。
  // 解法：在存储适配器的 getItem 上打点，暴露一个全局可读的「仍有键在拉取」标志，
  //   列表页据此显示骨架屏。计数而非布尔，是因为 60 个键是并发拉取的。
  hydrating: number;
  beginHydrate: (key: string) => void;
  endHydrate: (key: string) => void;
}

export const useSyncStatusStore = create<SyncStatusState>()((set) => ({
  failures: [],
  conflicts: [],
  expired: false,

  reportFailure: (key, message, attempts, severity = 'error') =>
    set((s) => {
      const rest = s.failures.filter((f) => f.key !== key);
      return {
        failures: [...rest, { key, label: keyLabel(key), message, attempts, severity, at: Date.now() }],
      };
    }),
  clearFailure: (key) => set((s) => ({ failures: s.failures.filter((f) => f.key !== key) })),
  clearFailures: () => set({ failures: [] }),

  reportConflict: (key) =>
    set((s) => ({
      conflicts: [
        ...s.conflicts.filter((c) => c.key !== key),
        { key, label: keyLabel(key), at: Date.now() },
      ],
    })),
  clearConflicts: () => set({ conflicts: [] }),

  reportExpired: () => set({ expired: true }),

  hydrating: 0,
  beginHydrate: () => set((s) => ({ hydrating: s.hydrating + 1 })),
  endHydrate: () => set((s) => ({ hydrating: Math.max(0, s.hydrating - 1) })),
}));

/**
 * 是否仍有持久化键在从云端拉取。
 * 列表页用法：`<DataTable loading={useCloudHydrating() && rows.length === 0} ... />`
 * ——只在「还没有任何数据」时显示骨架，已有数据时不闪骨架，避免打扰。
 */
export function useCloudHydrating(): boolean {
  return useSyncStatusStore((s) => s.hydrating > 0);
}
