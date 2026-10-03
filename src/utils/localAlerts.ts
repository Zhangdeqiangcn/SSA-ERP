import { useMaterialStore } from '@/stores/materialStore';
import { useWarehouseStore } from '@/stores/warehouseStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { useSalesStore } from '@/stores/salesStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useProductionStore } from '@/stores/productionStore';
import { getRule, type AlertRule } from '@/stores/alertRuleStore';

/**
 * 异常预警 · 本地同源重算 + 规则过滤 — V2.73
 * ------------------------------------------------------------
 * 背景：/api/alerts 只在生产（Cloudflare Functions + D1）存在，
 * DEV / E2E / 离线环境下 fetch 会 404，预警页直接报错。
 * 本模块用与服务端一致的业务口径，基于本地 store 重算同样的 6 类异常，
 * 使预警页在任何环境下都能工作；规则阈值（前端可配）对两个来源一视同仁地二次过滤。
 */

export interface AlertMetrics {
  /** 低库存：可用量 */
  qty?: number;
  /** 低库存：安全库存 */
  safetyStock?: number;
  /** 低库存：可用量 / 安全库存 百分比 */
  ratioPct?: number;
  /** 逾期：逾期天数（≥0） */
  overdueDays?: number;
  /** 信用超额：超出比例百分比 */
  overRatePct?: number;
  /** 临期：是否已过期（true=已过期，false=临期） */
  expired?: boolean;
}

export interface AlertItem {
  id?: string;
  label: string;
  value: string;
  extra?: string;
  /** 结构化数值（服务端自 V2.73 起下发 _metrics，此处统一为 metrics） */
  metrics?: AlertMetrics;
}

export interface AlertData {
  lowStock: AlertItem[];
  overduePO: AlertItem[];
  overdueSO: AlertItem[];
  expiringBatches: AlertItem[];
  creditOverdue: AlertItem[];
  pendingApprovals: { purchaseOrders: number; salesOrders: number; workOrders: number };
  summary: { total: number; critical: number };
}

export type AlertSource = 'server' | 'local';

