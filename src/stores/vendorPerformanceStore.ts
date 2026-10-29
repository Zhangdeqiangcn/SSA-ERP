import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { VendorPerformance } from '@/types/vendor';
import { usePurchaseStore } from './purchaseStore';

// ═══════════════════════════════════════════════════════════════════════════
// V3.63.0 关系化重构（根治审计 P1-VP-1 供应商绩效零后端孤岛）：
// 旧版用 persist(backendStorage) 把整个绩效数组存成 app_state 的 JSON Blob —— 能"存"但
// 采购评标/质量反馈无法回写评级。现改为数据主源 = D1 关系表 vendor_performance，
// 经通用实体路由 /api/entities/vendorPerformance 读写；启动水合，空库回填 seed（保留演示数据），
// 离线/异常回退 Mock。公开 API（records / addRecord / updateRecord / deleteRecord /
// calculateScore）不变，页面零改动。
// 另新增 recordQualityIncident(vendorId, vendorName, penalty) 供质量模块回写评级（质量反馈→供应商绩效联动）。
// ═══════════════════════════════════════════════════════════════════════════

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

/** 计算排名：totalScore>=90→A, >=75→B, >=60→C, <60→D */
function computeRanking(totalScore: number): string {
  if (totalScore >= 90) return 'A';
  if (totalScore >= 75) return 'B';
  if (totalScore >= 60) return 'C';
  return 'D';
}

function computeTotal(
  r: Pick<VendorPerformance, 'qualityScore' | 'deliveryScore' | 'priceScore' | 'serviceScore'>,
  qw = 0.3,
  dw = 0.3,
  pw = 0.25,
  sw = 0.15
): number {
  return Math.round((r.qualityScore * qw + r.deliveryScore * dw + r.priceScore * pw + r.serviceScore * sw) * 100) / 100;
}

const seedRecords: VendorPerformance[] = [
  {
    id: 'perf-001',
    vendorId: 'cus-001',
    vendorName: '华润建筑',
    period: '2026-Q3',
    qualityScore: 88,
    deliveryScore: 92,
    priceScore: 80,
    serviceScore: 85,
    totalScore: 88 * 0.3 + 92 * 0.3 + 80 * 0.25 + 85 * 0.15,
    ranking: 'B',
    remarks: '',
    evaluatedBy: '采购部主管',
    evaluatedAt: now(),
    createdAt: now(),
  },
  {
    id: 'perf-002',
    vendorId: 'cus-002',
    vendorName: '长江船舶',
    period: '2026-Q3',
    qualityScore: 75,
    deliveryScore: 70,
    priceScore: 65,
    serviceScore: 72,
    totalScore: 75 * 0.3 + 70 * 0.3 + 65 * 0.25 + 72 * 0.15,
    ranking: 'C',
    remarks: '',
    evaluatedBy: '采购部主管',
    evaluatedAt: now(),
    createdAt: now(),
  },
  {
    id: 'perf-003',
    vendorId: 'cus-003',
    vendorName: '新源机械',
    period: '2026-Q3',
    qualityScore: 92,
    deliveryScore: 95,
    priceScore: 88,
    serviceScore: 90,
    totalScore: 92 * 0.3 + 95 * 0.3 + 88 * 0.25 + 90 * 0.15,
    ranking: 'A',
    remarks: '',
    evaluatedBy: '采购部主管',
    evaluatedAt: now(),
    createdAt: now(),
  },
];

interface VendorPerformanceState {
  records: VendorPerformance[];
  loaded: boolean;
  hydrate: () => Promise<void>;
  addRecord: (record: VendorPerformance) => void;
  updateRecord: (id: string, patch: Partial<VendorPerformance>) => void;
  deleteRecord: (id: string) => void;
  /** 按权重重新计算所有记录的总分和排名，默认权重 30/30/25/15 */
  calculateScore: (qualityWeight?: number, deliveryWeight?: number, priceWeight?: number, serviceWeight?: number) => void;
  /** V3.63.0 质量反馈→供应商绩效联动：记录一次质量事件，扣减该供应商质量分并重算 */
  recordQualityIncident: (vendorId: string, vendorName: string, penalty?: number) => void;
  /** V3.64.0 P1-1 交期联动：按供应商订单按时交付率更新 deliveryScore 并重算排名。
   *  内部读采购订单聚合该供应商「已交付订单中实际交付 ≤ 期望交付」的比率（无交付数据则跳过不虚增）。 */
  recordDeliveryPerformance: (vendorId: string, vendorName?: string) => void;
}

