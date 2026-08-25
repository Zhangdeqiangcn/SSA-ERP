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
      addSalesOrder: (order) => set((s) => ({ salesOrders: addArr(s.salesOrders, order) })),
      updateSalesOrder: (id, u) => set((s) => ({ salesOrders: updateArr(s.salesOrders, id, u) })),
      deleteSalesOrder: (id) => set((s) => ({ salesOrders: deleteArr(s.salesOrders, id) })),

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
        salesOrders: state.salesOrders,
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
