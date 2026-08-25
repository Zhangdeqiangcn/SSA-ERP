import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { backendStorage } from './persistStorage';
import { Material, MaterialApplication } from '@/types';
import { generateMaterialCodeByCategory } from '@/utils/codeGenerator';

interface MaterialApprovalState {
  materialApplications: MaterialApplication[];
  addMaterialApplication: (a: MaterialApplication) => void;
  updateMaterialApplication: (id: string, updates: Partial<MaterialApplication>) => void;
  deleteMaterialApplication: (id: string) => void;
}

const addItem = <T,>(list: T[], item: T) => [...list, item];
const updateItem = <T extends { id: string }>(list: T[], id: string, updates: Partial<T>) =>
  list.map((x) => (x.id === id ? { ...x, ...updates } : x));
const deleteItem = <T extends { id: string }>(list: T[], id: string) =>
  list.filter((x) => x.id !== id);

export const useMaterialApprovalStore = create<MaterialApprovalState>()(
  persist(
    (set) => ({
      materialApplications: [],
      addMaterialApplication: (a) =>
        set((s) => ({ materialApplications: addItem(s.materialApplications, a) })),
      updateMaterialApplication: (id, u) =>
        set((s) => ({ materialApplications: updateItem(s.materialApplications, id, u) })),
      deleteMaterialApplication: (id) =>
        set((s) => ({ materialApplications: deleteItem(s.materialApplications, id) })),
    }),
    { storage: backendStorage,
    
      name: 'ssa-erp-material-approval',
      version: 1,
    }
  )
);

type CatNode = { id: string; code: string; parentId: string | null; name?: string; sequenceLength?: number; children?: CatNode[] };

function findCategory(nodes: CatNode[], id?: string): CatNode | null {
  if (!id) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findCategory(n.children, id);
      if (f) return f;
    }
  }
  return null;
}

/** 将审批通过的草稿转换为正式物料（生成编码、补齐默认值、状态 active） */
export function buildMaterialFromApplication(
  app: MaterialApplication,
  ctx: { categories: CatNode[]; existingCodes: string[] }
): Material {
  const draft = app.draft;
  const code = draft.categoryId
    ? generateMaterialCodeByCategory(draft.categoryId, ctx.categories as any, ctx.existingCodes.map(c => ({ code: c })))
    : `M${Date.now()}`;
  const category = findCategory(ctx.categories, draft.categoryId);
  const now = new Date().toISOString();
  return {
    id: `mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    code,
    name: draft.name || '未命名物料',
    categoryId: draft.categoryId || '',
    categoryName: category?.name,
    specification: draft.specification,
    model: draft.model,
    unit: draft.unit || '个',
    materialType: draft.materialType,
    makeOrBuy: draft.makeOrBuy,
    safetyStock: draft.safetyStock ?? 0,
    minStock: draft.minStock ?? 0,
    maxStock: draft.maxStock ?? 0,
    currentStock: 0,
    price: draft.price ?? 0,
    currency: draft.currency || 'CNY',
    leadTime: draft.leadTime,
    moq: draft.moq,
    mpq: draft.mpq,
    defaultVendorId: draft.defaultVendorId,
    defaultVendorName: draft.defaultVendorName,
    purchaseUnit: draft.purchaseUnit,
    unitConversion: draft.unitConversion,
    routing: draft.routing,
    workCenter: draft.workCenter,
    cycleTime: draft.cycleTime,
    scrapRate: draft.scrapRate,
    inspectionPoint: draft.inspectionPoint,
    status: 'active',
    remarks: draft.remarks,
    createdAt: now,
    updatedAt: now,
    createdBy: app.applicant || 'system',
    updatedBy: app.applicant || 'system',
  };
}
