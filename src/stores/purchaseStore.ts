import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { PurchaseRequest, PurchaseOrder, PurchaseOrderVersion, VendorQuote } from '@/types';
import { purchaseRequests as mockPurchaseRequests, purchaseOrders as mockPurchaseOrders, vendorQuotes as mockVendorQuotes } from '@/mocks/data/purchase';
import { normalizeOrderTax } from '@/utils/tax';
import { purchaseApi } from '@/services/purchase';
import { snakeToCamel } from '@/utils/case';

// W1 根治双通道：采购订单切片直连真实 D1 purchase_orders（仅 purchaseOrders 迁 D1；
// purchaseRequests / vendorQuotes 仍走 Blob，后端无对应写入端点）。
// 在线：loadPurchaseOrders 从 /api/purchase-orders 拉取；增改经 purchaseApi 写回。
// 离线/未登录/接口异常：回退内存 mockPurchaseOrders，不阻断业务。
const BACKFILL_FLAG = 'ssa-erp-purchase-backfilled';

function readLegacyPurchaseOrders(): PurchaseOrder[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-purchase');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.purchaseOrders && Array.isArray(st.purchaseOrders) && st.purchaseOrders.length) return st.purchaseOrders as PurchaseOrder[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function rowToPurchaseOrder(row: any): PurchaseOrder {
  const m = snakeToCamel(row) as any;
  let history = m.history;
  if (typeof history === 'string') {
    try { history = JSON.parse(history); } catch { history = []; }
  }
  return { ...m, history: history || [] } as PurchaseOrder;
}

const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

interface PurchaseFilter {
  requestNo?: string;
  title?: string;
  status?: string;
  priority?: string;
}

interface PurchaseState {
  purchaseRequests: PurchaseRequest[];
  purchaseOrders: PurchaseOrder[];
  vendorQuotes: VendorQuote[];
  filter: PurchaseFilter;
  selectedRequest: PurchaseRequest | null;
  selectedOrder: PurchaseOrder | null;

  // Request CRUD
  addPurchaseRequest: (request: PurchaseRequest) => void;
  updatePurchaseRequest: (id: string, updates: Partial<PurchaseRequest>) => void;
  deletePurchaseRequest: (id: string) => void;

  // Order CRUD
  addPurchaseOrder: (order: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  /** B10 订单变更单：变更生成新版本（非原地修改），已收货/终态锁定；返回 ok/error/新版本号 */
  changePurchaseOrder: (
    id: string,
    updates: Partial<Pick<PurchaseOrder, 'expectedDeliveryDate' | 'items' | 'paymentTerms' | 'tradeTerms' | 'deliveryAddress' | 'remarks' | 'totalAmount'>>,
    reason: string,
    changedBy?: string
  ) => { ok: boolean; error?: string; version?: number };
  deletePurchaseOrder: (id: string) => void;
  /**
   * B5 门户回写：供应商门户确认订单后，将主系统采购订单状态推进为 'vendorConfirmed'。
   * 幂等守卫：已是 vendorConfirmed/confirmed/received/closed/cancelled 则不重复回写。
   */
  confirmOrderByVendor: (poId: string, info: { vendorId: string; operator?: string; note?: string; confirmedDeliveryDate?: string }) => boolean;

  // Quote CRUD
  addVendorQuote: (quote: VendorQuote) => void;
  updateVendorQuote: (id: string, updates: Partial<VendorQuote>) => void;
  deleteVendorQuote: (id: string) => void;

  // Setters
  setPurchaseRequests: (requests: PurchaseRequest[]) => void;
  setPurchaseOrders: (orders: PurchaseOrder[]) => void;
  setVendorQuotes: (quotes: VendorQuote[]) => void;
  /** W1 根治双通道：从 D1 purchase_orders 拉取（在线）。空库首次从 legacy Blob / mock 回填一次。 */
  loadPurchaseOrders: () => Promise<void>;
  setFilter: (filter: PurchaseFilter) => void;
  resetFilter: () => void;
  setSelectedRequest: (request: PurchaseRequest | null) => void;
  setSelectedOrder: (order: PurchaseOrder | null) => void;
}

const initialFilter: PurchaseFilter = {};

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      // 启动时直接加载 Mock 数据；persist 在刷新后优先用 localStorage 实际数据
      purchaseRequests: [...mockPurchaseRequests],
      purchaseOrders: [...mockPurchaseOrders],
      vendorQuotes: [...mockVendorQuotes],
      filter: initialFilter,
      selectedRequest: null,
      selectedOrder: null,

