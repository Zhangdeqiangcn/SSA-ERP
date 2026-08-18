import { a as create, p as persist } from "./vendor-DGU5TO-x.js";
import { l as backendStorage } from "./index-DeeqqmHA.js";
const seedItems = [
  {
    id: "sl-001",
    materialId: "mat-001",
    materialCode: "MAT-001",
    materialName: "钢板",
    vendorId: "cus-001",
    vendorName: "华润建筑",
    priority: 1,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    fixedVendor: false,
    quotaPercentage: 60,
    status: "active",
    remarks: "主供应商"
  },
  {
    id: "sl-002",
    materialId: "mat-002",
    materialCode: "MAT-002",
    materialName: "不锈钢管",
    vendorId: "cus-002",
    vendorName: "长江船舶",
    priority: 2,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    fixedVendor: true,
    quotaPercentage: 100,
    status: "active",
    remarks: "固定货源"
  },
  {
    id: "sl-003",
    materialId: "mat-003",
    materialCode: "MAT-003",
    materialName: "角钢",
    vendorId: "cus-003",
    vendorName: "新源机械",
    priority: 1,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    fixedVendor: false,
    quotaPercentage: 40,
    status: "active",
    remarks: "备选供应商"
  }
];
function isSourceInValidity(item, today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0]) {
  if (item.status !== "active") return false;
  if (item.validFrom && item.validFrom > today) return false;
  if (item.validTo && item.validTo < today) return false;
  return true;
}
function getSourcesByVendor(vendorId) {
  return useSourceListStore.getState().items.filter((s) => s.vendorId === vendorId);
}
function getActiveSourcesByVendor(vendorId, today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0]) {
  return getSourcesByVendor(vendorId).filter((s) => isSourceInValidity(s, today)).sort((a, b) => a.priority - b.priority);
}
const useSourceListStore = create()(
  persist(
    (set) => ({
      items: [...seedItems],
      addItem: (item) => set((state) => ({ items: [item, ...state.items] })),
      updateItem: (id, patch) => set((state) => ({
        items: state.items.map(
          (r) => r.id === id ? { ...r, ...patch } : r
        )
      })),
      deleteItem: (id) => set((state) => ({
        items: state.items.filter((r) => r.id !== id)
      }))
    }),
    {
      storage: backendStorage,
      name: "ssa-erp-source-list",
      version: 1,
      partialize: (state) => ({ items: state.items })
    }
  )
);
export {
  getActiveSourcesByVendor as g,
  useSourceListStore as u
};
