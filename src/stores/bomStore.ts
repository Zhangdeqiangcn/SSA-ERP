import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BOMHeader, BOMItem } from '@/types/bom';
import {
  bomList as mockBomList,
  bomTreeData as mockBomTreeData,
} from '@/mocks/data/bom';

interface BOMState {
  bomList: BOMHeader[];
  bomTreeData: BOMItem[];
  selectedBOMId: string | null;

  addBOM: (bom: BOMHeader) => void;
  updateBOM: (id: string, updates: Partial<BOMHeader>) => void;
  deleteBOM: (id: string) => void;

  setBomTreeData: (data: BOMItem[]) => void;
  setSelectedBOM: (id: string | null) => void;
  getBOMById: (id: string) => BOMHeader | undefined;
  getBOMByProductCode: (productCode: string) => BOMHeader | undefined;
}

export const useBOMStore = create<BOMState>()(
  persist(
    (set, get) => ({
      bomList: [...mockBomList],
      bomTreeData: [...mockBomTreeData],
      selectedBOMId: null,

      addBOM: (bom) => set((state) => ({ bomList: [...state.bomList, bom] })),
      updateBOM: (id, updates) =>
        set((state) => ({
          bomList: state.bomList.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      deleteBOM: (id) =>
        set((state) => ({ bomList: state.bomList.filter((b) => b.id !== id) })),

      setBomTreeData: (data) => set({ bomTreeData: data }),
      setSelectedBOM: (id) => set({ selectedBOMId: id }),
      getBOMById: (id) => get().bomList.find((b) => b.id === id),
      getBOMByProductCode: (productCode) => {
        const list = get().bomList;
        return (
          list.find((b) => b.productCode === productCode && b.status === 'released') ||
          list.find((b) => b.productCode === productCode)
        );
      },
    }),
    {
      name: 'ssa-erp-bom',
      version: 1,
      partialize: (state) => ({
        bomList: state.bomList,
        bomTreeData: state.bomTreeData,
      }),
    }
  )
);