      // Request CRUD
      addPurchaseRequest: (request) =>
        set((state) => ({ purchaseRequests: [...state.purchaseRequests, request] })),

      updatePurchaseRequest: (id, updates) =>
        set((state) => ({
          purchaseRequests: state.purchaseRequests.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      deletePurchaseRequest: (id) =>
        set((state) => ({
          purchaseRequests: state.purchaseRequests.filter((r) => r.id !== id),
        })),

      // Order CRUD
      addPurchaseOrder: async (order) => {
        // 乐观更新：先入内存，再写 D1
        set((state) => ({ purchaseOrders: [order, ...state.purchaseOrders] }));
        try {
          const created = await purchaseApi.createPurchaseOrder(order as any);
          const mapped = rowToPurchaseOrder(created);
          if (mapped?.id && mapped.id !== order.id) {
            set((state) => ({
              purchaseOrders: state.purchaseOrders.map((o) => (o.id === order.id ? mapped : o)),
            }));
          }
        } catch {
          /* 写失败：保留内存态（离线容忍） */
        }
      },

      updatePurchaseOrder: async (id, updates) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        }));
        try {
          await purchaseApi.updatePurchaseOrder(id, updates as any);
        } catch {
          /* 写失败：保留内存态 */
        }
      },

      confirmOrderByVendor: (poId, info) => {
        let ok = false;
        set((state) => {
          const po = state.purchaseOrders.find((o) => o.id === poId);
          if (!po) return {};
          // 幂等守卫：终态或已确认不再回写
          if (
            po.status === 'vendorConfirmed' ||
            po.status === 'confirmed' ||
            po.status === 'received' ||
            po.status === 'closed' ||
            po.status === 'cancelled'
          ) {
            ok = true; // 视为已处理成功，避免门户重复提交报错
            return {};
          }
          ok = true;
          return {
            purchaseOrders: state.purchaseOrders.map((o) =>
              o.id === poId
                ? {
                    ...o,
                    status: 'vendorConfirmed',
                    confirmedBy: info.operator || info.vendorId,
                    confirmedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    confirmedNote: info.note,
                    // B5: 供应商确认交期（独立列，不修改原expectedDeliveryDate）
                    vendorConfirmedDate: info.confirmedDeliveryDate || o.expectedDeliveryDate,
                  }
                : o
            ),
          };
        });
        // 根治双通道：供应商确认状态经 PUT 落真实 D1（fire-and-forget，写失败保留内存态）
        if (ok) {
          purchaseApi.updatePurchaseOrder(poId, {
            status: 'vendorConfirmed',
            confirmedBy: info.operator || info.vendorId,
            confirmedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            confirmedNote: info.note,
            vendorConfirmedDate: info.confirmedDeliveryDate,
          } as any).catch(() => {});
        }
        return ok;
      },

      // ── B10 采购订单变更单：版本留痕，非原地修改 ──────────────
      changePurchaseOrder: (id, updates, reason, changedBy = 'admin') => {
        let result: { ok: boolean; error?: string; version?: number } = { ok: false };
        set((state) => {
          const po = state.purchaseOrders.find((o) => o.id === id);
          if (!po) {
            result = { ok: false, error: '采购订单不存在' };
            return {};
          }
          // 锁定规则：已收货（有累计收货量或收货态）或终态禁止变更
          const locked =
            (po.deliveredQuantity || 0) > 0 ||
            po.status === 'received' ||
            po.status === 'closed' ||
            po.status === 'cancelled';
          if (locked) {
            result = { ok: false, error: '订单已收货或已结束，禁止变更' };
            return {};
          }
          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const curVersion = po.version || 1;
          // 快照当前关键字段入历史（最新在前），支撑差异对比与审计
          const historyEntry: PurchaseOrderVersion = {
            version: curVersion,
            changedAt: now,
            changedBy,
            changeReason: reason || '未填写变更原因',
            snapshot: {
              expectedDeliveryDate: po.expectedDeliveryDate,
              items: po.items,
              totalAmount: po.totalAmount,
              paymentTerms: po.paymentTerms,
              tradeTerms: po.tradeTerms,
              deliveryAddress: po.deliveryAddress,
              remarks: po.remarks,
            },
          };
          result = { ok: true, version: curVersion + 1 };
          return {
            purchaseOrders: state.purchaseOrders.map((o) =>
              o.id === id
                ? {
                    ...o,
                    ...updates,
                    version: curVersion + 1,
                    history: [historyEntry, ...(o.history || [])],
                  }
                : o
            ),
          };
        });
        // 根治双通道：B10 版本留痕经 PUT 落真实 D1（fire-and-forget，写失败保留内存态）
        if (result.ok) {
          const po = get().purchaseOrders.find((o) => o.id === id);
          if (po) {
            purchaseApi.updatePurchaseOrder(id, { ...updates, version: po.version, history: po.history } as any).catch(() => {});
          }
        }
        return result;
      },

      deletePurchaseOrder: async (id) => {
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter((o) => o.id !== id),
        }));
        try {
          await purchaseApi.deletePurchaseOrder(id);
        } catch {
          /* 写失败：保留内存态 */
        }
      },

      // ── W1 根治双通道：采购订单切片直连 D1 ──────────────
      loadPurchaseOrders: async () => {
        try {
          const res = await purchaseApi.getPurchaseOrders({ page: 1, pageSize: 200 });
          const orders = (res?.data || []).map(rowToPurchaseOrder);
          set({ purchaseOrders: orders });
          // 首次空库：从 legacy app_state / mockPurchaseOrders 回填一次，消除双源过渡缺口
          if (orders.length === 0 && !window.localStorage.getItem(BACKFILL_FLAG)) {
            window.localStorage.setItem(BACKFILL_FLAG, '1');
            const legacy = readLegacyPurchaseOrders();
            const seed = legacy.length ? legacy : [...mockPurchaseOrders];
            for (const o of seed) {
              try { await purchaseApi.createPurchaseOrder(o as any); } catch { /* 单号冲突等忽略，回填尽力而为 */ }
            }
            const refreshed = await purchaseApi.getPurchaseOrders({ page: 1, pageSize: 200 });
            set({ purchaseOrders: (refreshed?.data || []).map(rowToPurchaseOrder) });
          }
        } catch {
          /* 离线/未登录/接口异常：保持内存 mockPurchaseOrders，不阻断 UI */
        }
      },

      // Quote CRUD
      addVendorQuote: (quote) =>
        set((state) => ({ vendorQuotes: [...state.vendorQuotes, quote] })),

      updateVendorQuote: (id, updates) =>
        set((state) => ({
          vendorQuotes: state.vendorQuotes.map((q) =>
            q.id === id ? { ...q, ...updates } : q
          ),
        })),

      deleteVendorQuote: (id) =>
        set((state) => ({
          vendorQuotes: state.vendorQuotes.filter((q) => q.id !== id),
        })),

      // Setters
      setPurchaseRequests: (requests) => set({ purchaseRequests: requests }),
      setPurchaseOrders: (orders) => set({ purchaseOrders: orders }),
      setVendorQuotes: (quotes) => set({ vendorQuotes: quotes }),
      setFilter: (filter) => set({ filter }),
      resetFilter: () => set({ filter: initialFilter }),
      setSelectedRequest: (request) => set({ selectedRequest: request }),
      setSelectedOrder: (order) => set({ selectedOrder: order }),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-purchase',
      version: 2,
      // 只持久化业务数据，UI 态（筛选/选中）不落盘
      partialize: (state) => ({
        // 仅持久化无 D1 后端的切片；purchaseOrders 已迁 D1，不再写 app_state Blob（根治双通道）
        purchaseRequests: state.purchaseRequests,
        vendorQuotes: state.vendorQuotes,
      }),
      /**
       * v1 → v2（A2 税价拆分）：为存量采购订单回填币种与行级税字段。
       * 约定存量单价按「未税」解读，因此 totalAmount 保持原值，仅新增 税额/价税合计。
       */
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted || {}) as { purchaseOrders?: PurchaseOrder[] };
        if (version < 2 && Array.isArray(state.purchaseOrders)) {
          return {
            ...state,
            purchaseOrders: state.purchaseOrders.map((o) => normalizeOrderTax(o as any)),
          };
        }
        return state;
      },
    }
  )
);
