import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { PriceInquiry, VendorQuotation, PriceComparison, PriceApproval, PriceListItem, PriceApprovalRecord } from '@/types';
import {
  priceInquiries as mockPriceInquiries,
  vendorQuotations as mockVendorQuotations,
  priceComparisons as mockPriceComparisons,
  priceApprovals as mockPriceApprovals,
  priceList as mockPriceList,
} from '@/mocks/data/price';
import { useMaterialStore } from '@/stores/materialStore';

interface PriceState {
  priceInquiries: PriceInquiry[];
  vendorQuotations: VendorQuotation[];
  priceComparisons: PriceComparison[];
  priceApprovals: PriceApproval[];
  priceList: PriceListItem[];

  // Inquiry CRUD
  addPriceInquiry: (inquiry: PriceInquiry) => void;
  updatePriceInquiry: (id: string, updates: Partial<PriceInquiry>) => void;
  deletePriceInquiry: (id: string) => void;

  // Quotation CRUD
  addVendorQuotation: (q: VendorQuotation) => void;
  updateVendorQuotation: (id: string, updates: Partial<VendorQuotation>) => void;
  deleteVendorQuotation: (id: string) => void;

  // Comparison CRUD
  addPriceComparison: (c: PriceComparison) => void;
  updatePriceComparison: (id: string, updates: Partial<PriceComparison>) => void;
  deletePriceComparison: (id: string) => void;

  // Approval CRUD
  addPriceApproval: (a: PriceApproval) => void;
  updatePriceApproval: (id: string, updates: Partial<PriceApproval>) => void;
  deletePriceApproval: (id: string) => void;
  // 审批通过 → 事件驱动自动生成价目表（下游单）
  approvePriceApproval: (id: string, record: PriceApprovalRecord) => void;
  // 价目表选择器（B6：按供应商+物料取有效价目表价）
  getActivePrice: (vendorId: string, materialId: string) => PriceListItem | undefined;

  // PriceList
  addPriceListItem: (item: PriceListItem) => void;
  updatePriceListItem: (id: string, updates: Partial<PriceListItem>) => void;
  setPriceList: (list: PriceListItem[]) => void;
}

