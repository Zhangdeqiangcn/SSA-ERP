import { create } from 'zustand';
import { entityRepo } from '@/services/entityRepo';
import { isAuthed } from '@/services/b2Api';
import { PriceInquiry, VendorQuotation, PriceComparison, PriceApproval, PriceListItem, PriceApprovalRecord } from '@/types';
import {
  priceInquiries as mockPriceInquiries,
  vendorQuotations as mockVendorQuotations,
  priceComparisons as mockPriceComparisons,
  priceApprovals as mockPriceApprovals,
  priceList as mockPriceList,
} from '@/mocks/data/price';
import { useMaterialStore } from '@/stores/materialStore';
import { parsePayload, writeRow } from './entityBackedShared';

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

  /** V3.77.0：从 D1 水合（5 个资源分别拉取，各自空则回填种子） */
  hydratePrice: () => Promise<void>;
}

const INQ_RES = 'priceInquiry';
const QUO_RES = 'priceQuotation';
const CMP_RES = 'priceComparison';
const APR_RES = 'priceApproval';
const LST_RES = 'priceList';

const addArr = <T,>(list: T[], item: T) => [...list, item];
const updateArr = <T extends { id: string }>(list: T[], id: string, u: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...u } : x));
const deleteArr = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const usePriceStore = create<PriceState>()((set, get) => ({
  priceInquiries: [...mockPriceInquiries],
  vendorQuotations: [...mockVendorQuotations],
  priceComparisons: [...mockPriceComparisons],
  priceApprovals: [...mockPriceApprovals],
  priceList: [...mockPriceList],

  // Inquiry
  addPriceInquiry: (inquiry) => {
    set((s) => ({ priceInquiries: addArr(s.priceInquiries, inquiry) }));
    if (isAuthed()) writeRow(INQ_RES, inquiry.id, inquiry);
  },
  updatePriceInquiry: (id, u) => {
    let updated: PriceInquiry | undefined;
    set((s) => ({ priceInquiries: s.priceInquiries.map((x) => { if (x.id !== id) return x; updated = { ...x, ...u }; return updated; }) }));
    if (updated && isAuthed()) writeRow(INQ_RES, id, updated);
  },
  deletePriceInquiry: (id) => {
    set((s) => ({ priceInquiries: deleteArr(s.priceInquiries, id) }));
    if (isAuthed()) void entityRepo.remove(INQ_RES, id).catch(() => {});
  },

  // Quotation
  addVendorQuotation: (q) => {
    set((s) => ({ vendorQuotations: addArr(s.vendorQuotations, q) }));
    if (isAuthed()) writeRow(QUO_RES, q.id, q);
  },
  updateVendorQuotation: (id, u) => {
    let updated: VendorQuotation | undefined;
    set((s) => ({ vendorQuotations: s.vendorQuotations.map((x) => { if (x.id !== id) return x; updated = { ...x, ...u }; return updated; }) }));
    if (updated && isAuthed()) writeRow(QUO_RES, id, updated);
  },
  deleteVendorQuotation: (id) => {
    set((s) => ({ vendorQuotations: deleteArr(s.vendorQuotations, id) }));
    if (isAuthed()) void entityRepo.remove(QUO_RES, id).catch(() => {});
  },

  // Comparison
  addPriceComparison: (c) => {
    set((s) => ({ priceComparisons: addArr(s.priceComparisons, c) }));
    if (isAuthed()) writeRow(CMP_RES, c.id, c);
  },
  updatePriceComparison: (id, u) => {
    let updated: PriceComparison | undefined;
    set((s) => ({ priceComparisons: s.priceComparisons.map((x) => { if (x.id !== id) return x; updated = { ...x, ...u }; return updated; }) }));
    if (updated && isAuthed()) writeRow(CMP_RES, id, updated);
  },
  deletePriceComparison: (id) => {
    set((s) => ({ priceComparisons: deleteArr(s.priceComparisons, id) }));
    if (isAuthed()) void entityRepo.remove(CMP_RES, id).catch(() => {});
  },

  // Approval
  addPriceApproval: (a) => {
    set((s) => ({ priceApprovals: addArr(s.priceApprovals, a) }));
    if (isAuthed()) writeRow(APR_RES, a.id, a);
  },
  updatePriceApproval: (id, u) => {
    let updated: PriceApproval | undefined;
    set((s) => ({ priceApprovals: s.priceApprovals.map((x) => { if (x.id !== id) return x; updated = { ...x, ...u }; return updated; }) }));
    if (updated && isAuthed()) writeRow(APR_RES, id, updated);
  },
  deletePriceApproval: (id) => {
    set((s) => ({ priceApprovals: deleteArr(s.priceApprovals, id) }));
    if (isAuthed()) void entityRepo.remove(APR_RES, id).catch(() => {});
  },
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
        writtenBack: true,
        syncedAt: now,
        // P1-14 版本层级链：指向上一版同物料 active 价目表项（历史价/协议价追溯），非破坏
        parentId: get().priceList.find((p) => p.materialId === it.materialId && p.status === 'active')?.id,
        erpPriceId: `ERP-${approval.id}-${it.materialId}`,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      }));
    const changedItems: PriceListItem[] = [];
    set((s) => {
      const existingKeys = new Set(s.priceList.map((p) => `${p.sourceApprovalId}|${p.materialId}`));
      const priceList = s.priceList.map((p) => {
        const key = `${p.sourceApprovalId}|${p.materialId}`;
        const hit = newItems.find((n) => `${n.sourceApprovalId}|${n.materialId}` === key);
        if (hit) {
          const updated = {
            ...p,
            writtenBack: true,
            syncedAt: hit.syncedAt,
            erpPriceId: hit.erpPriceId,
            status: 'active' as const,
            unitPrice: hit.unitPrice,
            vendorId: hit.vendorId,
            vendorName: hit.vendorName,
          };
          changedItems.push(updated);
          return updated;
        }
        return p;
      });
      const appended = newItems.filter((it) => !existingKeys.has(`${it.sourceApprovalId}|${it.materialId}`));
      changedItems.push(...appended);
      return {
        priceApprovals: s.priceApprovals.map((a) =>
          a.id === id ? { ...a, status: 'approved', approvalRecords: [...(a.approvalRecords || []), record] } : a
        ),
        priceList: [...priceList, ...appended],
      };
    });
    // 回写物料主数据标准价（不干预 A4 移动平均价核算，getUnitCost 优先级保证）
    newItems.forEach((it) => {
      useMaterialStore.getState().updateMaterial(it.materialId, { standardPrice: it.unitPrice });
    });
    if (isAuthed()) {
      const updatedApproval: PriceApproval = { ...approval, status: 'approved', approvalRecords: [...(approval.approvalRecords || []), record] };
      writeRow(APR_RES, id, updatedApproval);
      for (const it of changedItems) writeRow(LST_RES, it.id, it);
    }
  },

  // 价目表选择器（B6）
  getActivePrice: (vendorId, materialId) => {
    return get().priceList.find(
      (p) => p.vendorId === vendorId && p.materialId === materialId && p.status === 'active'
    );
  },

  // PriceList
  addPriceListItem: (item) => {
    set((s) => ({ priceList: addArr(s.priceList, item) }));
    if (isAuthed()) writeRow(LST_RES, item.id, item);
  },
  updatePriceListItem: (id, u) => {
    let updated: PriceListItem | undefined;
    set((s) => ({ priceList: s.priceList.map((x) => { if (x.id !== id) return x; updated = { ...x, ...u }; return updated; }) }));
    if (updated && isAuthed()) writeRow(LST_RES, id, updated);
  },
  setPriceList: (list) => {
    set({ priceList: list });
    if (isAuthed()) for (const it of list) writeRow(LST_RES, it.id, it);
  },

  hydratePrice: async () => {
    if (!isAuthed()) return;
    try {
      const [inq, quo, cmp, apr, lst] = await Promise.all([
        entityRepo.list<PriceInquiry>(INQ_RES, { page: 1, pageSize: 500 }),
        entityRepo.list<VendorQuotation>(QUO_RES, { page: 1, pageSize: 500 }),
        entityRepo.list<PriceComparison>(CMP_RES, { page: 1, pageSize: 500 }),
        entityRepo.list<PriceApproval>(APR_RES, { page: 1, pageSize: 500 }),
        entityRepo.list<PriceListItem>(LST_RES, { page: 1, pageSize: 500 }),
      ]);
      const inqRows = parsePayload<PriceInquiry>(inq?.data || []);
      const quoRows = parsePayload<VendorQuotation>(quo?.data || []);
      const cmpRows = parsePayload<PriceComparison>(cmp?.data || []);
      const aprRows = parsePayload<PriceApproval>(apr?.data || []);
      const lstRows = parsePayload<PriceListItem>(lst?.data || []);

      // 各自空则回填种子
      if (inqRows.length === 0) { for (const x of mockPriceInquiries) writeRow(INQ_RES, x.id, x); }
      if (quoRows.length === 0) { for (const x of mockVendorQuotations) writeRow(QUO_RES, x.id, x); }
      if (cmpRows.length === 0) { for (const x of mockPriceComparisons) writeRow(CMP_RES, x.id, x); }
      if (aprRows.length === 0) { for (const x of mockPriceApprovals) writeRow(APR_RES, x.id, x); }
      if (lstRows.length === 0) { for (const x of mockPriceList) writeRow(LST_RES, x.id, x); }

      const refill = async () => {
        const [r1, r2, r3, r4, r5] = await Promise.all([
          entityRepo.list<PriceInquiry>(INQ_RES, { page: 1, pageSize: 500 }),
          entityRepo.list<VendorQuotation>(QUO_RES, { page: 1, pageSize: 500 }),
          entityRepo.list<PriceComparison>(CMP_RES, { page: 1, pageSize: 500 }),
          entityRepo.list<PriceApproval>(APR_RES, { page: 1, pageSize: 500 }),
          entityRepo.list<PriceListItem>(LST_RES, { page: 1, pageSize: 500 }),
        ]);
        return {
          priceInquiries: parsePayload<PriceInquiry>(r1?.data || []),
          vendorQuotations: parsePayload<VendorQuotation>(r2?.data || []),
          priceComparisons: parsePayload<PriceComparison>(r3?.data || []),
          priceApprovals: parsePayload<PriceApproval>(r4?.data || []),
          priceList: parsePayload<PriceListItem>(r5?.data || []),
        };
      };

      if (inqRows.length && quoRows.length && cmpRows.length && aprRows.length && lstRows.length) {
        set({ priceInquiries: inqRows, vendorQuotations: quoRows, priceComparisons: cmpRows, priceApprovals: aprRows, priceList: lstRows });
      } else {
        const r = await refill();
        set({
          priceInquiries: r.priceInquiries.length ? r.priceInquiries : [...mockPriceInquiries],
          vendorQuotations: r.vendorQuotations.length ? r.vendorQuotations : [...mockVendorQuotations],
          priceComparisons: r.priceComparisons.length ? r.priceComparisons : [...mockPriceComparisons],
          priceApprovals: r.priceApprovals.length ? r.priceApprovals : [...mockPriceApprovals],
          priceList: r.priceList.length ? r.priceList : [...mockPriceList],
        });
      }
    } catch {
      // 离线/异常：保留本地种子态
    }
  },
}));

// 模块加载即自动水合（未登录/离线静默兜底）
void usePriceStore.getState().hydratePrice();
