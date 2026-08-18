import { a2 as create, a3 as persist } from "./vendor-C0Ken1ns.js";
import { l as backendStorage } from "./index-hTLNcGoC.js";
import { g as generateMaterialCodeByCategory } from "./codeGenerator-DzlFgjvf.js";
const addItem = (setter, list, item) => [...list, item];
const updateItem = (setter, list, id, updates) => list.map((x) => x.id === id ? { ...x, ...updates } : x);
const deleteItem = (setter, list, id) => list.filter((x) => x.id !== id);
const useMaterialApprovalStore = create()(
  persist(
    (set) => ({
      materialApplications: [],
      addMaterialApplication: (a) => set((s) => ({ materialApplications: addItem(set, s.materialApplications, a) })),
      updateMaterialApplication: (id, u) => set((s) => ({ materialApplications: updateItem(set, s.materialApplications, id, u) })),
      deleteMaterialApplication: (id) => set((s) => ({ materialApplications: deleteItem(set, s.materialApplications, id) }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-material-approval",
      version: 1
    }
  )
);
function findCategory(nodes, id) {
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
function buildMaterialFromApplication(app, ctx) {
  const draft = app.draft;
  const code = draft.categoryId ? generateMaterialCodeByCategory(draft.categoryId, ctx.categories, ctx.existingCodes.map((c) => ({ code: c }))) : `M${Date.now()}`;
  const category = findCategory(ctx.categories, draft.categoryId);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: `mat-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    code,
    name: draft.name || "未命名物料",
    categoryId: draft.categoryId || "",
    categoryName: category == null ? void 0 : category.name,
    specification: draft.specification,
    model: draft.model,
    unit: draft.unit || "个",
    materialType: draft.materialType,
    makeOrBuy: draft.makeOrBuy,
    safetyStock: draft.safetyStock ?? 0,
    minStock: draft.minStock ?? 0,
    maxStock: draft.maxStock ?? 0,
    currentStock: 0,
    price: draft.price ?? 0,
    currency: draft.currency || "CNY",
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
    status: "active",
    remarks: draft.remarks,
    createdAt: now,
    updatedAt: now
  };
}
export {
  buildMaterialFromApplication as b,
  useMaterialApprovalStore as u
};
