import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { parsePayload, writeConfig } from './entityBackedShared';

/**
 * 异常预警规则配置 — V2.73
 * ------------------------------------------------------------
 * 后端 /api/alerts 已真实计算 6 类异常（低库存/逾期采购/逾期销售/临期/信用超额/待审批），
 * 但阈值原先硬编码在后端 SQL 里，业务无法调整。本 store 把「哪些规则生效 + 阈值多少」
 * 前移到前端：规则对服务端数据与本地同源重算结果一视同仁地二次过滤，
 * 因此在 DEV/离线（走本地重算）与生产（走 D1）下行为一致。
 *
 * persist key = ssa-erp-alert-rules。
 */

export type AlertRuleKey =
  | 'lowStock'
  | 'overduePO'
  | 'overdueSO'
  | 'expiring'
  | 'credit'
  | 'pendingApproval';

export interface AlertRuleParams {
  /** 低库存：可用量 / 安全库存 低于该百分比才报警（默认 100 = 只要低于安全库存就报） */
  ratioPct?: number;
  /** 逾期采购/销售：逾期天数 ≥ 该值才报警（默认 0 = 只要逾期就报） */
  minDays?: number;
  /** 临期：是否包含已过期物料（默认 true） */
  includeExpired?: boolean;
  /** 信用超额：超出授信额度的比例 ≥ 该百分比才报警（默认 0 = 只要超额就报） */
  overRatePct?: number;
}

export interface AlertRule {
  key: AlertRuleKey;
  name: string;
  /** 规则说明（配置面板展示） */
  description: string;
  enabled: boolean;
  /** 命中后的严重度基线，实际仍按命中条数升级（见 AlertMonitor） */
  severity: 'high' | 'medium' | 'low';
  params: AlertRuleParams;
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    key: 'lowStock',
    name: '库存低于安全库存',
    description: '物料可用量低于安全库存阈值，需及时补货',
    enabled: true,
    severity: 'high',
    params: { ratioPct: 100 },
  },
  {
    key: 'overduePO',
    name: '采购订单逾期',
    description: '已超过期望交货日期但未完成的采购订单',
    enabled: true,
    severity: 'high',
    params: { minDays: 0 },
  },
  {
    key: 'overdueSO',
    name: '销售订单逾期',
    description: '已超过期望交货日期但未完成的销售订单',
    enabled: true,
    severity: 'high',
    params: { minDays: 0 },
  },
  {
    key: 'expiring',
    name: '临期/过期物料',
    description: '保质期临期或已过期的在库物料',
    enabled: true,
    severity: 'medium',
    params: { includeExpired: true },
  },
  {
    key: 'credit',
    name: '客户信用超额',
    description: '客户已用信用额度超过授信额度',
    enabled: true,
    severity: 'high',
    params: { overRatePct: 0 },
  },
  {
    key: 'pendingApproval',
    name: '待审批单据',
    description: '尚未审批的采购/销售订单与生产工单',
    enabled: true,
    severity: 'low',
    params: {},
  },
];

interface AlertRuleState {
  rules: AlertRule[];
  setRuleEnabled: (key: AlertRuleKey, enabled: boolean) => void;
  updateRuleParams: (key: AlertRuleKey, params: AlertRuleParams) => void;
  resetRules: () => void;
}

export const useAlertRuleStore = create<AlertRuleState>()(
    (set) => ({
      rules: DEFAULT_ALERT_RULES,
      setRuleEnabled: (key, enabled) =>
        set((s) => ({ rules: s.rules.map((r) => (r.key === key ? { ...r, enabled } : r)) })),
      updateRuleParams: (key, params) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.key === key ? { ...r, params: { ...r.params, ...params } } : r)),
        })),
      resetRules: () => set({ rules: DEFAULT_ALERT_RULES }),
    }),
);

// ── V3.81.0 D1 同步层（组织共享预警规则，整块 rules 单行，避免各终端规则漂移）──
const RES = 'alertRules';
const CFG_ID = 'alert-rules';

let hydrating = false;
async function hydrateAlertRules() {
  if (!isAuthed()) return;
  hydrating = true;
  try {
    const res = await entityRepo.list(RES, { page: 1, pageSize: 50 });
    const rows = parsePayload<{ id?: string; rules?: AlertRule[] }>(res?.data || []);
    const cfg = rows.find((r) => r?.id === CFG_ID);
    if (cfg?.rules && cfg.rules.length) {
      useAlertRuleStore.setState({ rules: cfg.rules });
    } else {
      writeConfig(RES, CFG_ID, { id: CFG_ID, rules: useAlertRuleStore.getState().rules });
    }
  } catch {
    /* 离线/异常：保留本地态 */
  } finally {
    hydrating = false;
  }
}

useAlertRuleStore.subscribe((s) => {
  if (hydrating) return;
  if (isAuthed()) writeConfig(RES, CFG_ID, { id: CFG_ID, rules: s.rules });
});

// 模块加载即自动水合（未登录/离线静默兜底）
void hydrateAlertRules();

/** 按 key 取规则（未配置时回退默认） */
export function getRule(rules: AlertRule[], key: AlertRuleKey): AlertRule {
  return (
    rules.find((r) => r.key === key) ||
    DEFAULT_ALERT_RULES.find((r) => r.key === key)!
  );
}
