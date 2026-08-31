import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import type { ConsignmentStock } from '@/types/purchase';

/**
 * 寄售库存 store（P2-06 增强）
 * 把原先硬编码在 ConsignmentStock 页面的寄售数据抽成独立持久化 store，
 * 避免刷新丢失，并为后续寄售消耗/补货/对账提供统一数据源。
 */

const seedRecords: ConsignmentStock[] = [
  {
    id: 'cs-001', vendorId: 'V001', vendorName: '宝钢股份', vendorCode: 'BG001',
    materialId: 'M001', materialCode: 'SPCC-1.0', materialName: '冷轧板 SPCC 1.0',
    specification: '1.0×1250×C', unit: '吨',
    agreedUnitPrice: 5200, consignedQty: 500, consumedQty: 320, balanceQty: 180,
    warehouseId: 'WH001', warehouseName: '原料仓A',
  },
  {
    id: 'cs-002', vendorId: 'V002', vendorName: '鞍钢集团', vendorCode: 'AG001',
    materialId: 'M002', materialCode: 'Q235B-2.0', materialName: '热轧卷 Q235B 2.0',
    specification: '2.0×1500×C', unit: '吨',
    agreedUnitPrice: 4800, consignedQty: 300, consumedQty: 120, balanceQty: 180,
    warehouseId: 'WH001', warehouseName: '原料仓A',
  },
  {
    id: 'cs-003', vendorId: 'V003', vendorName: '首钢集团', vendorCode: 'SG001',
    materialId: 'M003', materialCode: 'DX51D-0.8', materialName: '镀锌板 DX51D 0.8',
    specification: '0.8×1250×C', unit: '吨',
    agreedUnitPrice: 6200, consignedQty: 200, consumedQty: 80, balanceQty: 120,
    warehouseId: 'WH002', warehouseName: '原料仓B',
  },
];

export interface ConsignmentState {
  records: ConsignmentStock[];
  /** 消耗结算：增加已消耗数量、等量减少结存 */
  settleConsumption: (id: string, qty: number) => void;
  addRecord: (record: ConsignmentStock) => void;
  removeRecord: (id: string) => void;
  reset: () => void;
}

export const useConsignmentStore = create<ConsignmentState>()(
  persist(
    (set) => ({
      records: seedRecords,
      settleConsumption: (id, qty) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.id === id
              ? {
                  ...r,
                  consumedQty: r.consumedQty + qty,
                  balanceQty: Math.max(0, r.consignedQty - (r.consumedQty + qty)),
                }
              : r
          ),
        })),
      addRecord: (record) => set((s) => ({ records: [...s.records, record] })),
      removeRecord: (id) => set((s) => ({ records: s.records.filter((r) => r.id !== id) })),
      reset: () => set({ records: seedRecords }),
    }),
    {
      storage: backendStorage,
      name: 'ssa-erp-consignment',
      version: 1,
      partialize: (state) => ({ records: state.records }),
    }
  )
);
