import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { SourceListItem } from '@/types';

const seedItems: SourceListItem[] = [
  {
    id: 'sl-001',
    materialId: 'mat-001',
    materialCode: 'MAT-001',
    materialName: '钢板',
    vendorId: 'cus-001',
    vendorName: '华润建筑',
    priority: 1,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    fixedVendor: false,
    quotaPercentage: 60,
    status: 'active',
    remarks: '主供应商',
  },
  {
    id: 'sl-002',
    materialId: 'mat-002',
    materialCode: 'MAT-002',
    materialName: '不锈钢管',
    vendorId: 'cus-002',
    vendorName: '长江船舶',
    priority: 2,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    fixedVendor: true,
    quotaPercentage: 100,
    status: 'active',
    remarks: '固定货源',
  },
  {
    id: 'sl-003',
    materialId: 'mat-003',
    materialCode: 'MAT-003',
    materialName: '角钢',
    vendorId: 'cus-003',
    vendorName: '新源机械',
    priority: 1,
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    fixedVendor: false,
    quotaPercentage: 40,
    status: 'active',
    remarks: '备选供应商',
  },
];

interface SourceListState {
  items: SourceListItem[];
  addItem: (item: SourceListItem) => void;
  updateItem: (id: string, patch: Partial<SourceListItem>) => void;
  deleteItem: (id: string) => void;
}

/**
 * 货源清单联动派生 selector（集中维护联动规则，供 OrderForm / 详情页统一消费）
 * ——避免各页面散落裸 getState().items 过滤逻辑，保证联动口径一致。
 */

/** 是否在有效期内：status=active 且 当前日期落在 [validFrom, validTo] 区间 */
export function isSourceInValidity(
  item: SourceListItem,
  today: string = new Date().toISOString().split('T')[0]
): boolean {
  if (item.status !== 'active') return false;
  if (item.validFrom && item.validFrom > today) return false;
  if (item.validTo && item.validTo < today) return false;
  return true;
}

/** 按物料查全部货源 */
export function getSourcesByMaterial(materialId: string): SourceListItem[] {
  return useSourceListStore.getState().items.filter((s) => s.materialId === materialId);
}

/** 按供应商查全部货源 */
export function getSourcesByVendor(vendorId: string): SourceListItem[] {
  return useSourceListStore.getState().items.filter((s) => s.vendorId === vendorId);
}

/** 取某供应商当前生效且在有效期内的货源，按优先级升序 */
export function getActiveSourcesByVendor(
  vendorId: string,
  today: string = new Date().toISOString().split('T')[0]
): SourceListItem[] {
  return getSourcesByVendor(vendorId)
    .filter((s) => isSourceInValidity(s, today))
    .sort((a, b) => a.priority - b.priority);
}

/** 取某物料当前生效且在有效期内的货源，按优先级升序 */
export function getActiveSourcesFor(
  materialId: string,
  today: string = new Date().toISOString().split('T')[0]
): SourceListItem[] {
  return getSourcesByMaterial(materialId)
    .filter((s) => isSourceInValidity(s, today))
    .sort((a, b) => a.priority - b.priority);
}

export const useSourceListStore = create<SourceListState>()(
  persist(
    (set) => ({
      items: [...seedItems],
      addItem: (item) =>
        set((state) => ({ items: [item, ...state.items] })),
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((r) =>
            r.id === id ? { ...r, ...patch } : r
          ),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((r) => r.id !== id),
        })),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-source-list',
      version: 1,
      partialize: (state) => ({ items: state.items }),
    }
  )
);
