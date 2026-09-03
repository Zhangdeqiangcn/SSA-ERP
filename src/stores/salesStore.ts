import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { SalesOrder, Prospect, Shipment, Project, MarketData } from '@/types';
import {
  salesOrders as mockSalesOrders,
  prospects as mockProspects,
  shipments as mockShipments,
  projects as mockProjects,
  marketData as mockMarketData,
} from '@/mocks/data/sales';
import { customers as mockCustomerSeed } from '@/mocks/data/customer';
import { salesApi } from '@/services/w1Api';
import { snakeToCamel } from '@/utils/case';

// W1 根治双通道：销售订单切片直连真实 D1 sales_orders（仅 salesOrders 迁 D1；
// prospects / shipments / projects / marketData 仍走 Blob，后端无对应写入端点）。
// 在线：loadSalesOrders 从 /api/sales-orders 拉取；增改经 salesApi 写回。
const BACKFILL_FLAG = 'ssa-erp-sales-backfilled';

function readLegacySalesOrders(): SalesOrder[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-sales');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.salesOrders && Array.isArray(st.salesOrders) && st.salesOrders.length) return st.salesOrders as SalesOrder[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function rowToSalesOrder(row: any): SalesOrder {
  return snakeToCamel(row) as SalesOrder;
}

interface SalesState {
  salesOrders: SalesOrder[];
  prospects: Prospect[];
  shipments: Shipment[];
  projects: Project[];
  marketData: MarketData[];

  // SalesOrder CRUD
  addSalesOrder: (order: SalesOrder) => void;
  updateSalesOrder: (id: string, updates: Partial<SalesOrder>) => void;
  deleteSalesOrder: (id: string) => void;
  /** W1 根治双通道：从 D1 sales_orders 拉取（在线）。空库首次从 legacy Blob / mock 回填一次。 */
  loadSalesOrders: () => Promise<void>;

  // Prospect CRUD
  addProspect: (prospect: Prospect) => void;
  updateProspect: (id: string, updates: Partial<Prospect>) => void;
  deleteProspect: (id: string) => void;

  // Shipment CRUD
  addShipment: (shipment: Shipment) => void;
  updateShipment: (id: string, updates: Partial<Shipment>) => void;
  deleteShipment: (id: string) => void;

  // Project CRUD
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useSalesStore = create<SalesState>()(
  persist(
    (set) => ({
      salesOrders: [...mockSalesOrders],
      prospects: [...mockProspects],
      shipments: [...mockShipments],
      projects: [...mockProjects],
      marketData: [...mockMarketData],

      // SalesOrder
      addSalesOrder: async (order) => {
        set((s) => ({ salesOrders: addArr(s.salesOrders, order) }));
        try {
          const created = await salesApi.createSalesOrder(order as any);
          const mapped = rowToSalesOrder(created);
          if (mapped?.id && mapped.id !== order.id) {
            set((s) => ({ salesOrders: s.salesOrders.map((o) => (o.id === order.id ? mapped : o)) }));
          }
        } catch {
          /* 写失败：保留内存态（离线容忍） */
        }
      },
      updateSalesOrder: async (id, u) => {
        set((s) => ({ salesOrders: updateArr(s.salesOrders, id, u) }));
        try {
          await salesApi.updateSalesOrder(id, u as any);
        } catch {
          /* 写失败：保留内存态 */
        }
      },
      deleteSalesOrder: async (id) => {
        set((s) => ({ salesOrders: deleteArr(s.salesOrders, id) }));
        try {
          await salesApi.deleteSalesOrder(id);
        } catch {
          /* 写失败：保留内存态 */
        }
      },
      loadSalesOrders: async () => {
        try {
          const res = await salesApi.getSalesOrders({ page: 1, pageSize: 200 });
          const orders = (res?.data || []).map(rowToSalesOrder);
          set({ salesOrders: orders });
          if (orders.length === 0 && !window.localStorage.getItem(BACKFILL_FLAG)) {
            window.localStorage.setItem(BACKFILL_FLAG, '1');
            const legacy = readLegacySalesOrders();
            const seed = legacy.length ? legacy : [...mockSalesOrders];
            for (const o of seed) {
              try { await salesApi.createSalesOrder(o as any); } catch { /* 单号冲突等忽略 */ }
            }
            const refreshed = await salesApi.getSalesOrders({ page: 1, pageSize: 200 });
            set({ salesOrders: (refreshed?.data || []).map(rowToSalesOrder) });
          }
        } catch {
          /* 离线/未登录/接口异常：保持内存 mockSalesOrders，不阻断 UI */
        }
      },

      // Prospect
      addProspect: (prospect) => set((s) => ({ prospects: addArr(s.prospects, prospect) })),
      updateProspect: (id, u) => set((s) => ({ prospects: updateArr(s.prospects, id, u) })),
      deleteProspect: (id) => set((s) => ({ prospects: deleteArr(s.prospects, id) })),

      // Shipment
      addShipment: (shipment) => set((s) => ({ shipments: addArr(s.shipments, shipment) })),
      updateShipment: (id, u) => set((s) => ({ shipments: updateArr(s.shipments, id, u) })),
      deleteShipment: (id) => set((s) => ({ shipments: deleteArr(s.shipments, id) })),

      // Project
      // 归一化：保证必填数组字段存在，避免脏数据导致详情页访问 undefined 崩溃
  addProject: (project) =>
    set((s) => ({
      projects: addArr(s.projects, {
        ...project,
        milestones: project.milestones || [],
        exceptions: project.exceptions || [],
      }),
    })),
      updateProject: (id, u) => set((s) => ({ projects: updateArr(s.projects, id, u) })),
      deleteProject: (id) => set((s) => ({ projects: deleteArr(s.projects, id) })),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-sales',
      version: 2,
      partialize: (state) => ({
        // 仅持久化无 D1 后端的切片；salesOrders 已迁 D1，不再写 app_state Blob（根治双通道）
        prospects: state.prospects,
        shipments: state.shipments,
        projects: state.projects,
        marketData: state.marketData,
      }),
      // A3 迁移：按 customerName 回填 customerId（名称与 customer 种子完全一致）
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted || {}) as { salesOrders?: SalesOrder[] };
        if (version < 2 && Array.isArray(state.salesOrders)) {
          const nameToId = new Map(mockCustomerSeed.map((c) => [c.name, c.id] as const));
          return {
            ...state,
            salesOrders: state.salesOrders.map((o) =>
              !o.customerId && o.customerName && nameToId.has(o.customerName)
                ? { ...o, customerId: nameToId.get(o.customerName) }
                : o
            ),
          };
        }
        return state;
      },
    }
  )
);