const addArr = <T,>(setter: (v: T[]) => void, list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(setter: (v: T[]) => void, list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(setter: (v: T[]) => void, list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const usePriceStore = create<PriceState>()(
  persist(
    (set, get) => ({
      priceInquiries: [...mockPriceInquiries],
      vendorQuotations: [...mockVendorQuotations],
      priceComparisons: [...mockPriceComparisons],
      priceApprovals: [...mockPriceApprovals],
      priceList: [...mockPriceList],

      // Inquiry
      addPriceInquiry: (inquiry) => set((s) => ({ priceInquiries: addArr(set, s.priceInquiries, inquiry) })),
      updatePriceInquiry: (id, u) => set((s) => ({ priceInquiries: updateArr(set, s.priceInquiries, id, u) })),
      deletePriceInquiry: (id) => set((s) => ({ priceInquiries: deleteArr(set, s.priceInquiries, id) })),

      // Quotation
      addVendorQuotation: (q) => set((s) => ({ vendorQuotations: addArr(set, s.vendorQuotations, q) })),
      updateVendorQuotation: (id, u) => set((s) => ({ vendorQuotations: updateArr(set, s.vendorQuotations, id, u) })),
      deleteVendorQuotation: (id) => set((s) => ({ vendorQuotations: deleteArr(set, s.vendorQuotations, id) })),

      // Comparison
      addPriceComparison: (c) => set((s) => ({ priceComparisons: addArr(set, s.priceComparisons, c) })),
      updatePriceComparison: (id, u) => set((s) => ({ priceComparisons: updateArr(set, s.priceComparisons, id, u) })),
      deletePriceComparison: (id) => set((s) => ({ priceComparisons: deleteArr(set, s.priceComparisons, id) })),

      // Approval
      addPriceApproval: (a) => set((s) => ({ priceApprovals: addArr(set, s.priceApprovals, a) })),
      updatePriceApproval: (id, u) => set((s) => ({ priceApprovals: updateArr(set, s.priceApprovals, id, u) })),
      deletePriceApproval: (id) => set((s) => ({ priceApprovals: deleteArr(set, s.priceApprovals, id) })),
      // 审批通过 → 自动生成价目表（事件驱动）+ 回写物料主数据标准价（B6）
      approvePriceApproval: (id, record) => {
        const approval = get().priceApprovals.find((a) => a.id === id);
        if (!approval || approval.status === 'approved') return;
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const newItems: PriceListItem[] = approval.items
          .filter((it) => it.selectedVendorId)
          .map((it) => ({
            id: `pl-${approval.id}-${it.materialId}`,
            materialId: it.materialId,
            materialCode: it.materialCode,
            materialName: it.materialName,
            specification: it.specification,
            unit: it.unit,
            vendorId: it.selectedVendorId,
            vendorName: it.selectedVendorName,
            unitPrice: it.selectedUnitPrice,
            currency: approval.currency || 'CNY',
            effectiveDate: approval.applicationDate || new Date().toISOString().slice(0, 10),
            sourceApprovalId: approval.id,
            sourceApprovalNo: approval.approvalNo,
            paymentTerms: it.paymentTerms,
            deliveryDays: it.deliveryDays,
            status: 'active' as const,
            // B6：审批通过即标记回写主数据
            writtenBack: true,
            syncedAt: now,
            erpPriceId: `ERP-${approval.id}-${it.materialId}`,
          }));
        // 回写物料主数据标准价（不干预 A4 移动平均价核算，getUnitCost 优先级保证）
        newItems.forEach((it) => {
          useMaterialStore.getState().updateMaterial(it.materialId, { standardPrice: it.unitPrice });
        });
        set((s) => {
          const existingKeys = new Set(s.priceList.map((p) => `${p.sourceApprovalId}|${p.materialId}`));
          // 已存在同键价目表项（如种子 pl-001 对应 pa-001）→ 覆盖回写标记，不重复追加
          const priceList = s.priceList.map((p) => {
            const key = `${p.sourceApprovalId}|${p.materialId}`;
            const hit = newItems.find((n) => `${n.sourceApprovalId}|${n.materialId}` === key);
            return hit
              ? {
                  ...p,
                  writtenBack: true,
                  syncedAt: hit.syncedAt,
                  erpPriceId: hit.erpPriceId,
                  status: 'active' as const,
                  unitPrice: hit.unitPrice,
                  vendorId: hit.vendorId,
                  vendorName: hit.vendorName,
                }
              : p;
          });
          // 审批单未产生过的价目表项 → 新增
          const appended = newItems.filter((it) => !existingKeys.has(`${it.sourceApprovalId}|${it.materialId}`));
          return {
            priceApprovals: s.priceApprovals.map((a) =>
              a.id === id ? { ...a, status: 'approved', approvalRecords: [...(a.approvalRecords || []), record] } : a
            ),
            priceList: [...priceList, ...appended],
          };
        });
      },

      // 价目表选择器（B6）
      getActivePrice: (vendorId, materialId) => {
        return get().priceList.find(
          (p) => p.vendorId === vendorId && p.materialId === materialId && p.status === 'active'
        );
      },

      // PriceList
      addPriceListItem: (item) => set((s) => ({ priceList: addArr(set, s.priceList, item) })),
      updatePriceListItem: (id, u) => set((s) => ({ priceList: updateArr(set, s.priceList, id, u) })),
      setPriceList: (list) => set({ priceList: list }),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-price',
      version: 1,
      partialize: (state) => ({
        priceInquiries: state.priceInquiries,
        vendorQuotations: state.vendorQuotations,
        priceComparisons: state.priceComparisons,
        priceApprovals: state.priceApprovals,
        priceList: state.priceList,
      }),
    }
  )
);