// localStorage 安全访问（模块顶层 hydrate 在 Node/SSR 缺失时不崩）
const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string): void => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export const useVendorPerformanceStore = create<VendorPerformanceState>()((set, get) => ({
  records: [...seedRecords],
  loaded: false,

  hydrate: async () => {
    try {
      const res = await entityRepo.list<VendorPerformance>('vendorPerformance', { page: 1, pageSize: 500 });
      const list = (res?.data || []).map((r) => ({ ...r, qualityScore: Number(r.qualityScore) || 0, deliveryScore: Number(r.deliveryScore) || 0, priceScore: Number(r.priceScore) || 0, serviceScore: Number(r.serviceScore) || 0, totalScore: Number(r.totalScore) || 0 }));
      if (list.length === 0 && !lsGet('ssa-erp-backfilled-vendorPerformance')) {
        lsSet('ssa-erp-backfilled-vendorPerformance', '1');
        for (const item of seedRecords) {
          try { await entityRepo.create<VendorPerformance>('vendorPerformance', item); } catch { /* 编码冲突忽略 */ }
        }
        const refreshed = await entityRepo.list<VendorPerformance>('vendorPerformance', { page: 1, pageSize: 500 });
        set({ records: (refreshed?.data || []).map((r) => ({ ...r, qualityScore: Number(r.qualityScore) || 0, deliveryScore: Number(r.deliveryScore) || 0, priceScore: Number(r.priceScore) || 0, serviceScore: Number(r.serviceScore) || 0, totalScore: Number(r.totalScore) || 0 })), loaded: true });
        return;
      }
      set({ records: list.length ? list : [...seedRecords], loaded: true });
    } catch {
      set({ records: [...seedRecords], loaded: true });
    }
  },

  addRecord: (record) => {
    set((s) => ({ records: [record, ...s.records] }));
    entityRepo.create<VendorPerformance>('vendorPerformance', record).catch(() => {});
  },
  updateRecord: (id, patch) => {
    const prev = get().records.find((r) => r.id === id);
    const merged = { ...(prev as any), ...patch };
    set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    entityRepo.update<VendorPerformance>('vendorPerformance', id, merged).catch(() => {});
  },
  deleteRecord: (id) => {
    set((s) => ({ records: s.records.filter((r) => r.id !== id) }));
    entityRepo.remove('vendorPerformance', id).catch(() => {});
  },

  calculateScore: (qualityWeight = 30, deliveryWeight = 30, priceWeight = 25, serviceWeight = 15) => {
    const qw = qualityWeight / 100;
    const dw = deliveryWeight / 100;
    const pw = priceWeight / 100;
    const sw = serviceWeight / 100;
    const updated = get().records.map((r) => {
      const totalScore = computeTotal(r, qw, dw, pw, sw);
      return { ...r, totalScore, ranking: computeRanking(totalScore) };
    });
    set({ records: updated });
    // 关系化回写：逐条更新总分与排名
    for (const r of updated) {
      entityRepo.update<VendorPerformance>('vendorPerformance', r.id, { totalScore: r.totalScore, ranking: r.ranking }).catch(() => {});
    }
  },

  recordQualityIncident: (vendorId, vendorName, penalty = 5) => {
    if (!vendorId) return;
    const existing = get().records.find((r) => r.vendorId === vendorId);
    const ts = now();
    if (existing) {
      const qualityScore = Math.max(0, (Number(existing.qualityScore) || 0) - penalty);
      const totalScore = computeTotal({ ...existing, qualityScore });
      const ranking = computeRanking(totalScore);
      set((s) => ({ records: s.records.map((r) => (r.vendorId === vendorId ? { ...r, qualityScore, totalScore, ranking } : r)) }));
      entityRepo.update<VendorPerformance>('vendorPerformance', existing.id, { qualityScore, totalScore, ranking }).catch(() => {});
    } else {
      // 无记录则建一条，质量分直接扣减后入账（其余维度默认 60）
      const qualityScore = Math.max(0, 60 - penalty);
      const base = { qualityScore, deliveryScore: 60, priceScore: 60, serviceScore: 60 };
      const totalScore = computeTotal(base);
      const ranking = computeRanking(totalScore);
      const rec: VendorPerformance = {
        id: 'perf-' + crypto.randomUUID(),
        vendorId,
        vendorName,
        period: (() => { const d = new Date(); return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`; })(),
        ...base,
        totalScore,
        ranking,
        remarks: '由质量事件自动建卡',
        evaluatedBy: '质量联动',
        evaluatedAt: ts,
        createdAt: ts,
      };
      set((s) => ({ records: [rec, ...s.records] }));
      entityRepo.create<VendorPerformance>('vendorPerformance', rec).catch(() => {});
    }
  },

  /**
   * ★ V3.64.0 P1-1 交期联动：按供应商订单按时交付率回写 deliveryScore。
   * 口径（诚实，不虚增）：只统计**已交付**（有 actualDeliveryDate）的订单，
   *   按时率 = 实际交付 ≤ 期望交付 的订单数 / 已交付订单数；
   *   交期分 = 按时率 × 100（无期望交付日/无已交付订单则跳过，不编数）。
   * 惰性 import purchaseStore 取数据源，避免顶层循环依赖。
   */
  recordDeliveryPerformance: (vendorId, vendorName) => {
    if (!vendorId) return;
    // 惰性读采购订单（函数体内 getState，避免与 purchaseStore 顶层循环依赖）
    const orders = usePurchaseStore.getState().purchaseOrders || [];
    const withActual = orders.filter((o: any) => o.vendorId === vendorId && o.actualDeliveryDate);
    if (withActual.length === 0) return; // 无已交付订单 → 不更新（不虚增不拉低）
    const delivered = withActual.length;
    const onTime = withActual.filter((o: any) => {
      const exp = o.expectedDeliveryDate;
      if (!exp) return false;
      return String(o.actualDeliveryDate).slice(0, 10) <= String(exp).slice(0, 10);
    }).length;
    const deliveryScore = Math.round((onTime / delivered) * 100);
    const existing = get().records.find((r) => r.vendorId === vendorId);
    const ts = now();
    if (existing) {
      const totalScore = computeTotal({ ...existing, deliveryScore });
      const ranking = computeRanking(totalScore);
      set((s) => ({ records: s.records.map((r) => (r.vendorId === vendorId ? { ...r, deliveryScore, totalScore, ranking } : r)) }));
      entityRepo.update<VendorPerformance>('vendorPerformance', existing.id, { deliveryScore, totalScore, ranking }).catch(() => {});
    } else {
      const base = { qualityScore: 60, deliveryScore, priceScore: 60, serviceScore: 60 };
      const totalScore = computeTotal(base);
      const ranking = computeRanking(totalScore);
      const rec: VendorPerformance = {
        id: 'perf-' + crypto.randomUUID(),
        vendorId,
        vendorName: vendorName || '',
        period: (() => { const d = new Date(); return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`; })(),
        ...base,
        totalScore,
        ranking,
        remarks: '由交期达成率自动建卡',
        evaluatedBy: '交期联动',
        evaluatedAt: ts,
        createdAt: ts,
      };
      set((s) => ({ records: [rec, ...s.records] }));
      entityRepo.create<VendorPerformance>('vendorPerformance', rec).catch(() => {});
    }
  },
}));

// 启动后即水合（离线/未登录时回退 Mock，不阻断 UI）
void useVendorPerformanceStore.getState().hydrate();