const DAY = 24 * 60 * 60 * 1000;

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateOnly(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** 逾期天数：正数表示已逾期 */
function overdueDays(dateStr: string, today: Date): number {
  const t = new Date(dateStr);
  if (Number.isNaN(t.getTime())) return 0;
  return Math.max(0, Math.floor((today.getTime() - t.getTime()) / DAY));
}

/**
 * 本地同源重算：口径对齐 functions/api/alerts
 * - 低库存：可用量 < 安全库存（安全库存缺失时按 100，与后端 COALESCE 一致）
 * - 逾期采购/销售：期望交期 < 今天 且 未完结
 * - 临期：shelfLifeStatus ∈ {expiring, expired} 且 库存 > 0
 * - 信用超额：授信 > 0 且 已用 > 授信
 * - 待审批：采购未确认(created/sent) + 销售草稿(draft) + 工单草稿(draft)
 */
export function computeLocalAlerts(): AlertData {
  const today = todayStart();
  const todayStr = dateOnly(today);

  const materials = useMaterialStore.getState().materials || [];
  const inventory = useWarehouseStore.getState().inventoryRecords || [];
  const purchaseOrders = usePurchaseStore.getState().purchaseOrders || [];
  const salesOrders = useSalesStore.getState().salesOrders || [];
  const customers = useCustomerStore.getState().customers || [];
  const workOrders = useProductionStore.getState().workOrders || [];

  // 1. 低库存
  const safetyByMaterial = new Map<string, number>();
  materials.forEach((m: { id: string; safetyStock?: number }) => {
    safetyByMaterial.set(m.id, m.safetyStock ?? 100);
  });
  const lowStock: AlertItem[] = inventory
    .filter((rec) => {
      const safety = safetyByMaterial.get(rec.materialId) ?? 100;
      return (rec.availableQuantity ?? rec.quantity ?? 0) < safety;
    })
    .map((rec) => {
      const safety = safetyByMaterial.get(rec.materialId) ?? 100;
      const qty = rec.availableQuantity ?? rec.quantity ?? 0;
      return {
        id: rec.materialCode,
        label: `${rec.materialName} (${rec.materialCode})`,
        value: `可用 ${qty} / 安全库存 ${safety}`,
        extra: rec.warehouseName || '-',
        metrics: {
          qty,
          safetyStock: safety,
          ratioPct: safety > 0 ? (qty / safety) * 100 : 0,
        },
      };
    })
    .sort((a, b) => (a.metrics?.qty ?? 0) - (b.metrics?.qty ?? 0))
    .slice(0, 20);

  // 2. 逾期采购订单（未完结：received/closed/cancelled 之外）
  const poDone = ['received', 'closed', 'cancelled'];
  const overduePO: AlertItem[] = purchaseOrders
    .filter((o) => o.expectedDeliveryDate && o.expectedDeliveryDate < todayStr && !poDone.includes(o.status))
    .map((o) => {
      const days = overdueDays(o.expectedDeliveryDate, today);
      return {
        id: o.orderNo,
        label: `${o.orderNo} - ${o.vendorName || '-'}`,
        value: `期望 ${o.expectedDeliveryDate}，逾期 ${days} 天`,
        extra: o.status,
        metrics: { overdueDays: days },
      };
    })
    .sort((a, b) => (b.metrics?.overdueDays ?? 0) - (a.metrics?.overdueDays ?? 0))
    .slice(0, 10);

  // 3. 逾期销售订单
  const soDone = ['completed', 'cancelled', 'fully_shipped'];
  const overdueSO: AlertItem[] = salesOrders
    .filter((o) => o.expectedDeliveryDate && o.expectedDeliveryDate < todayStr && !soDone.includes(o.status))
    .map((o) => {
      const days = overdueDays(o.expectedDeliveryDate, today);
      return {
        id: o.orderNo,
        label: `${o.orderNo} - ${o.customerName || '-'}`,
        value: `期望 ${o.expectedDeliveryDate}，逾期 ${days} 天`,
        extra: o.status,
        metrics: { overdueDays: days },
      };
    })
    .sort((a, b) => (b.metrics?.overdueDays ?? 0) - (a.metrics?.overdueDays ?? 0))
    .slice(0, 10);

  // 4. 临期 / 过期
  const expiringBatches: AlertItem[] = inventory
    .filter((rec) => (rec.shelfLifeStatus === 'expiring' || rec.shelfLifeStatus === 'expired') && (rec.quantity ?? 0) > 0)
    .map((rec) => ({
      id: rec.materialCode,
      label: `${rec.materialName} (${rec.materialCode})`,
      value: `状态: ${rec.shelfLifeStatus === 'expired' ? '过期' : '临期'}`,
      extra: `库存 ${rec.quantity}`,
      metrics: { expired: rec.shelfLifeStatus === 'expired', qty: rec.quantity },
    }))
    .slice(0, 20);

  // 5. 信用超额
  const creditOverdue: AlertItem[] = customers
    .filter((c) => (c.creditLimit ?? 0) > 0 && (c.usedCredit ?? 0) > (c.creditLimit ?? 0))
    .map((c) => {
      const limit = c.creditLimit ?? 0;
      const used = c.usedCredit ?? 0;
      return {
        id: c.code,
        label: c.name,
        value: `已用 ¥${used.toLocaleString()} / 授信 ¥${limit.toLocaleString()}`,
        extra: `超出 ¥${(used - limit).toLocaleString()}`,
        metrics: { overRatePct: limit > 0 ? ((used - limit) / limit) * 100 : 0 },
      };
    })
    .sort((a, b) => (b.metrics?.overRatePct ?? 0) - (a.metrics?.overRatePct ?? 0))
    .slice(0, 10);

  // 6. 待审批
  const pendingApprovals = {
    purchaseOrders: purchaseOrders.filter((o) => ['created', 'sent'].includes(o.status)).length,
    salesOrders: salesOrders.filter((o) => o.status === 'draft').length,
    workOrders: workOrders.filter((w) => w.status === 'draft').length,
  };

  return {
    lowStock,
    overduePO,
    overdueSO,
    expiringBatches,
    creditOverdue,
    pendingApprovals,
    summary: {
      total: lowStock.length + overduePO.length + overdueSO.length + expiringBatches.length + creditOverdue.length,
      critical: overduePO.length + overdueSO.length + creditOverdue.length,
    },
  };
}

/**
 * 从服务端下发的 value 文本兜底解析结构化数值。
 * 服务端自 V2.73 起直接下发 metrics 字段；未升级/旧数据时用文本解析保证规则仍可过滤。
 */
export function parseMetrics(item: AlertItem): AlertMetrics | undefined {
  if (item.metrics) return item.metrics;
  const v = item.value || '';
  // 低库存："可用 12 / 安全库存 100"
  const lowMatch = v.match(/可用\s*([\d.]+)\s*\/\s*安全库存\s*([\d.]+)/);
  if (lowMatch) {
    const qty = Number(lowMatch[1]);
    const safety = Number(lowMatch[2]);
    return { qty, safetyStock: safety, ratioPct: safety > 0 ? (qty / safety) * 100 : 0 };
  }
  // 逾期："期望 2026-01-01，逾期 5 天"
  const dayMatch = v.match(/逾期\s*(\d+)\s*天/);
  if (dayMatch) return { overdueDays: Number(dayMatch[1]) };
  // 信用："已用 ¥1,200 / 授信 ¥1,000" + extra "超出 ¥200"
  const creditMatch = v.match(/已用\s*[¥￥]?([\d,.]+)\s*\/\s*授信\s*[¥￥]?([\d,.]+)/);
  if (creditMatch) {
    const used = Number(creditMatch[1].replace(/,/g, ''));
    const limit = Number(creditMatch[2].replace(/,/g, ''));
    return { overRatePct: limit > 0 ? ((used - limit) / limit) * 100 : 0 };
  }
  // 临期："状态: 临期 / 过期"
  if (/状态:\s*过期/.test(v)) return { expired: true };
  if (/状态:\s*临期/.test(v)) return { expired: false };
  return undefined;
}

/** 单条明细是否命中规则阈值 */
export function matchRule(key: string, item: AlertItem, rule: AlertRule): boolean {
  if (!rule.enabled) return false;
  const m = parseMetrics(item);
  switch (key) {
    case 'lowStock': {
      const threshold = rule.params.ratioPct ?? 100;
      const ratio = m?.ratioPct;
      // 无结构化数值时不误杀（保持可见），交由服务端/本地已算好的口径
      if (ratio === undefined) return true;
      return ratio < threshold;
    }
    case 'overduePO':
    case 'overdueSO': {
      const minDays = rule.params.minDays ?? 0;
      const days = m?.overdueDays;
      if (days === undefined) return true;
      return days >= minDays;
    }
    case 'expiring': {
      if (rule.params.includeExpired === false && m?.expired === true) return false;
      return true;
    }
    case 'credit': {
      const threshold = rule.params.overRatePct ?? 0;
      const rate = m?.overRatePct;
      if (rate === undefined) return true;
      return rate >= threshold;
    }
    default:
      return true;
  }
}

/** 按规则集过滤预警数据（规则关闭 → 该类清空；阈值收紧 → 逐条命中判定） */
export function applyAlertRules(data: AlertData, rules: AlertRule[]): AlertData {
  const keep = (key: Parameters<typeof getRule>[1], list: AlertItem[]) => {
    const rule = getRule(rules, key);
    if (!rule.enabled) return [];
    return list.filter((item) => matchRule(key, item, rule));
  };

  const lowStock = keep('lowStock', data.lowStock);
  const overduePO = keep('overduePO', data.overduePO);
  const overdueSO = keep('overdueSO', data.overdueSO);
  const expiringBatches = keep('expiring', data.expiringBatches);
  const creditOverdue = keep('credit', data.creditOverdue);
  const pendingRule = getRule(rules, 'pendingApproval');

  return {
    lowStock,
    overduePO,
    overdueSO,
    expiringBatches,
    creditOverdue,
    pendingApprovals: pendingRule.enabled
      ? data.pendingApprovals
      : { purchaseOrders: 0, salesOrders: 0, workOrders: 0 },
    summary: {
      total: lowStock.length + overduePO.length + overdueSO.length + expiringBatches.length + creditOverdue.length,
      critical: overduePO.length + overdueSO.length + creditOverdue.length,
    },
  };
}

/** 服务端响应 → 前端 AlertData（兼容 _metrics / metrics 两种字段） */
export function normalizeServerAlerts(raw: any): AlertData {
  const mapItem = (it: any): AlertItem => ({
    id: it.id,
    label: it.label,
    value: it.value,
    extra: it.extra,
    metrics: it.metrics || it._metrics || undefined,
  });
  return {
    lowStock: (raw?.lowStock || []).map(mapItem),
    overduePO: (raw?.overduePO || []).map(mapItem),
    overdueSO: (raw?.overdueSO || []).map(mapItem),
    expiringBatches: (raw?.expiringBatches || []).map(mapItem),
    creditOverdue: (raw?.creditOverdue || []).map(mapItem),
    pendingApprovals: raw?.pendingApprovals || { purchaseOrders: 0, salesOrders: 0, workOrders: 0 },
    summary: raw?.summary || { total: 0, critical: 0 },
  };
}
