import { a as create, p as persist } from "./vendor-46QZWBd3.js";
import { l as backendStorage } from "./index-CcOZBoQL.js";
import { u as useBOMStore } from "./bomStore-VWzRK_BU.js";
const STORE_KEY = "ssa-erp-prod-versions";
const seedVersions = [
  {
    id: "pv-001",
    version: "V1.0",
    materialId: "mat-001",
    materialCode: "PRD-FRAME-001",
    materialName: "重型钢结构焊接架 H1200",
    bomId: "bom-001",
    bomNo: "BOM-2024-001",
    routeId: "route-001",
    routeNo: "R-2024-001",
    status: "active",
    effectiveDate: "2026-01-01",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: "2026-01-01T08:00:00.000Z"
  }
];
const seedECNs = [
  {
    id: "ecn-001",
    changeNo: "ECN-2026-001",
    title: "焊接架结构加强",
    reason: "客户反馈承重不足，增加加强筋工序",
    materialId: "mat-001",
    materialCode: "PRD-FRAME-001",
    materialName: "重型钢结构焊接架 H1200",
    bomId: "bom-001",
    bomNo: "BOM-2024-001",
    oldVersion: "V2.0",
    newVersion: "V2.1",
    effectiveDate: "2026-08-01",
    status: "draft",
    createdAt: "2026-07-10T08:00:00.000Z",
    updatedAt: "2026-07-10T08:00:00.000Z"
  }
];
const useProductionVersionStore = create()(
  persist(
    (set, get) => ({
      versions: seedVersions.map((v) => ({ ...v })),
      ecns: seedECNs.map((e) => ({ ...e })),
      addVersion: (v) => set((s) => ({ versions: [...s.versions, v] })),
      updateVersion: (id, patch) => set((s) => ({ versions: s.versions.map((v) => v.id === id ? { ...v, ...patch } : v) })),
      deleteVersion: (id) => set((s) => ({ versions: s.versions.filter((v) => v.id !== id) })),
      addECN: (e) => set((s) => ({ ecns: [...s.ecns, e] })),
      updateECN: (id, patch) => set((s) => ({ ecns: s.ecns.map((e) => e.id === id ? { ...e, ...patch } : e) })),
      deleteECN: (id) => set((s) => ({ ecns: s.ecns.filter((e) => e.id !== id) })),
      releaseECN: (id) => {
        const ecn = get().ecns.find((e) => e.id === id);
        if (!ecn) return;
        useBOMStore.getState().updateBOM(ecn.bomId, {
          version: ecn.newVersion,
          status: "released",
          effectiveDate: ecn.effectiveDate
        });
        set((s) => ({
          ecns: s.ecns.map(
            (e) => e.id === id ? { ...e, status: "released", releasedAt: (/* @__PURE__ */ new Date()).toISOString() } : e
          )
        }));
      }
    }),
    {
      storage: backendStorage,
      name: STORE_KEY,
      version: 1,
      partialize: (state) => ({ versions: state.versions, ecns: state.ecns })
    }
  )
);
export {
  useProductionVersionStore as u
};
