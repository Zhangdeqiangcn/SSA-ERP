import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PurchaseRequest, PurchaseOrder, VendorQuote } from '@/types';
import { purchaseRequests as mockPurchaseRequests, purchaseOrders as mockPurchaseOrders, vendorQuotes as mockVendorQuotes } from '@/mocks/data/purchase';
import { normalizeOrderTax } from '@/utils/tax';

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
  deletePurchaseOrder: (id: string) => void;
  /**
   * B5 门户回写：供应商门户确认订单后，将主系统采购订单状态推进为 'vendorConfirmed'。
   * 幂等守卫：已是 vendorConfirmed/confirmed/received/closed/cancelled 则不重复回写。
   */
  confirmOrderByVendor: (poId: string, info: { vendorId: string; operator?: string; note?: string }) => boolean;

  // Quote CRUD
  addVendorQuote: (quote: VendorQuote) => void;
  updateVendorQuote: (id: string, updates: Partial<VendorQuote>) => void;
  deleteVendorQuote: (id: string) => void;

  // Setters
  setPurchaseRequests: (requests: PurchaseRequest[]) => void;
  setPurchaseOrders: (orders: PurchaseOrder[]) => void;
  setVendorQuotes: (quotes: VendorQuote[]) => void;
  setFilter: (filter: PurchaseFilter) => void;
  resetFilter: () => void;
  setSelectedRequest: (request: PurchaseRequest | null) => void;
  setSelectedOrder: (order: PurchaseOrder | null) => void;
}

const initialFilter: PurchaseFilter = {};

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set) => ({
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
      addPurchaseOrder: (order) =>
        set((state) => ({ purchaseOrders: [...state.purchaseOrders, order] })),

      updatePurchaseOrder: (id, updates) =>
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        })),

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
                  }
                : o
            ),
          };
        });
        return ok;
      },

      deletePurchaseOrder: (id) =>
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter((o) => o.id !== id),
        })),

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
    {
      name: 'ssa-erp-purchase',
      version: 2,
      // 只持久化业务数据，UI 态（筛选/选中）不落盘
      partialize: (state) => ({
        purchaseRequests: state.purchaseRequests,
        purchaseOrders: state.purchaseOrders,
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
            purchaseOrders: state.purchaseOrders.map((o) => normalizeOrderTax(o)),
          };
        }
        return state;
      },
    }
  )
);
