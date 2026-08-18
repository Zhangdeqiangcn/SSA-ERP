import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { Material, MaterialCategory, MaterialFilter } from '@/types';
import { materials as mockMaterials, materialCategories as mockCategories } from '@/mocks/data/material';
import { normalizeMaterialCost } from '@/utils/cost';

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

interface MaterialState {
  materials: Material[];
  categories: MaterialCategory[];
  selectedCategory: string | null;
  filter: MaterialFilter;
  setSelectedCategory: (categoryId: string | null) => void;
  setFilter: (filter: MaterialFilter) => void;
  resetFilter: () => void;
  addMaterial: (material: Material) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  resetMaterials: () => void;
  setCategories: (categories: MaterialCategory[]) => void;
  /** 按 id 递归查找分类（含子节点），找不到返回 null */
  getCategoryById: (id: string) => MaterialCategory | null;
}

const initialFilter: MaterialFilter = {};

export const useMaterialStore = create<MaterialState>()(
  persist(
    (set, get) => ({
      // 启动时直接加载 Mock 数据；persist 会在刷新后优先用 localStorage 中的实际数据覆盖
      // A4 成本核算：用 normalizeMaterialCost 补齐 movingAvgPrice / stockValue（金额≈数量×单价 恒成立）
      materials: mockMaterials.map(normalizeMaterialCost),
      categories: [...mockCategories],
      selectedCategory: null,
      filter: initialFilter,

      setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
      setFilter: (filter) => set({ filter }),
      resetFilter: () => set({ filter: initialFilter, selectedCategory: null }),

      addMaterial: (material) =>
        set((state) => ({ materials: [...state.materials, material] })),

      updateMaterial: (id, updates) =>
        set((state) => ({
          materials: state.materials.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      deleteMaterial: (id) =>
        set((state) => ({
          materials: state.materials.filter((m) => m.id !== id),
        })),

      // 恢复到初始 Mock 数据（调试用），会同步持久化
      resetMaterials: () => set({ materials: mockMaterials.map(normalizeMaterialCost) }),

      setCategories: (categories) => set({ categories }),

      getCategoryById: (id) => findCategoryById(get().categories, id),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-material',
      version: 1,
      // 只持久化业务数据，UI 态（选中分类/筛选）不落盘
      partialize: (state) => ({
        materials: state.materials,
        categories: state.categories,
      }),
    }
  )
);
