import { create } from 'zustand';
import { Material, MaterialCategory, MaterialFilter } from '@/types';
import { materials as mockMaterials, materialCategories as mockCategories } from '@/mocks/data/material';
import { normalizeMaterialCost } from '@/utils/cost';
import { materialApi } from '@/services/material';

// V2.74.5：物料主数据改为直连 D1 materials（与开放网关 /api/open/materials 同源）。
// 移除原 backendStorage(app_state Blob) 持久化——app_state 不再是物料来源，消除双数据源。
// 在线时：loadMaterials 从 /api/materials 拉取，增删改经 materialApi 写回 materials。
// 离线/未登录/接口异常：回退内存中的 mockMaterials，保证页面可用（不阻塞业务）。
// 物料分类(categories)为固定 taxonomy，保留内存 mock，不经过 Blob/API。

const BACKFILL_FLAG = 'ssa-erp-material-backfilled';

/** 递归遍历分类树，按 id 查找分类（含子节点） */
export const findCategoryById = (
  cats: MaterialCategory[],
  id: string
): MaterialCategory | null => {
  for (const c of cats) {
    if (c.id === id) return c;
    if (c.children?.length) {
      const found = findCategoryById(c.children, id);
      if (found) return found;
    }
  }
  return null;
};

// 从旧 app_state 持久化键（V2.74.4 及以前）取出物料，做一次性回填；不存在则退回 mockMaterials。
function readLegacyMaterials(): Material[] {
  try {
    const raw = window.localStorage.getItem('ssa-erp-material');
    if (raw) {
      const parsed = JSON.parse(raw);
      const st = parsed?.state;
      if (st?.materials && Array.isArray(st.materials) && st.materials.length) return st.materials as Material[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

interface MaterialState {
  materials: Material[];
  categories: MaterialCategory[];
  selectedCategory: string | null;
  filter: MaterialFilter;
  setSelectedCategory: (categoryId: string | null) => void;
  setFilter: (filter: MaterialFilter) => void;
  resetFilter: () => void;
  addMaterial: (material: Material) => Promise<void>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  resetMaterials: () => void;
  setCategories: (categories: MaterialCategory[]) => void;
  /** 按 id 递归查找分类（含子节点），找不到返回 null */
  getCategoryById: (id: string) => MaterialCategory | null;
  /** V2.74.5：从 D1 materials 拉取（在线）。失败回退内存 mockMaterials。首次空库做一次 legacy 回填。 */
  loadMaterials: () => Promise<void>;
}

const initialFilter: MaterialFilter = {};

export const useMaterialStore = create<MaterialState>()((set, get) => ({
  // 启动时先用 Mock 数据保证首屏可用；登录后 loadMaterials 会用 D1 数据覆盖
  materials: mockMaterials.map(normalizeMaterialCost),
  categories: [...mockCategories],
  selectedCategory: null,
  filter: initialFilter,

  setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
  setFilter: (filter) => set({ filter }),
  resetFilter: () => set({ filter: initialFilter, selectedCategory: null }),

  loadMaterials: async () => {
    try {
      const res = await materialApi.getMaterials({ page: 1, pageSize: 200 });
      const list = (res?.data || []) as Material[];
      set({ materials: list.map(normalizeMaterialCost) });
      // 首次空库：从 legacy app_state / mockMaterials 回填一次，消除双源过渡缺口
      if (list.length === 0 && !window.localStorage.getItem(BACKFILL_FLAG)) {
        window.localStorage.setItem(BACKFILL_FLAG, '1');
        const legacy = readLegacyMaterials();
        const seed = legacy.length ? legacy : [...mockMaterials];
        for (const m of seed) {
          try {
            await materialApi.createMaterial({
              code: m.code, name: m.name, categoryId: m.categoryId, categoryName: m.categoryName,
              specification: m.specification, model: m.model, unit: m.unit, materialType: m.materialType,
              makeOrBuy: m.makeOrBuy, safetyStock: m.safetyStock, minStock: m.minStock, maxStock: m.maxStock,
              currentStock: m.currentStock, price: m.price, currency: m.currency, standardPrice: m.standardPrice,
              movingAvgPrice: m.movingAvgPrice, stockValue: m.stockValue, leadTime: m.leadTime, moq: m.moq, mpq: m.mpq,
              defaultVendorId: m.defaultVendorId, defaultVendorName: m.defaultVendorName, purchaseUnit: m.purchaseUnit,
              purchasingGroup: m.purchasingGroup, orderUnit: m.orderUnit, purchasingValueKey: m.purchasingValueKey,
              grProcessingDays: m.grProcessingDays, mrpType: m.mrpType, mrpController: m.mrpController, lotSize: m.lotSize,
              reorderPoint: m.reorderPoint, plannedDeliveryDays: m.plannedDeliveryDays, taxClassification: m.taxClassification,
              deliveryUnit: m.deliveryUnit, minOrderQty: m.minOrderQty, minDeliveryQty: m.minDeliveryQty,
              accountAssignmentGroup: m.accountAssignmentGroup, valuationClass: m.valuationClass, priceControl: m.priceControl,
              routing: m.routing, workCenter: m.workCenter, cycleTime: m.cycleTime, scrapRate: m.scrapRate,
              inspectionPoint: m.inspectionPoint, status: m.status, lifecycleStatus: m.lifecycleStatus,
              shelfLifeDays: m.shelfLifeDays, shelfLifeWarningDays: m.shelfLifeWarningDays, batchManaged: m.batchManaged,
              serialized: m.serialized, gtin: m.gtin, remarks: m.remarks, parameters: m.parameters, plantParams: m.plantParams,
              customFields: m.customFields,
            });
          } catch {
            /* 编码冲突等忽略，回填尽力而为 */
          }
        }
        // 回填后重新拉取，保证内存与 D1 一致
        const refreshed = await materialApi.getMaterials({ page: 1, pageSize: 200 });
        set({ materials: (refreshed?.data || []).map(normalizeMaterialCost) });
      }
    } catch {
      // 离线/未登录/接口异常：保持内存 mockMaterials，不阻断 UI
    }
  },

  addMaterial: async (material) => {
    // 乐观更新：先入内存，再写 D1
    set((state) => ({ materials: [material, ...state.materials] }));
    try {
      const created = await materialApi.createMaterial({
        code: material.code, name: material.name, categoryId: material.categoryId, categoryName: material.categoryName,
        specification: material.specification, model: material.model, unit: material.unit, materialType: material.materialType,
        makeOrBuy: material.makeOrBuy, safetyStock: material.safetyStock, minStock: material.minStock, maxStock: material.maxStock,
        currentStock: material.currentStock, price: material.price, currency: material.currency, standardPrice: material.standardPrice,
        movingAvgPrice: material.movingAvgPrice, stockValue: material.stockValue, leadTime: material.leadTime, moq: material.moq, mpq: material.mpq,
        defaultVendorId: material.defaultVendorId, defaultVendorName: material.defaultVendorName, purchaseUnit: material.purchaseUnit,
        purchasingGroup: material.purchasingGroup, orderUnit: material.orderUnit, purchasingValueKey: material.purchasingValueKey,
        grProcessingDays: material.grProcessingDays, mrpType: material.mrpType, mrpController: material.mrpController, lotSize: material.lotSize,
        reorderPoint: material.reorderPoint, plannedDeliveryDays: material.plannedDeliveryDays, taxClassification: material.taxClassification,
        deliveryUnit: material.deliveryUnit, minOrderQty: material.minOrderQty, minDeliveryQty: material.minDeliveryQty,
        accountAssignmentGroup: material.accountAssignmentGroup, valuationClass: material.valuationClass, priceControl: material.priceControl,
        routing: material.routing, workCenter: material.workCenter, cycleTime: material.cycleTime, scrapRate: material.scrapRate,
        inspectionPoint: material.inspectionPoint, status: material.status, lifecycleStatus: material.lifecycleStatus,
        shelfLifeDays: material.shelfLifeDays, shelfLifeWarningDays: material.shelfLifeWarningDays, batchManaged: material.batchManaged,
        serialized: material.serialized, gtin: material.gtin, remarks: material.remarks, parameters: material.parameters, plantParams: material.plantParams,
        customFields: material.customFields,
      });
      if (created?.id && created.id !== material.id) {
        set((state) => ({ materials: state.materials.map((m) => (m.id === material.id ? { ...m, id: created.id } : m)) }));
      }
    } catch {
      /* 写失败：保留内存态（离线容忍） */
    }
  },

  updateMaterial: async (id, updates) => {
    set((state) => ({
      materials: state.materials.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') } : m
      ),
    }));
    try {
      await materialApi.updateMaterial(id, updates);
    } catch {
      /* 写失败：保留内存态 */
    }
  },

  deleteMaterial: async (id) => {
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    }));
    try {
      await materialApi.deleteMaterial(id);
    } catch {
      /* 写失败：保留内存态 */
    }
  },

  // 恢复到初始 Mock 数据（调试用），仅内存态（不再持久化）
  resetMaterials: () => set({ materials: mockMaterials.map(normalizeMaterialCost) }),

  setCategories: (categories) => set({ categories }),

  getCategoryById: (id) => findCategoryById(get().categories, id),
}));
