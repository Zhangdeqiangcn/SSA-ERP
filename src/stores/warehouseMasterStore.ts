import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { Warehouse, WarehouseLocation, WarehouseType } from '@/types';

/**
 * 仓库 / 库位主数据（P2-2，替代各表单中的硬编码仓库名）
 * ------------------------------------------------------------
 * 统一管理仓库（含所属组织 orgId、仓库类型）与库位，供入库/出库/批次/成品入库/
 * 报检等表单以选择器方式读取，支持新增、改、删与启用停用。种子覆盖升级前
 * 以硬编码形式出现在业务数据中的 wh-001(主仓库)/wh-002(辅料仓库)，并补充
 * 成品仓库与华东组织仓库。
 */

const today = (): string => new Date().toISOString().slice(0, 10);

const mkLoc = (
  id: string,
  code: string,
  name: string,
  warehouseId: string,
  zone?: string
): WarehouseLocation => ({
  id,
  code,
  name,
  warehouseId,
  zone,
  createdAt: today(),
  updatedAt: today(),
  createdBy: 'system',
  updatedBy: 'system',
});

const seedWarehouses: Warehouse[] = [
  {
    id: 'wh-001',
    code: 'WH001',
    name: '主仓库',
    orgId: 'ORG-001',
    type: 'raw',
    address: '上海市浦东新区世纪大道 100 号 厂区A',
    manager: '赵磊',
    status: 'active',
    locations: [
      mkLoc('loc-001', 'A-01-01', 'A区-01排-01架', 'wh-001', 'A区'),
      mkLoc('loc-002', 'A-01-02', 'A区-01排-02架', 'wh-001', 'A区'),
      mkLoc('loc-003', 'A-02-01', 'A区-02排-01架', 'wh-001', 'A区'),
      mkLoc('loc-004', 'A-01-05', 'A区-01排-05架', 'wh-001', 'A区'),
      mkLoc('loc-005', 'A-03-02', 'A区-03排-02架', 'wh-001', 'A区'),
      mkLoc('loc-009', 'A-03-01', 'A区-03排-01架', 'wh-001', 'A区'),
      mkLoc('loc-006', 'B-01-01', 'B区-01排-01架', 'wh-001', 'B区'),
      mkLoc('loc-007', 'B-01-02', 'B区-01排-02架', 'wh-001', 'B区'),
      mkLoc('loc-008', 'B-01-03', 'B区-01排-03架', 'wh-001', 'B区'),
      mkLoc('loc-010', 'B-02-03', 'B区-02排-03架', 'wh-001', 'B区'),
      mkLoc('loc-011', 'B-02-04', 'B区-02排-04架', 'wh-001', 'B区'),
      mkLoc('loc-012', 'A-03-01', 'A区-03排-01架', 'wh-001', 'A区'),
    ],
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'wh-002',
    code: 'WH002',
    name: '辅料仓库',
    orgId: 'ORG-001',
    type: 'aux',
    manager: '孙倩',
    status: 'active',
    locations: [mkLoc('loc-020', 'C-01-01', 'C区-01排-01架', 'wh-002', 'C区')],
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'wh-003',
    code: 'WH003',
    name: '成品仓库',
    orgId: 'ORG-001',
    type: 'finished',
    manager: '周敏',
    status: 'active',
    locations: [mkLoc('loc-fg-01', 'FG-01-01', '成品区-01排-01架', 'wh-003', '成品区')],
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
  {
    id: 'wh-201',
    code: 'WH201',
    name: '华东原料库',
    orgId: 'ORG-002',
    type: 'raw',
    address: '江苏省苏州市工业园区星湖街 88 号',
    manager: '钱伟',
    status: 'active',
    locations: [mkLoc('loc-e-01', 'E-01-01', '华东-01排-01架', 'wh-201', '华东区')],
    createdAt: today(),
    updatedAt: today(),
    createdBy: 'system',
    updatedBy: 'system',
  },
];

interface WarehouseMasterState {
  warehouses: Warehouse[];
  addWarehouse: (w: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  updateWarehouse: (id: string, u: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  addLocation: (warehouseId: string, loc: Omit<WarehouseLocation, 'id' | 'warehouseId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  updateLocation: (warehouseId: string, locId: string, u: Partial<WarehouseLocation>) => void;
  deleteLocation: (warehouseId: string, locId: string) => void;
  resetWarehouses: () => void;
}

export const useWarehouseMasterStore = create<WarehouseMasterState>()(
  persist(
    (set) => ({
      warehouses: [...seedWarehouses],

      addWarehouse: (w) =>
        set((state) => ({
          warehouses: [
            ...state.warehouses,
            {
              ...w,
              id: `wh-${Date.now()}`,
              createdAt: today(),
              updatedAt: today(),
              createdBy: 'admin',
              updatedBy: 'admin',
            },
          ],
        })),

      updateWarehouse: (id, u) =>
        set((state) => ({
          warehouses: state.warehouses.map((x) =>
            x.id === id ? { ...x, ...u, updatedAt: today(), updatedBy: 'admin' } : x
          ),
        })),

      deleteWarehouse: (id) =>
        set((state) => ({ warehouses: state.warehouses.filter((x) => x.id !== id) })),

      addLocation: (warehouseId, loc) =>
        set((state) => ({
          warehouses: state.warehouses.map((w) =>
            w.id === warehouseId
              ? {
                  ...w,
                  locations: [
                    ...w.locations,
                    {
                      ...loc,
                      id: `loc-${Date.now()}`,
                      warehouseId,
                      createdAt: today(),
                      updatedAt: today(),
                      createdBy: 'admin',
                      updatedBy: 'admin',
                    },
                  ],
                  updatedAt: today(),
                  updatedBy: 'admin',
                }
              : w
          ),
        })),

      updateLocation: (warehouseId, locId, u) =>
        set((state) => ({
          warehouses: state.warehouses.map((w) =>
            w.id === warehouseId
              ? {
                  ...w,
                  locations: w.locations.map((l) =>
                    l.id === locId ? { ...l, ...u, updatedAt: today(), updatedBy: 'admin' } : l
                  ),
                  updatedAt: today(),
                  updatedBy: 'admin',
                }
              : w
          ),
        })),

      deleteLocation: (warehouseId, locId) =>
        set((state) => ({
          warehouses: state.warehouses.map((w) =>
            w.id === warehouseId
              ? {
                  ...w,
                  locations: w.locations.filter((l) => l.id !== locId),
                  updatedAt: today(),
                  updatedBy: 'admin',
                }
              : w
          ),
        })),

      resetWarehouses: () => set({ warehouses: [...seedWarehouses] }),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-warehouse-master',
      version: 1,
      partialize: (state) => ({ warehouses: state.warehouses }),
    }
  )
);

/** 按组织过滤可见仓库（沿用 matchOrg 软规则） */
export const selectWarehousesByOrg = (orgId?: string) => (w: Warehouse): boolean =>
  !w.orgId || !orgId || w.orgId === orgId;

export const WAREHOUSE_TYPE_LABELS: Record<WarehouseType, string> = {
  raw: '原料仓',
  finished: '成品仓',
  wip: '半成品仓',
  aux: '辅料仓',
  transit: '中转仓',
};
